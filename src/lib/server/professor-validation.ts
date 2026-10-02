import type { ReviewCard } from '../../types/professor-cards.ts';
import type { ScoreBreakdown } from '../../types/student-records.ts';
export class ProfessorInputError extends Error {}
const invalid = (message: string): never => { throw new ProfessorInputError(message); };
export const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function textField(v: unknown, max: number, label: string): string {
  if (typeof v !== 'string' || !v.trim() || v.trim().length > max) return invalid(`${label}을 확인해 주세요. (최대 ${max}자)`);
  return v.trim();
}
export function version(v: unknown): string {
  if (typeof v !== 'string' || v.length > 50 || !Number.isFinite(Date.parse(v))) return invalid('기록 버전이 없습니다. 새로고침 후 다시 시도해 주세요.');
  return v;
}
export function newCards(input: unknown): ReviewCard[] {
  if (!object(input) || !Array.isArray(input.cards) || !input.cards.length || input.cards.length > 5) return invalid('카드는 1~5개씩 저장해 주세요.');
  return input.cards.map(c => {
    if (!object(c) || !['개념 반전','개념 혼동','근거 누락','허위 출처'].includes(String(c.errorType)) || !['하','중','상'].includes(String(c.difficulty))) return invalid('카드 유형·난이도를 확인해 주세요.');
    if (!Array.isArray(c.correctKeywords) || !c.correctKeywords.length || c.correctKeywords.length > 20) return invalid('정답 키워드를 확인해 주세요.');
    const id = textField(c.id, 100, '카드 ID');
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return invalid('카드 ID가 올바르지 않습니다.');
    return { id, conceptId: textField(c.conceptId, 100, '개념 ID'), title: textField(c.title, 200, '제목'), wrongClaim: textField(c.wrongClaim,2000,'오류 주장'), correctClaim: textField(c.correctClaim,2000,'정답 설명'), evidence: textField(c.evidence,2000,'근거'), evidenceId: typeof c.evidenceId === 'string' ? c.evidenceId.slice(0,100) : '', correctKeywords: c.correctKeywords.map(k=>textField(k,100,'키워드')), errorType: c.errorType as ReviewCard['errorType'], difficulty: c.difficulty as ReviewCard['difficulty'], approvalStatus: 'pending', ...(c.source === 'claude' ? { source: 'claude' as const, sourceTitle: textField(c.sourceTitle,200,'자료 제목'), sourceExcerpt: textField(c.sourceExcerpt,12000,'원문') } : {}) };
  });
}
export function reviewInput(input: unknown, original: ScoreBreakdown) {
  if (!object(input) || !object(input.score) || input.reviewed !== true) return invalid('제출 원문과 점수 근거를 확인해 주세요.');
  const s = input.score;
  for (const [key,max] of [['judgment',1],['reasoning',2],['concept',2],['evidence',2]] as const) {
    const n=s[key]; if (typeof n !== 'number' || !Number.isFinite(n) || n<0 || n>max || !Number.isInteger(n)) return invalid('항목별 점수를 범위 안의 정수로 입력해 주세요.');
  }
  if (s.penalty !== 0 && s.penalty !== -2) return invalid('과정 감점은 0 또는 -2점입니다.');
  const score = { judgment:s.judgment, reasoning:s.reasoning, concept:s.concept, evidence:s.evidence, penalty:s.penalty } as ScoreBreakdown;
  score.total=Math.round(Math.max(0,Math.min(7,score.judgment+score.reasoning!+score.concept!+score.evidence+score.penalty))*10)/10;
  const feedback=textField(input.feedback,2000,'피드백');
  const reason=typeof input.reason === 'string' ? input.reason.trim() : '';
  if (reason.length>1000 || (['judgment','reasoning','concept','evidence','penalty'] as const).some(k=>score[k]!==original[k]) && !reason) return invalid('점수 항목을 변경한 사유를 입력해 주세요.');
  if (input.action!=='draft' && input.action!=='finalize') return invalid('저장 동작이 올바르지 않습니다.');
  return {score, comment: reason ? `[수정 사유]\n${reason}\n\n[피드백]\n${feedback}` : feedback, action: input.action, updatedAt:version(input.updatedAt)};
}
