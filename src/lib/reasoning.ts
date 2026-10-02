// 본인 생각(이유)·개념 설명 텍스트를 다루는 순수 함수.
// 브라우저·서버 어디서나 쓸 수 있다 (window, localStorage 사용 금지).
// 키워드 기반 점수는 데모·mock 채점 기준이다. 서버 AI 평가가 붙으면 그 점수가 우선한다.

/** 본인 생각 최소 글자 수 (공백 제외) */
export const REASON_MIN_CHARS = 10;
/** 본인 생각 최대 문장 수 */
export const REASON_MAX_SENTENCES = 3;

function compact(text: string): string {
  return text.replace(/\s+/g, '');
}

/**
 * 문장 수. 마침표·물음표·느낌표·줄바꿈으로 나눈다.
 * 예) '' → 0, '그렇다' → 1, '그렇다. 왜냐하면 이렇다.' → 2, '하나.\n둘\n셋!' → 3
 */
export function countSentences(text: string): number {
  return text
    .split(/[.!?。…]+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length;
}

export type ReasonStatus = 'empty' | 'tooShort' | 'tooMany' | 'ok';

/**
 * 본인 생각 입력 상태. 제출 버튼 활성 조건에 쓴다.
 * 예) '' → 'empty', '   ' → 'empty', '틀린 것 같다' → 'tooShort'(공백 제외 6자),
 *     '이데아가 실재라서 틀렸다.' → 'ok', 문장 4개 → 'tooMany'
 */
export function reasonStatus(text: string): ReasonStatus {
  const chars = compact(text).length;
  if (chars === 0) return 'empty';
  if (chars < REASON_MIN_CHARS) return 'tooShort';
  if (countSentences(text) > REASON_MAX_SENTENCES) return 'tooMany';
  return 'ok';
}

export function isReasonValid(text: string): boolean {
  return reasonStatus(text) === 'ok';
}

/**
 * 키워드가 몇 개 들어 있는지. 공백·대소문자를 무시하고, 같은 키워드는 한 번만 센다.
 * 예) ('이데아가 진짜 실재다', ['이데아','실재','모방']) → 2, ('', [...]) → 0, (text, []) → 0
 */
export function countKeywordHits(text: string, keywords: readonly string[]): number {
  const body = compact(text).toLowerCase();
  if (!body) return 0;
  const unique = new Set(keywords.map((k) => compact(k).toLowerCase()).filter(Boolean));
  let hits = 0;
  for (const k of unique) if (body.includes(k)) hits += 1;
  return hits;
}

/**
 * 본인 생각 점수 0~2 (learning-loop-rules 키워드 규칙).
 * 20자 이상(공백 제외) + 개념 키워드 1개 이상 → 2, 20자 이상만 → 1, 그 외 → 0
 * 예) ('', kw) → 0, (19자 + 키워드, kw) → 0, (20자 키워드 없음) → 1, (20자 + '이데아') → 2
 */
export function keywordReasonScore(text: string, conceptKeywords: readonly string[]): 0 | 1 | 2 {
  if (compact(text).length < 20) return 0;
  return countKeywordHits(text, conceptKeywords) >= 1 ? 2 : 1;
}

/**
 * 올바른 개념 제시 점수 0~2. 수정 설명에 오류 카드의 정답 키워드가 몇 개 있는지.
 * 2개 이상 → 2, 1개 → 1, 0개 → 0
 * 예) (undefined, kw) → 0, ('', kw) → 0, ('이데아가 실재', ['이데아','실재']) → 2
 */
export function keywordConceptScore(correction: string | undefined, correctKeywords: readonly string[]): 0 | 1 | 2 {
  if (!correction) return 0;
  const hits = countKeywordHits(correction, correctKeywords);
  return hits >= 2 ? 2 : hits === 1 ? 1 : 0;
}

/**
 * 근거 연결 점수 0~2. 선택한 근거가 오류 카드의 근거와 같으면 2, 아니면 0.
 * 예) (undefined, 'ev1') → 0, ('ev2', 'ev1') → 0, ('ev1', 'ev1') → 2
 */
export function evidenceScore(selectedId: string | undefined, expectedId: string): 0 | 2 {
  return selectedId !== undefined && selectedId === expectedId ? 2 : 0;
}

/**
 * 이 이유 칸이 "붙여넣기로만 채워졌는지". 붙여넣은 글자가 최종 글자의 절반을 넘으면 true.
 * 예) (0, 0) → false, (30, 0) → false, (30, 15) → false, (30, 16) → true, (10, 50) → true
 */
export function isPastedReason(reasonLength: number, pastedChars: number): boolean {
  if (reasonLength <= 0 || pastedChars <= 0) return false;
  return pastedChars / reasonLength > 0.5;
}

/**
 * 붙여넣기로만 채워진 이유 칸의 비율 0~1.
 * 예) [] → 0, 3칸 중 2칸 → 0.666…, 3칸 중 0칸 → 0
 */
export function pastedReasonRatio(answers: readonly { reasoning: string; pastedChars: number }[]): number {
  if (answers.length === 0) return 0;
  const pasted = answers.filter((a) => isPastedReason(a.reasoning.length, a.pastedChars)).length;
  return pasted / answers.length;
}
