import { test } from "node:test";
import assert from "node:assert/strict";
import {
  handleDemoReset, handleGetChallenge, handleGetRecords, handleRecordDirectAnswer, handleSaveRetrieval,
  handleSubmitChallenge, handleUpdateSubmission, type StudentDb,
} from "../src/lib/server/student-api.ts";
import type { ChallengePublic } from "../src/types/challenge.ts";
import type { ChallengeAnswerKey, ErrorCardRecord, SubmissionRecord } from "../src/lib/db/types.ts";
import type { ClaimAnswer, DirectAnswerAttempt } from "../src/types/student-records.ts";
import type { Session } from "../src/types/session.ts";

const SECRET = "test-secret-not-real";
const sessionOf = (userId: string, role: Session["role"] = "student"): Session =>
  ({ role, userId, name: "가상 학생", memberNo: "26011225", signedInAt: "2026-10-03T00:00:00Z" });
/** 로그인한 학생 s1 (쿠키 확인을 대신함) */
const asS1 = async () => sessionOf("s1");
const env = { NODE_ENV: "test", ANTHROPIC_API_KEY: SECRET, ANTHROPIC_MODEL: "claude-test" };

const challenge: ChallengePublic = {
  id: "ch1", courseId: "phil", conceptId: "idea", conceptName: "이데아론", title: "이데아론",
  question: "플라톤의 이데아론과 현실 세계의 관계를 설명해줘.", errorCount: 1,
  claims: [
    { id: "ch1-a", label: "A", text: "감각 세계는 우리가 감각으로 경험하는 세계다." },
    { id: "ch1-b", label: "B", text: "플라톤은 감각 세계를 진정한 실재, 이데아를 그 모방으로 보았다." },
    { id: "ch1-c", label: "C", text: "동굴의 비유는 인식의 단계와 실재에 대한 이해를 설명한다." },
  ],
  evidenceOptions: [
    { id: "ev-w3-p12", label: "3주차 강의자료 · p.12", topic: "동굴의 비유" },
    { id: "ev-w3-p10", label: "3주차 강의자료 · p.10", topic: "이데아론의 실재관" },
  ],
};
const key: ChallengeAnswerKey = {
  reasonKeywords: ["이데아", "실재", "모방", "감각", "동굴", "그림자", "인식"],
  claims: [
    { claimId: "ch1-a", isError: false, explanation: "맞는 주장이에요. 감각 세계는 경험하는 세계예요." },
    { claimId: "ch1-b", isError: true, errorCardId: "ec-idea-1", explanation: "실재와 모방의 관계가 뒤집혔어요." },
    { claimId: "ch1-c", isError: false, explanation: "맞는 주장이에요. 동굴의 비유는 인식의 단계예요." },
  ],
};
const card: ErrorCardRecord = {
  id: "ec-idea-1", courseId: "phil", conceptId: "idea", title: "이데아와 감각 세계",
  wrongClaim: "플라톤은 감각 세계를 진정한 실재, 이데아를 그 모방으로 보았다.",
  correctClaim: "이데아가 진정한 실재이고, 감각 세계는 그 불완전한 모방이다.",
  correctKeywords: ["이데아", "실재", "모방", "감각"], evidenceId: "ev-w3-p12", evidence: "동굴의 비유",
  errorType: "개념 반전", difficulty: "중", approvalStatus: "approved",
  approvedAt: null, createdAt: "2026-10-03T00:00:00Z", updatedAt: "2026-10-03T00:00:00Z",
};

// 설계안 예시 답안 (키워드 규칙 기준 7점)
const designAnswers: ClaimAnswer[] = [
  { claimId: "ch1-a", judgment: "correct", confidence: 90, reasoning: "감각 세계는 우리가 보고 만지며 경험하는 현상의 세계라서 맞다고 생각한다.", pastedChars: 0 },
  { claimId: "ch1-b", judgment: "wrong", confidence: 85, reasoning: "플라톤은 이데아를 진정한 실재로 봤다. 현실 세계를 본질로 두면 강의에서 배운 이데아와 모방의 관계가 뒤집힌다고 생각한다.",
    correction: "이데아가 진정한 실재이고, 감각 세계는 그 불완전한 모방이다.", evidenceId: "ev-w3-p12", pastedChars: 0 },
  { claimId: "ch1-c", judgment: "correct", confidence: 80, reasoning: "동굴 밖으로 나가며 그림자가 모방임을 아는 과정이 인식의 단계를 보여준다.", pastedChars: 0 },
];

