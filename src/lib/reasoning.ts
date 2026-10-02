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

/** "모르겠다", "기억이 안 난다"처럼 판단 근거가 없다고 밝히는 표현 */
const NO_KNOWLEDGE =
  /모르겠|모르겟|몰라|모름|모릅니다|기억(이|은|도|가)?\s*(안|잘\s*안|나지\s*않|없)|기억\s*안\s*나|생각(이|은)?\s*(안\s*나|나지\s*않)|찍었|찍음|헷갈|확실하지\s*않|알\s*수\s*없/g;
/** 근거가 아닌 군말·판정 표현. 지우고 남은 글자로 이유에 내용이 있는지 본다 */
const FILLER =
  /그냥|아마도?|왠지|느낌(상|으로|이|만)?|감으로|잘(?!못)|것\s*같(다|아요|아서|습니다|음|은데|네요)?|같아요|같다|생각(한다|해요|합니다|함|했다|했어요|됩니다|된다)|(맞|틀리|틀렸|맞았)(다|어요|습니다|는|을|은|음|네요)|맞는\s*말|틀린\s*말|입니다|이에요|예요|그렇다|그래서|하지만|그런데|[.,!?…~'"“”‘’()\s]/g;

/**
 * 내용 없는 이유인지. "모르겠다"·"기억이 나지 않는다"류 표현을 빼고 남는 내용이 15자 미만이거나,
 * 군말·판정 표현만으로 채워 남는 내용이 8자 미만이면 true.
 * 예) '기억이 나지 않는다.' → true, '잘 모르겠지만 그냥 맞는 것 같다고 생각한다.' → true,
 *     '이데아가 뭔지 기억이 안 난다' → true, '맞다고 생각합니다. 맞는 것 같아요.' → true,
 *     '그냥 맞는 말 같다. 감각으로 경험한다고 했으니까.' → false,
 *     '확실하지 않지만 이데아가 실재라고 배워서 감각 세계가 실재라는 말은 틀렸다.' → false
 */
export function isContentlessReason(text: string): boolean {
  if (!compact(text)) return true;
  if (isUnsureWithoutContent(text)) return true;
  return text.replace(NO_KNOWLEDGE, '').replace(FILLER, '').length < 8;
}

/**
 * "모르겠다"·"기억이 안 난다"류 표현이 있고, 그 표현과 군말을 빼면 남는 내용이 15자 미만인지.
 * 짧은 개념 설명('이데아가 실재다')은 이 표현이 없으므로 false.
 * 예) '이데아가 실재인지 모르겠다' → true, '이데아가 실재다' → false,
 *     '확실하지 않지만 이데아가 진정한 실재이고 감각 세계는 그 모방이다' → false
 */
export function isUnsureWithoutContent(text: string): boolean {
  if (!new RegExp(NO_KNOWLEDGE.source).test(text)) return false;
  return text.replace(NO_KNOWLEDGE, '').replace(FILLER, '').length < 15;
}

/** 키워드 규칙 본인 생각 점수의 근거 (피드백 문구를 점수와 맞추는 데 쓴다) */
export type KeywordReasonBasis = 'contentless' | 'short' | 'noKeyword' | 'keyword';

/**
 * 본인 생각 점수 0~2와 그 근거 (learning-loop-rules 키워드 규칙).
 * 내용 없는 이유 → 0, 20자 미만(공백 제외) → 0, 20자 이상 + 개념 키워드 1개 이상 → 2, 20자 이상만 → 1
 * 예) ('', kw) → 0 contentless, (19자 + 키워드) → 0 short, (20자 키워드 없음) → 1 noKeyword,
 *     (20자 + '이데아') → 2 keyword, ('기억이 나지 않는다. 그래서 잘 모르겠지만 맞는 것 같다', kw) → 0 contentless
 */
export function keywordReasonGrade(
  text: string,
  conceptKeywords: readonly string[],
): { score: 0 | 1 | 2; basis: KeywordReasonBasis } {
  if (isContentlessReason(text)) return { score: 0, basis: 'contentless' };
  if (compact(text).length < 20) return { score: 0, basis: 'short' };
  return countKeywordHits(text, conceptKeywords) >= 1 ? { score: 2, basis: 'keyword' } : { score: 1, basis: 'noKeyword' };
}

/** 본인 생각 점수 0~2만. 예는 keywordReasonGrade 참고 */
export function keywordReasonScore(text: string, conceptKeywords: readonly string[]): 0 | 1 | 2 {
  return keywordReasonGrade(text, conceptKeywords).score;
}

/**
 * 올바른 개념 제시 점수 0~2. 수정 설명에 오류 카드의 정답 키워드가 몇 개 있는지.
 * 2개 이상 → 2, 1개 → 1, 0개 → 0. "모르겠다"류로 내용 없이 쓴 설명은 키워드가 있어도 0
 * 예) (undefined, kw) → 0, ('', kw) → 0, ('이데아가 실재', ['이데아','실재']) → 2,
 *     ('이데아가 실재인지 모르겠다', ['이데아','실재']) → 0
 */
export function keywordConceptScore(correction: string | undefined, correctKeywords: readonly string[]): 0 | 1 | 2 {
  if (!correction || isUnsureWithoutContent(correction)) return 0;
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

/**
 * 해설 전 생각 요약(키워드 규칙용): 본인 생각의 첫 문장, 최대 max자.
 * AI 요약이 없을 때(local mock, AI 채점 실패 대체) 쓴다.
 * 예) '' → '', '이데아가 실재다. 그래서 틀렸다.' → '이데아가 실재다.', 61자 첫 문장 → 60자 + '…'
 */
export function firstSentenceSummary(text: string, max = 60): string {
  const first = text.trim().split(/(?<=[.!?。])\s+|\n+/)[0]?.trim() ?? '';
  return first.length > max ? `${first.slice(0, max)}…` : first;
}

/**
 * 키워드 규칙으로 채점했을 때의 본인 생각 피드백 (해요체). 문구는 점수와 항상 맞춘다.
 * missedError: 오류 주장을 '맞다'로 판정해 놓친 경우 (점수는 그대로, 놓쳤다는 안내만 덧붙임)
 * 예) (2, false) → 개념 연결 칭찬, (0, false) → 20자·개념 연결 안내, (2, true) → 오탐 안내,
 *     (0, false, {basis:'contentless'}) → 근거 없는 이유 0점 안내, (2, false, {missedError:true}) → 개념은 들었지만 오류를 놓침
 */
export function ruleReasonFeedback(
  score: number,
  falseAlarm: boolean,
  options: { basis?: KeywordReasonBasis; missedError?: boolean } = {},
): string {
  if (falseAlarm) return '맞는 주장을 틀리다고 판정해서 이 주장의 이유 점수는 0이에요. 맞는 주장을 맞다고 인정하는 것도 실력이에요.';
  const missed = options.missedError ? ' 이 주장의 오류는 놓쳤어요. 해설과 비교해 보세요.' : '';
  if (options.basis === 'contentless' && score === 0) {
    return `‘모르겠다’, ‘기억이 안 난다’처럼 판단 근거가 없는 이유는 0점이에요. 무엇을 보고 그렇게 판단했는지 적어 보세요.${missed}`;
  }
  if (score >= 2) return options.missedError ? `수업 개념을 들어 이유를 썼어요.${missed}` : '수업 개념을 들어 판단 이유를 설명했어요.';
  if (score === 1) return `이유는 썼지만 수업 개념과의 연결이 약해요.${missed}`;
  return `이유가 짧거나 수업 개념과 연결되지 않아 0점이에요. 20자 이상, 수업 개념과 연결해 써 보세요.${missed}`;
}
