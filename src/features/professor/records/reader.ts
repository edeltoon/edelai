// PR #6의 저장 키 계약을 읽는 임시 어댑터. 학생 코드 및 미제출 drafts는 읽지 않는다.
// 서버 저장소가 정해지면 loadRecords 구현을 조회 API로 교체한다.
import type { ClaimAnswer, ScoreBreakdown } from '../../../types/student-records.ts';

export type ReviewScore = Omit<ScoreBreakdown, 'reasoning' | 'concept'> & { reasoning: number | null; concept: number | null };
export type SubmissionView = {
  id: string; challengeId: string; submittedAt: string; score: ReviewScore;
  calibration: number; answers: ClaimAnswer[]; beforeSummary: string; afterExplanation?: string;
  claimResults?: { claimId: string; judgmentCorrect: boolean }[];
  grader: 'mock' | 'server' | 'unknown';
};
export type ConversationView = { id: string; title: string; messages: { id: string; role: 'user' | 'ai' | 'notice'; text: string }[] };
export type StudentView = { id: string; submissions: SubmissionView[]; conversations: ConversationView[] };
export type RecordsSnapshot = { students: StudentView[]; warnings: string[] };
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string';
const number = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
function score(v: unknown): v is ReviewScore {
  return obj(v) && number(v.judgment, 0, 1) && (v.reasoning === null || number(v.reasoning, 0, 2)) && (v.concept === null || number(v.concept, 0, 2))
    && number(v.evidence, 0, 2) && (v.penalty === 0 || v.penalty === -2) && number(v.total, 0, 7);
}
function answer(v: unknown): v is ClaimAnswer {
  return obj(v) && str(v.claimId) && (v.judgment === 'correct' || v.judgment === 'wrong')
    && number(v.confidence, 0, 100) && str(v.reasoning) && (v.correction === undefined || str(v.correction))
    && (v.evidenceId === undefined || str(v.evidenceId)) && number(v.pastedChars, 0, Number.MAX_SAFE_INTEGER);
}

export function loadRecords(storage: Pick<Storage, 'getItem'>): RecordsSnapshot {
  const warnings: string[] = [];
  function read(key: string): unknown[] {
    try {
      const raw = storage.getItem(key);
      if (raw === null) return [];
      const data: unknown = JSON.parse(raw);
      if (!Array.isArray(data)) throw new Error('Invalid list');
      return data;
    } catch { warnings.push(`${key}: 저장된 기록을 읽을 수 없습니다.`); return []; }
  }
  const index = read('edeltoon:student-index');
  const ids = [...new Set(index.filter((id): id is string => str(id) && /^[a-zA-Z0-9_-]{1,100}$/.test(id)))];
  if (ids.length !== index.length) warnings.push('학생 목록의 중복 또는 잘못된 ID를 제외했습니다.');
  const students = ids.map(id => {
    const submissions: SubmissionView[] = [];
    for (const item of read(`edeltoon:student:${id}:submissions`)) {
      if (obj(item) && item.courseId !== 'phil') continue;
      if (!obj(item) || item.studentId !== id || item.schemaVersion !== 1 || !str(item.id) || !str(item.challengeId)
        || !str(item.submittedAt) || !Number.isFinite(Date.parse(item.submittedAt)) || !score(item.score)
        || !number(item.calibration, 0, 100) || !Array.isArray(item.answers) || !item.answers.every(answer)
        || !str(item.beforeSummary) || (item.afterExplanation !== undefined && !str(item.afterExplanation))) {
        warnings.push(`${id}: 형식이 맞지 않는 제출 기록을 제외했습니다.`); continue;
      }
      let claimResults: SubmissionView['claimResults'];
      if (item.claimGrades !== undefined) {
        if (Array.isArray(item.claimGrades) && item.claimGrades.every(g => obj(g) && str(g.claimId) && typeof g.judgmentCorrect === 'boolean')
          && new Set(item.claimGrades.map(g => g.claimId)).size === item.claimGrades.length) {
          claimResults = item.claimGrades.map(g => ({ claimId: g.claimId, judgmentCorrect: g.judgmentCorrect }));
        } else warnings.push(`${id}: 정오답 기록 형식이 맞지 않아 오답 집계에서 제외했습니다.`);
      }
      submissions.push({ claimResults, id: item.id, challengeId: item.challengeId, submittedAt: item.submittedAt,
        score: item.score, calibration: item.calibration, answers: item.answers, beforeSummary: item.beforeSummary,
        afterExplanation: item.afterExplanation as string | undefined,
        grader: item.grader === 'mock' || item.grader === 'server' ? item.grader : 'unknown' });
    }
    const conversations: ConversationView[] = [];
    for (const item of read(`edeltoon:student:${id}:conversations`)) {
      if (obj(item) && item.courseId !== 'phil') continue;
      if (!obj(item) || item.studentId !== id || !str(item.id) || !str(item.title) || !Array.isArray(item.messages)
        || !item.messages.every(m => obj(m) && str(m.id) && str(m.text) && ['user', 'ai', 'notice'].includes(String(m.role)))) {
        warnings.push(`${id}: 형식이 맞지 않는 대화를 제외했습니다.`); continue;
      }
      conversations.push({ id: item.id, title: item.title, messages: item.messages as ConversationView['messages'] });
    }
    return { id, submissions: submissions.sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)), conversations };
  }).filter(student => student.submissions.length || student.conversations.length);
  return { students, warnings: [...new Set(warnings)] };
}