class FakeDbError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.name = "DbError"; this.code = code; }
}

function fakeDb(options: { approved?: boolean } = {}) {
  const submissions: SubmissionRecord[] = [];
  const attempts: DirectAnswerAttempt[] = [];
  let resets = 0;
  const db: StudentDb = {
    getStudent: async (id) => (id === "s1" || id === "s2" ? { id, name: "가상 학생", memberNo: "26011225", major: null } : null),
    getPublicChallenge: async (id) => (id !== "ch1" ? { status: "not_found" } : options.approved === false ? { status: "not_approved" } : { status: "ok", challenge }),
    getChallengeForGrading: async (id) => (id !== "ch1" ? { status: "not_found" } : options.approved === false ? { status: "not_approved" } : { status: "ok", challenge, key, errorCards: [card] }),
    insertSubmission: async (s) => {
      const record: SubmissionRecord = { ...s, id: crypto.randomUUID(), schemaVersion: 1, professorScore: null,
        professorComment: "교수 메모", finalizedBy: null, finalizedAt: null, updatedAt: s.submittedAt };
      submissions.unshift(record);
      return record;
    },
    listSubmissions: async (f) => submissions.filter((s) => (!f.studentId || s.studentId === f.studentId) && (!f.challengeId || s.challengeId === f.challengeId)),
    updateAfterExplanation: async (id, studentId, text) => {
      const s = submissions.find((x) => x.id === id && x.studentId === studentId);
      if (!s) throw new FakeDbError("SUBMISSION_NOT_FOUND", "제출 기록을 찾을 수 없어요.");
      s.afterExplanation = text;
      return s;
    },
    getStudentRecords: async (studentId) => ({ studentId, conversations: [], directAnswerAttempts: attempts, submissions, retrievals: [] }),
    insertDirectAnswerAttempt: async (a) => { const r = { ...a, id: crypto.randomUUID() }; attempts.push(r); return r; },
    listDirectAnswerAttempts: async (f) => attempts.filter((a) => !f.studentId || a.studentId === f.studentId),
    resetDemo: async () => { resets += 1; submissions.length = 0; attempts.length = 0; },
  };
  return { db, submissions, attempts, resets: () => resets };
}

type ClaudeCall = { body: Record<string, unknown> };
function claudeReturning(output: unknown, calls: ClaudeCall[] = []): typeof fetch {
  return async (_url, init) => {
    calls.push({ body: JSON.parse(String(init?.body)) });
    return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(output) }] });
  };
}
const allTwos = {
  claims: challenge.claims.map((c) => ({ claimId: c.id, reasoningScore: 2, feedback: "좋아요." })),
  conceptTargets: [{ claimId: "ch1-b", conceptScore: 2, feedback: "핵심을 짚었어요." }],
  beforeSummary: "이데아와 감각 세계의 관계가 뒤집혔다고 봤어요.",
};
const unexpectedClaude: typeof fetch = async () => { throw new Error("Claude should not be called"); };

