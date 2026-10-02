/** DB 계약이 아닌 교수 화면의 검토 입력. 실제 확정 시 서버에서 재검증해야 한다. */
export type EvaluationDraft = { score: number; reason: string; feedback: string };
export function validateDraft(input: { score: string; reason: string; feedback: string; reviewed: boolean }, originalScore: number):
  { ok: true; draft: EvaluationDraft } | { ok: false; message: string } {
  const score = Number(input.score);
  if (!input.score.trim() || !Number.isFinite(score) || score < 0 || score > 7 || !Number.isInteger(score * 10)) return { ok: false, message: '검토 점수는 0~7점, 소수 첫째 자리까지 입력해 주세요.' };
  const reason = input.reason.trim(), feedback = input.feedback.trim();
  if (reason.length > 1000 || feedback.length > 2000) return { ok: false, message: '수정 사유는 1,000자, 피드백은 2,000자까지 입력할 수 있어요.' };
  if (score !== originalScore && !reason) return { ok: false, message: '점수를 변경한 이유를 입력해 주세요.' };
  if (!feedback) return { ok: false, message: '학생에게 전달할 피드백 초안을 입력해 주세요.' };
  if (!input.reviewed) return { ok: false, message: '학생 제출 원문과 점수 근거를 확인해 주세요.' };
  return { ok: true, draft: { score, reason, feedback } };
}

/** 대기 항목만 보완하고 기존 규칙 점수를 보존한다. */
export function completePending(parts: { judgment: number; reasoning: number | null; concept: number | null; evidence: number; penalty: number }, input: { reasoning: string; concept: string }) {
  const filled = { ...parts };
  for (const key of ['reasoning', 'concept'] as const) {
    if (parts[key] !== null) continue;
    const n = Number(input[key]);
    if (!input[key].trim() || !Number.isInteger(n) || n < 0 || n > 2) return null;
    filled[key] = n;
  }
  return { ...filled, total: Math.min(7, Math.max(0, filled.judgment + (filled.reasoning ?? 0) + (filled.concept ?? 0) + filled.evidence + filled.penalty)) };
}
