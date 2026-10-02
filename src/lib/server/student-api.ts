import 'server-only';
import type { ChallengeSubmission, ClaimAnswer, DirectAnswerAttempt, StudentRecords } from '../../types/student-records.ts';
import type { GradingChallengeResult, PublicChallengeResult } from '../db/challenges.ts';
import type { Student, SubmissionRecord } from '../db/types.ts';
import { buildGradedSubmission, type GradingClaim } from '../challengeGrading.ts';
import { inputProgress } from '../challengeInput.ts';
import { detectDirectAnswer, hasDirectAnswerSince } from '../directAnswer.ts';
import { gradeItemsWithClaude } from './grade-challenge.ts';

// 학생 API(/api/student/*) 처리 로직. 계약: src/features/student/services/store.types.ts "서버 API 계약", docs/STUDENT_RECORDS.md
// - DB는 src/lib/db 함수만 쓴다. 라우트가 실제 함수를 넣고, 테스트는 가짜 DB를 넣는다(StudentDb).
// - 오류 형식은 /api/chat과 같다: HTTP 상태 + { ok: false, error: { code, message } }
// - 인증이 아직 없어 학생은 userId로 식별한다. 운영(production)에서는 STUDENT_API_ENABLED=true일 때만 연다.

/** 학생 API가 쓰는 DB 함수 (src/lib/db의 같은 이름 함수) */
export interface StudentDb {
  getStudent(id: string): Promise<Student | null>;
  getPublicChallenge(challengeId: string): Promise<PublicChallengeResult>;
  getChallengeForGrading(challengeId: string): Promise<GradingChallengeResult>;
  insertSubmission(submission: Omit<ChallengeSubmission, 'id' | 'schemaVersion'>): Promise<SubmissionRecord>;
  listSubmissions(filter: { studentId?: string; courseId?: string; challengeId?: string }): Promise<SubmissionRecord[]>;
  updateAfterExplanation(id: string, studentId: string, afterExplanation: string): Promise<SubmissionRecord>;
  getStudentRecords(studentId: string): Promise<StudentRecords>;
  insertDirectAnswerAttempt(attempt: Omit<DirectAnswerAttempt, 'id'>): Promise<DirectAnswerAttempt>;
  listDirectAnswerAttempts(filter: { studentId?: string; courseId?: string }): Promise<DirectAnswerAttempt[]>;
  resetDemo(studentId: string): Promise<void>;
}

export interface StudentApiDeps {
  db: StudentDb;
  env?: Record<string, string | undefined>;
  /** Claude 호출용 (테스트에서 대체) */
  fetcher?: typeof fetch;
  /** Claude 채점 시간 제한 (ms) */
  timeoutMs?: number;
}

const MAX_BODY_BYTES = 32_768;
const MAX_TEXT = 1_000;
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ───────────── 공통 응답·검증 ───────────── */

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function fail(status: number, code: string, message: string) {
  return json({ ok: false, error: { code, message } }, status);
}

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function closedResponse(env: Record<string, string | undefined>) {
  if (env.NODE_ENV === 'production' && env.STUDENT_API_ENABLED !== 'true') {
    return fail(503, 'STUDENT_API_DISABLED', '현재 환경에서는 학생 API가 활성화되지 않았어요.');
  }
  return null;
}

async function readJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return { ok: false, response: fail(415, 'INVALID_CONTENT_TYPE', 'JSON 형식으로 보내 주세요.') };
  }
  if (!request.body) return { ok: false, response: fail(400, 'INVALID_JSON', '요청 형식을 확인해 주세요.') };
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, response: fail(413, 'REQUEST_TOO_LARGE', '보낸 내용이 너무 커요.') };
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: fail(400, 'INVALID_JSON', '요청 형식을 확인해 주세요.') };
  }
}

function isDbError(e: unknown): e is { name: 'DbError'; code: string; message: string } {
  return e instanceof Error && e.name === 'DbError' && typeof (e as { code?: unknown }).code === 'string';
}