const get = (path: string) => new Request(`http://localhost${path}`);
const post = (path: string, body: unknown, method = "POST") => new Request(`http://localhost${path}`, {
  method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const submit = (answers: ClaimAnswer[], extra: Record<string, unknown> = {}) =>
  post("/api/student/challenges/ch1/submissions", { courseId: "phil", answers, directAnswerFlag: false, startedAt: "2026-10-03T00:00:00Z", ...extra });

test("GET challenge: blocked until approved, and never exposes answers", async () => {
  const pending = await handleGetChallenge(get("/api/student/challenges/ch1"), "ch1", { db: fakeDb({ approved: false }).db, env, authenticate: asS1 });
  assert.equal(pending.status, 409);
  assert.equal((await pending.json()).error.code, "CHALLENGE_NOT_APPROVED");

  const ok = await handleGetChallenge(get("/api/student/challenges/ch1"), "ch1", { db: fakeDb().db, env, authenticate: asS1 });
  assert.equal(ok.status, 200);
  const text = await ok.text();
  for (const leak of ["isError", "explanation", "errorCard", "correctClaim", "ec-idea-1", "reasonKeywords"]) assert.ok(!text.includes(leak), leak);
  assert.equal(JSON.parse(text).challenge.errorCount, 1);

  assert.equal((await handleGetChallenge(get("/api/student/challenges/ch9"), "ch9", { db: fakeDb().db, env, authenticate: asS1 })).status, 404);
  // 학생은 로그인 세션(app_user_id)으로만 식별한다: 쿼리의 userId는 무시
  const getAs = (authenticate: () => Promise<Session | null>) =>
    handleGetChallenge(get("/api/student/challenges/ch1?userId=s2"), "ch1", { db: fakeDb().db, env, authenticate });
  assert.equal((await getAs(async () => null)).status, 401);
  assert.equal((await getAs(async () => sessionOf("p1", "professor"))).status, 403);
  const unknown = await getAs(async () => sessionOf("nobody"));
  assert.equal(unknown.status, 404);
  assert.equal((await unknown.json()).error.code, "STUDENT_NOT_FOUND");
});

test("submit: Claude grades reasoning and concept, rules handle judgment, false alarms and evidence", async () => {
  const { db, submissions } = fakeDb();
  const calls: ClaudeCall[] = [];
  // A를 '틀리다'로 판정한 오탐: Claude가 2점을 줘도 규칙상 0점
  const answers = designAnswers.map((a) => (a.claimId === "ch1-a" ? { ...a, judgment: "wrong" as const, correction: "감각 세계는 실재다", evidenceId: "ev-w3-p10" } : a));
  const res = await handleSubmitChallenge(submit(answers), "ch1", { db, env, fetcher: claudeReturning(allTwos, calls), authenticate: asS1 });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.grading.method, "claude");
  assert.equal(body.submission.grader, "server");
  assert.equal(body.submission.gradingMethod, "claude");
  assert.deepEqual(body.submission.score, { judgment: 0, reasoning: 1, concept: 2, evidence: 2, penalty: 0, total: 5 });
  assert.equal(body.submission.falseAlarms, 1);
  const a = body.submission.claimGrades.find((g: { claimId: string }) => g.claimId === "ch1-a");
  assert.equal(a.reasoningScore, 0);
  assert.equal(a.scoredBy, "rule");
  assert.equal(body.submission.errorReveals[0].correctClaim, card.correctClaim);
  assert.equal(body.submission.errorReveals[0].evidenceLabel, "3주차 강의자료 · p.12");
  assert.equal(body.submission.beforeSummary, allTwos.beforeSummary);
  assert.equal(body.submission.professorComment, undefined);
  assert.equal(submissions.length, 1);

  // 요청 형태: JSON 스키마 강제, temperature 없음, 학생 글은 시스템 지시가 아니라 사용자 메시지 JSON에만
  const sent = calls[0].body as { model: string; system: string; temperature?: unknown; output_config: { format: { type: string } }; messages: { content: string }[] };
  assert.equal(sent.model, "claude-test");
  assert.equal(sent.output_config.format.type, "json_schema");
  assert.equal(sent.temperature, undefined);
  assert.ok(!sent.system.includes("현실 세계를 본질로"));
  assert.ok(sent.messages[0].content.includes("현실 세계를 본질로"));
  assert.ok(!JSON.stringify(body).includes(SECRET));
});

test("submit: falls back to keyword scoring on timeout, invalid output, or missing config", async () => {
  // 응답하지 않는 Claude. AbortSignal.timeout 타이머는 이벤트 루프를 붙잡지 않으므로 대기 중에는 루프를 유지한다
  const hanging: typeof fetch = (_url, init) => new Promise<Response>((_, reject) => {
    const keepAlive = setInterval(() => {}, 1_000);
    init?.signal?.addEventListener("abort", () => {
      clearInterval(keepAlive);
      reject(new DOMException("aborted", "AbortError"));
    });
  });
  const timeout = await (await handleSubmitChallenge(submit(designAnswers), "ch1", { db: fakeDb().db, env, fetcher: hanging, timeoutMs: 30, authenticate: asS1 })).json();
  assert.equal(timeout.grading.method, "keyword");
  assert.equal(timeout.grading.fallbackReason, "timeout");
  assert.equal(timeout.submission.gradingMethod, "keyword");
  assert.equal(timeout.submission.score.total, 7);
  assert.ok(timeout.submission.claimGrades.every((g: { scoredBy: string }) => g.scoredBy === "keyword"));

  const missingClaim = { ...allTwos, claims: allTwos.claims.slice(1) };
  const invalid = await (await handleSubmitChallenge(submit(designAnswers), "ch1", { db: fakeDb().db, env, fetcher: claudeReturning(missingClaim), authenticate: asS1 })).json();
  assert.equal(invalid.grading.fallbackReason, "invalid_output");
  const outOfRange = { ...allTwos, conceptTargets: [{ claimId: "ch1-b", conceptScore: 3, feedback: "x" }] };
  assert.equal((await (await handleSubmitChallenge(submit(designAnswers), "ch1", { db: fakeDb().db, env, fetcher: claudeReturning(outOfRange), authenticate: asS1 })).json()).grading.fallbackReason, "invalid_output");

  const refusal: typeof fetch = async () => Response.json({ stop_reason: "refusal", content: [] });
  assert.equal((await (await handleSubmitChallenge(submit(designAnswers), "ch1", { db: fakeDb().db, env, fetcher: refusal, authenticate: asS1 })).json()).grading.fallbackReason, "refusal");

  const noKey = await (await handleSubmitChallenge(submit(designAnswers), "ch1", { db: fakeDb().db, env: { NODE_ENV: "test" }, fetcher: unexpectedClaude, authenticate: asS1 })).json();
  assert.equal(noKey.grading.fallbackReason, "not_configured");
  assert.equal(noKey.submission.score.total, 7);
});

test("submit: rejects incomplete or mismatched answers without calling Claude or saving", async () => {
  const { db, submissions } = fakeDb();
  const deps = { db, env, fetcher: unexpectedClaude, authenticate: asS1 };
  const tooShort = designAnswers.map((a) => ({ ...a, reasoning: "몰라" }));
  assert.equal((await handleSubmitChallenge(submit(tooShort), "ch1", deps)).status, 400);
  const noCorrection = designAnswers.map((a) => (a.claimId === "ch1-b" ? { ...a, correction: undefined } : a));
  assert.equal((await (await handleSubmitChallenge(submit(noCorrection), "ch1", deps)).json()).error.code, "INCOMPLETE_SUBMISSION");
  assert.equal((await handleSubmitChallenge(submit(designAnswers.slice(0, 2)), "ch1", deps)).status, 400);
  assert.equal((await handleSubmitChallenge(submit([designAnswers[0], designAnswers[0], designAnswers[2]]), "ch1", deps)).status, 400);
  const badEvidence = designAnswers.map((a) => (a.claimId === "ch1-b" ? { ...a, evidenceId: "ev-unknown" } : a));
  assert.equal((await handleSubmitChallenge(submit(badEvidence), "ch1", deps)).status, 400);
  assert.equal((await handleSubmitChallenge(submit(designAnswers, { courseId: "math" }), "ch1", deps)).status, 400);
  assert.equal((await handleSubmitChallenge(submit(designAnswers.map((a) => ({ ...a, confidence: 101 }))), "ch1", deps)).status, 400);
  assert.equal((await handleSubmitChallenge(submit(designAnswers), "ch1", { ...deps, db: fakeDb({ approved: false }).db })).status, 409);
  assert.equal(submissions.length, 0);
});

test("direct answer attempts are re-detected on the server and drive the process penalty", async () => {
  const { db, attempts } = fakeDb();
  const record = (text: string) => handleRecordDirectAnswer(post("/api/student/direct-answer-attempts",
    { courseId: "phil", conversationId: "conv-1", text, matched: "조작된 값", at: "2026-10-03T00:00:00Z" }), { db, env, authenticate: asS1 });
  assert.equal((await record("이데아론을 쉽게 설명해줘")).status, 400);
  const saved = await record("정답 번호만 해설 없이 알려줘");
  assert.equal(saved.status, 201);
  assert.equal(attempts[0].matched, "정답 번호");

  // 학생 화면이 directAnswerFlag를 false로 보내도 서버 기록으로 판단. 이유를 붙여넣기로만 채우면 -2
  const pasted = designAnswers.map((a) => ({ ...a, pastedChars: a.reasoning.length }));
  const body = await (await handleSubmitChallenge(submit(pasted), "ch1", { db, env, fetcher: claudeReturning(allTwos), authenticate: asS1 })).json();
  assert.equal(body.submission.directAnswerFlag, true);
  assert.equal(body.submission.score.penalty, -2);
  assert.equal(body.submission.score.total, 5);
  // 다음 제출에서는 이전 제출 뒤의 시도만 센다
  const next = await (await handleSubmitChallenge(submit(pasted), "ch1", { db, env, fetcher: claudeReturning(allTwos), authenticate: asS1 })).json();
  assert.equal(next.submission.directAnswerFlag, false);
});

test("after-explanation updates only the student's own submission; records hide professor fields", async () => {
  const { db } = fakeDb();
  const created = await (await handleSubmitChallenge(submit(designAnswers), "ch1", { db, env, fetcher: claudeReturning(allTwos), authenticate: asS1 })).json();
  const id = created.submission.id;
  // userId를 본문에 넣어도 무시하고, 로그인한 계정 기준으로만 수정한다
  const patch = (userId: string, afterExplanation: unknown) =>
    handleUpdateSubmission(post(`/api/student/submissions/${id}`, { userId: "s1", afterExplanation }, "PATCH"), id, { db, env, authenticate: async () => sessionOf(userId) });
  assert.equal((await patch("s2", "이데아가 진짜 실재다.")).status, 404);
  assert.equal((await patch("s1", "   ")).status, 400);
  const ok = await patch("s1", "이데아는 변하지 않는 본질, 현실은 모방이다.");
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).submission.afterExplanation, "이데아는 변하지 않는 본질, 현실은 모방이다.");
  assert.equal((await handleUpdateSubmission(post("/api/student/submissions/not-a-uuid", { afterExplanation: "x" }, "PATCH"), "not-a-uuid", { db, env, authenticate: asS1 })).status, 404);

  const records = await (await handleGetRecords(get("/api/student/records"), { db, env, authenticate: asS1 })).json();
  assert.equal(records.records.submissions.length, 1);
  assert.equal(records.records.submissions[0].professorComment, undefined);
  assert.equal(records.records.conversations.length, 0);
});

