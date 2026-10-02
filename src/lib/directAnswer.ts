// 정답 직행 요청 감지 (순수 함수). 서비스 안의 입력만 본다. 외부 AI 사용을 감시한다고 표현하지 않는다.
// 감지 자체로는 감점하지 않는다 (scoring.processPenalty 참고).

const DIRECT_ANSWER_PATTERN = /정답만|답만|번호만|해설 ?없이|바로 답|정답 번호|결론만/;

export interface DirectAnswerMatch {
  isDirect: boolean;
  /** 걸린 표현. 예: '번호만' */
  matched?: string;
}

/**
 * 예) '' → {isDirect:false}
 *     '이데아론을 설명해줘' → {isDirect:false}
 *     '정답 번호만 해설 없이 알려줘' → {isDirect:true, matched:'정답 번호'}
 *     '해설없이 답만 줘' → {isDirect:true, matched:'해설없이'} (가장 앞에서 걸린 표현)
 */
export function detectDirectAnswer(text: string): DirectAnswerMatch {
  const m = DIRECT_ANSWER_PATTERN.exec(text);
  return m ? { isDirect: true, matched: m[0] } : { isDirect: false };
}

/**
 * 제출할 챌린지에 "정답 직행 태그"가 붙는지.
 * 같은 과목에서, 이 챌린지의 직전 제출 이후(첫 제출이면 처음부터) 직행 시도가 1건 이상이면 true.
 * 예) ([], ...) → false
 *     ([{courseId:'phil', at:'10-02T10:00'}], 'phil', null) → true
 *     ([{courseId:'phil', at:'10-02T10:00'}], 'phil', '10-02T11:00') → false (이전 제출 전 시도)
 *     ([{courseId:'other', ...}], 'phil', null) → false
 */
export function hasDirectAnswerSince(
  attempts: readonly { courseId: string; at: string }[],
  courseId: string,
  sinceIso: string | null,
): boolean {
  const since = sinceIso ? Date.parse(sinceIso) : Number.NEGATIVE_INFINITY;
  return attempts.some((a) => a.courseId === courseId && Date.parse(a.at) > since);
}