/** DB·예상 밖 오류 → 응답. DB 원문·비밀 값은 내보내지 않는다 */
function errorResponse(e: unknown) {
  if (isDbError(e)) {
    if (e.code === 'DB_NOT_CONFIGURED' || e.code === 'DB_WRONG_KEY') return fail(503, e.code, e.message);
    if (e.code.endsWith('_NOT_FOUND')) return fail(404, e.code, e.message);
    return fail(500, e.code, e.message);
  }
  return fail(500, 'INTERNAL_ERROR', '서버에서 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
}

async function guarded(deps: StudentApiDeps, run: (env: Record<string, string | undefined>) => Promise<Response>) {
  const env = deps.env ?? process.env;
  const closed = closedResponse(env);
  if (closed) return closed;
  try {
    return await run(env);
  } catch (e) {
    return errorResponse(e);
  }
}

async function requireStudent(db: StudentDb, userId: unknown): Promise<Student | Response> {
  if (typeof userId !== 'string' || !ID_PATTERN.test(userId)) {
    return fail(400, 'INVALID_USER', '학생 정보(userId)를 확인해 주세요.');
  }
  const student = await db.getStudent(userId);
  return student ?? fail(404, 'STUDENT_NOT_FOUND', '학생 정보를 찾을 수 없어요.');
}

const NOT_FOUND = () => fail(404, 'CHALLENGE_NOT_FOUND', '챌린지를 찾을 수 없어요.');
const NOT_APPROVED = () =>
  fail(409, 'CHALLENGE_NOT_APPROVED', '교수님이 아직 챌린지를 열지 않았어요. 승인되면 풀 수 있어요.');

/** 학생에게 돌려줄 제출 기록 (교수 조정·확정 필드 제외) */
function toStudentSubmission(record: SubmissionRecord): ChallengeSubmission {
  const { professorScore, professorComment, finalizedBy, finalizedAt, updatedAt, ...submission } = record;
  void professorScore;
  void professorComment;
  void finalizedBy;
  void finalizedAt;
  void updatedAt;
  return submission;
}

/* ───────────── 1. GET /api/student/challenges/{challengeId}?userId= ───────────── */

export function handleGetChallenge(request: Request, challengeId: string, deps: StudentApiDeps) {
  return guarded(deps, async () => {
    const student = await requireStudent(deps.db, new URL(request.url).searchParams.get('userId'));
    if (student instanceof Response) return student;
    if (!ID_PATTERN.test(challengeId)) return NOT_FOUND();
    const result = await deps.db.getPublicChallenge(challengeId);
    if (result.status === 'not_found') return NOT_FOUND();
    if (result.status === 'not_approved') return NOT_APPROVED();
    return json({ ok: true, challenge: result.challenge });
  });
}

/* ───────────── 2. POST /api/student/challenges/{challengeId}/submissions ───────────── */

function parseAnswer(value: unknown): ClaimAnswer | null {
  if (!object(value)) return null;
  const { claimId, judgment, confidence, reasoning, correction, evidenceId, pastedChars } = value;
  if (typeof claimId !== 'string' || !ID_PATTERN.test(claimId)) return null;
  if (judgment !== 'correct' && judgment !== 'wrong') return null;
  if (typeof confidence !== 'number' || !Number.isInteger(confidence) || confidence < 0 || confidence > 100) return null;
  if (typeof reasoning !== 'string' || reasoning.length > MAX_TEXT) return null;
  if (correction !== undefined && (typeof correction !== 'string' || correction.length > MAX_TEXT)) return null;
  if (evidenceId !== undefined && (typeof evidenceId !== 'string' || !ID_PATTERN.test(evidenceId))) return null;
  if (typeof pastedChars !== 'number' || !Number.isInteger(pastedChars) || pastedChars < 0 || pastedChars > 100_000) return null;
  return {
    claimId,
    judgment,
    confidence,
    reasoning,
    ...(correction !== undefined ? { correction } : {}),
    ...(evidenceId !== undefined ? { evidenceId } : {}),
    pastedChars,
  };
}

export function handleSubmitChallenge(request: Request, challengeId: string, deps: StudentApiDeps) {
  return guarded(deps, async (env) => {
    const body = await readJson(request);
    if (!body.ok) return body.response;
    const input = body.value;
    if (!object(input) || !Array.isArray(input.answers) || input.answers.length > 20 || typeof input.directAnswerFlag !== 'boolean') {
      return fail(400, 'INVALID_INPUT', '제출 형식을 확인해 주세요.');
    }
    const student = await requireStudent(deps.db, input.userId);
    if (student instanceof Response) return student;
    if (!ID_PATTERN.test(challengeId)) return NOT_FOUND();

    const answers = input.answers.map(parseAnswer);
    if (answers.some((a) => a === null)) return fail(400, 'INVALID_INPUT', '주장별 판정·확신도·이유 형식을 확인해 주세요.');

    const grading = await deps.db.getChallengeForGrading(challengeId);
    if (grading.status === 'not_found') return NOT_FOUND();
    if (grading.status === 'not_approved') return NOT_APPROVED();
    const { challenge, key, errorCards } = grading;
    if (input.courseId !== challenge.courseId) return fail(400, 'INVALID_INPUT', '과목 정보가 챌린지와 맞지 않아요.');

    // 모든 주장에 정확히 하나씩, 챌린지 주장 순서대로
    const valid = answers as ClaimAnswer[];
    const ordered = challenge.claims.map((c) => valid.find((a) => a.claimId === c.id));
    const evidenceIds = new Set(challenge.evidenceOptions.map((o) => o.id));
    if (valid.length !== challenge.claims.length || ordered.some((a) => !a) || new Set(valid.map((a) => a.claimId)).size !== valid.length) {
      return fail(400, 'INVALID_INPUT', '챌린지의 모든 주장에 한 번씩 답해 주세요.');
    }
    if (valid.some((a) => a.evidenceId !== undefined && !evidenceIds.has(a.evidenceId))) {
      return fail(400, 'INVALID_INPUT', '근거는 챌린지의 근거 목록에서 골라 주세요.');
    }
    const orderedAnswers = ordered as ClaimAnswer[];
    if (!inputProgress(orderedAnswers).complete) {
      return fail(400, 'INCOMPLETE_SUBMISSION', '모든 주장에 판정·확신도·본인 생각을 채워 주세요.');
    }

    // 정답 키 → 채점 기준 (서버에서만 사용)
    const claims: (GradingClaim & { label: string; text: string })[] = [];
    for (const c of challenge.claims) {
      const k = key.claims.find((kc) => kc.claimId === c.id);
      const card = k?.isError ? errorCards.find((ec) => ec.id === k.errorCardId) : undefined;
      if (!k || (k.isError && !card)) return fail(500, 'CHALLENGE_KEY_MISMATCH', '채점 기준을 찾을 수 없어요.');
      claims.push({
        claimId: c.id,
        label: c.label,
        text: c.text,
        isError: k.isError,
        explanation: k.explanation,
        errorCard: card
          ? {
              errorType: card.errorType,
              correctClaim: card.correctClaim,
              correctKeywords: card.correctKeywords,
              evidenceId: card.evidenceId,
              evidenceLabel: challenge.evidenceOptions.find((o) => o.id === card.evidenceId)?.label ?? '강의자료',
            }
          : undefined,
      });
    }

    // 정답 직행 태그: 학생 화면이 보낸 값 또는 서버 기록(직전 제출 이후 같은 과목의 시도)
    const [attempts, previous] = await Promise.all([
      deps.db.listDirectAnswerAttempts({ studentId: student.id }),
      deps.db.listSubmissions({ studentId: student.id, challengeId }),
    ]);
    const directAnswerFlag =
      input.directAnswerFlag || hasDirectAnswerSince(attempts, challenge.courseId, previous[0]?.submittedAt ?? null);

    const ai = await gradeItemsWithClaude(
      { conceptName: challenge.conceptName, question: challenge.question, claims, answers: orderedAnswers, reasonKeywords: key.reasonKeywords },
      { env, fetcher: deps.fetcher, timeoutMs: deps.timeoutMs },
    );
    const graded = buildGradedSubmission({
      studentId: student.id,
      courseId: challenge.courseId,
      challengeId: challenge.id,
      conceptId: challenge.conceptId,
      grader: 'server',
      claims,
      answers: orderedAnswers,
      items: ai.items,
      directAnswerFlag,
      submittedAt: new Date().toISOString(),
    });
    const saved = await deps.db.insertSubmission(graded);
    return json(
      {
        ok: true,
        submission: { ...toStudentSubmission(saved), gradingMethod: graded.gradingMethod },
        grading: {
          method: ai.items.method,
          ...(ai.fallbackReason ? { fallbackReason: ai.fallbackReason } : {}),
          ...(ai.model ? { model: ai.model } : {}),
        },
      },
      201,
    );
  });
}

/* ───────────── 3. PATCH /api/student/submissions/{submissionId} ───────────── */

export function handleUpdateSubmission(request: Request, submissionId: string, deps: StudentApiDeps) {
  return guarded(deps, async () => {
    const body = await readJson(request);
    if (!body.ok) return body.response;
    const input = body.value;
    if (!object(input)) return fail(400, 'INVALID_INPUT', '요청 형식을 확인해 주세요.');
    const student = await requireStudent(deps.db, input.userId);
    if (student instanceof Response) return student;
    const text = typeof input.afterExplanation === 'string' ? input.afterExplanation.trim() : '';
    if (!text || text.length > MAX_TEXT) return fail(400, 'INVALID_INPUT', '해설 후 내 설명을 1~1,000자로 적어 주세요.');
    if (!UUID_PATTERN.test(submissionId)) return fail(404, 'SUBMISSION_NOT_FOUND', '제출 기록을 찾을 수 없어요.');
    const saved = await deps.db.updateAfterExplanation(submissionId, student.id, text);
    return json({ ok: true, submission: toStudentSubmission(saved) });
  });
}

/* ───────────── 4. GET /api/student/records?userId= ───────────── */

export function handleGetRecords(request: Request, deps: StudentApiDeps) {
  return guarded(deps, async () => {
    const student = await requireStudent(deps.db, new URL(request.url).searchParams.get('userId'));
    if (student instanceof Response) return student;
    const records = await deps.db.getStudentRecords(student.id);
    return json({
      ok: true,
      records: { ...records, submissions: records.submissions.map((s) => toStudentSubmission(s as SubmissionRecord)) },
    });
  });
}

/* ───────────── 5. POST /api/student/direct-answer-attempts ───────────── */

export function handleRecordDirectAnswer(request: Request, deps: StudentApiDeps) {
  return guarded(deps, async () => {
    const body = await readJson(request);
    if (!body.ok) return body.response;
    const input = body.value;
    if (!object(input)) return fail(400, 'INVALID_INPUT', '요청 형식을 확인해 주세요.');
    const student = await requireStudent(deps.db, input.userId);
    if (student instanceof Response) return student;
    const { courseId, conversationId, text } = input;
    if (typeof courseId !== 'string' || !ID_PATTERN.test(courseId) || typeof conversationId !== 'string' ||
      !conversationId.trim() || conversationId.length > 100 || typeof text !== 'string' || !text.trim() || text.length > 4_000) {
      return fail(400, 'INVALID_INPUT', '정답 직행 시도 형식을 확인해 주세요.');
    }
    // 걸린 표현은 서버가 다시 판별한다 (화면이 보낸 matched는 믿지 않음)
    const match = detectDirectAnswer(text);
    if (!match.isDirect || !match.matched) return fail(400, 'NOT_DIRECT_ANSWER', '정답 직행 요청으로 판별되지 않았어요.');
    // 시각은 서버 기준 (화면이 보낸 at은 쓰지 않음: 과정 감점 판정이 시각 순서에 달려 있어서)
    const attempt = await deps.db.insertDirectAnswerAttempt({
      studentId: student.id,
      courseId,
      conversationId,
      text,
      matched: match.matched,
      at: new Date().toISOString(),
    });
    return json({ ok: true, attempt }, 201);
  });
}

/* ───────────── 6. POST /api/student/retrievals (자리만) ───────────── */

export function handleSaveRetrieval(_request: Request, deps: StudentApiDeps) {
  return guarded(deps, async () => fail(501, 'NOT_IMPLEMENTED', '재인출 퀴즈 저장은 아직 준비 중이에요.'));
}

/* ───────────── 7. POST /api/student/demo-reset ───────────── */

export function handleDemoReset(request: Request, deps: StudentApiDeps) {
  return guarded(deps, async () => {
    const body = await readJson(request);
    if (!body.ok) return body.response;
    const input = body.value;
    if (!object(input)) return fail(400, 'INVALID_INPUT', '요청 형식을 확인해 주세요.');
    const student = await requireStudent(deps.db, input.userId);
    if (student instanceof Response) return student;
    await deps.db.resetDemo(student.id);
    return json({ ok: true });
  });
}