test("retrieval is a 501 placeholder, demo reset calls resetDemo, production stays closed", async () => {
  const fake = fakeDb();
  assert.equal((await handleSaveRetrieval(post("/api/student/retrievals", {}), { db: fake.db, env, authenticate: asS1 })).status, 501);
  const reset = await handleDemoReset(post("/api/student/demo-reset", {}), { db: fake.db, env, authenticate: asS1 });
  assert.equal(reset.status, 200);
  assert.equal(fake.resets(), 1);
  assert.equal((await handleDemoReset(post("/api/student/demo-reset", {}), { db: fake.db, env, authenticate: async () => null })).status, 401);

  const prod = { ...env, NODE_ENV: "production" };
  const closed = await handleGetChallenge(get("/api/student/challenges/ch1"), "ch1", { db: fake.db, env: prod, authenticate: asS1 });
  assert.equal(closed.status, 503);
  assert.equal((await closed.json()).error.code, "STUDENT_API_DISABLED");
  const open = await handleGetChallenge(get("/api/student/challenges/ch1"), "ch1", { db: fake.db, env: { ...prod, STUDENT_API_ENABLED: "true" }, authenticate: asS1 });
  assert.equal(open.status, 200);
});

test("request validation: content type, size, and JSON errors", async () => {
  const { db } = fakeDb();
  const text = new Request("http://localhost/api/student/direct-answer-attempts", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" });
  assert.equal((await handleRecordDirectAnswer(text, { db, env, authenticate: asS1 })).status, 415);
  const big = post("/api/student/challenges/ch1/submissions", { pad: "x".repeat(40_000) });
  assert.equal((await handleSubmitChallenge(big, "ch1", { db, env, authenticate: asS1 })).status, 413);
  const broken = new Request("http://localhost/api/student/direct-answer-attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal((await handleRecordDirectAnswer(broken, { db, env, authenticate: asS1 })).status, 400);
});

test("identity comes only from the login session; userId in the body is ignored", async () => {
  const { db, submissions } = fakeDb();
  const spoofed = await handleSubmitChallenge(submit(designAnswers, { userId: "s2" }), "ch1", { db, env, authenticate: asS1, fetcher: claudeReturning(allTwos) });
  assert.equal(spoofed.status, 201);
  assert.equal(submissions[0].studentId, "s1");
  const asS2 = async () => sessionOf("s2");
  const records = await (await handleGetRecords(get("/api/student/records?userId=s1"), { db, env, authenticate: asS2 })).json();
  assert.equal(records.records.studentId, "s2");
  assert.equal((await handleSubmitChallenge(submit(designAnswers), "ch1", { db, env, authenticate: async () => null, fetcher: unexpectedClaude })).status, 401);
});
