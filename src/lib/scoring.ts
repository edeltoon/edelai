// 검증 챌린지 점수 계산 (순수 함수). 설계안 기준 최대 7점, 과정 우회 확인 시 -2.
//   판정 +1  : 모든 주장을 맞게 판정했을 때만 (오류 개수만 보고 "전부 틀리다"로 찍는 전략 차단)
//   이유 +2  : 주장별 본인 생각 점수(0~2)의 평균을 반올림
//   개념 +2  : 오류 주장의 올바른 개념 제시 점수(0~2), 오류가 여러 개면 평균 반올림
//   근거 +2  : 오류 주장의 근거 연결 점수(0/2), 오류가 여러 개면 평균 반올림
//   과정 -2  : 정답 직행 시도가 있고, 이유 칸 절반 초과가 붙여넣기로만 채워졌을 때만
// 서버 API와 화면이 같은 함수를 쓰도록 브라우저 전용 API를 쓰지 않는다.
import type { ScoreBreakdown } from '@/types/student-records';

export const MAX_SCORE = 7;
export const PROCESS_PENALTY = -2;

function averageRounded(values: readonly number[], max: number): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.min(max, Math.max(0, Math.round(avg)));
}

/**
 * 판정 점수 0/1.
 * 예) [] → 0, [true, true, true] → 1, [true, false, true] → 0
 */
export function judgmentPoint(judgmentCorrect: readonly boolean[]): 0 | 1 {
  return judgmentCorrect.length > 0 && judgmentCorrect.every(Boolean) ? 1 : 0;
}

/**
 * 이유 점수 0~2 (주장별 점수 평균 반올림, .5는 올림).
 * 예) [] → 0, [0, 0, 0] → 0, [1, 1, 2] → 1 (1.33), [2, 2, 1] → 2 (1.67), [1, 2] → 2 (1.5)
 */
export function reasoningPoint(perClaim: readonly number[]): number {
  return averageRounded(perClaim, 2);
}

/**
 * 개념·근거 점수 0~2 (오류 주장별 점수 평균 반올림).
 * 오류 주장을 '맞다'로 판정해 놓쳤다면 그 주장의 개념·근거 점수는 0으로 넘긴다.
 * 예) [] → 0, [2] → 2, [2, 0] → 1, [2, 1] → 2 (1.5)
 */
export function errorClaimPoint(perErrorClaim: readonly number[]): number {
  return averageRounded(perErrorClaim, 2);
}

/**
 * 과정 감점 0/-2. 직행 시도 단독으로는 감점하지 않는다.
 * 예) (false, 1) → 0, (true, 0.5) → 0, (true, 0.51) → -2, (true, 0) → 0
 */
export function processPenalty(directAnswerFlag: boolean, pastedRatio: number): 0 | -2 {
  return directAnswerFlag && pastedRatio > 0.5 ? PROCESS_PENALTY : 0;
}

/**
 * 합계 0~7. 감점으로 음수가 되면 0.
 * 예) {1,2,2,2,0} → 7, {0,1,0,0,-2} → 0, {1,2,2,2,-2} → 5
 */
export function totalScore(parts: Omit<ScoreBreakdown, 'total'>): ScoreBreakdown {
  const raw = parts.judgment + parts.reasoning + parts.concept + parts.evidence + parts.penalty;
  return { ...parts, total: Math.min(MAX_SCORE, Math.max(0, raw)) };
}
