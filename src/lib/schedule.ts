// 재인출 퀴즈 일정 (순수 함수).

export const RETRIEVAL_DELAY_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 제출 시각 + 7일.
 * 예) '2026-10-02T13:00:00.000Z' → '2026-10-09T13:00:00.000Z'
 */
export function retrievalDate(submittedAtIso: string): string {
  return new Date(Date.parse(submittedAtIso) + RETRIEVAL_DELAY_DAYS * DAY_MS).toISOString();
}

/**
 * 재인출 퀴즈가 열렸는지. 예약 시각과 같거나 지나면 열림.
 * 예) (예약 1초 전) → false, (예약 시각) → true, (예약 다음 날) → true
 */
export function isRetrievalOpen(nowIso: string, scheduledAtIso: string): boolean {
  return Date.parse(nowIso) >= Date.parse(scheduledAtIso);
}
