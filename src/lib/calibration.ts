// 확신도 보정 정확도 (순수 함수). learning-loop-rules 기준.
// p = 확신도/100 을 "내 판정이 맞을 확률"로 보고, y = 판정이 맞았으면 1 아니면 0.
// Brier = 평균((p - y)^2), 보정 정확도 = round((1 - Brier) * 100). 0~100, 높을수록 좋다.

export interface CalibrationItem {
  claimId: string;
  /** 0~100 */
  confidence: number;
  /** 판정이 맞았는지 */
  correct: boolean;
}

/** 이 확신도 이상인데 틀린 주장을 "확신했지만 틀린 주장"으로 본다 */
export const OVERCONFIDENT_THRESHOLD = 80;

function clampConfidence(c: number): number {
  return Math.min(100, Math.max(0, c));
}

/**
 * 예) [] → 0
 *     [{100, 맞음}] → 100, [{100, 틀림}] → 0, [{0, 맞음}] → 0, [{0, 틀림}] → 100
 *     [{50, 맞음}] → 75, [{90, 맞음}, {85, 맞음}, {80, 맞음}] → 98
 */
export function calibrationAccuracy(items: readonly CalibrationItem[]): number {
  if (items.length === 0) return 0;
  const brier =
    items.reduce((sum, it) => {
      const p = clampConfidence(it.confidence) / 100;
      const y = it.correct ? 1 : 0;
      return sum + (p - y) ** 2;
    }, 0) / items.length;
  return Math.round((1 - brier) * 100);
}

/**
 * 확신도 80 이상인데 틀린 주장 id 목록.
 * 예) [{80, 틀림}] → [id], [{79, 틀림}] → [], [{100, 맞음}] → []
 */
export function overconfidentClaimIds(items: readonly CalibrationItem[]): string[] {
  return items.filter((it) => it.confidence >= OVERCONFIDENT_THRESHOLD && !it.correct).map((it) => it.claimId);
}
