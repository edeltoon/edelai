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

/** 예약일은 한국 시간(Asia/Seoul, UTC+9, 서머타임 없음) 기준 날짜로 보여 준다 */
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 한국 시간 기준 날짜 표시. 브라우저·서버 시간대와 관계없이 같은 결과.
 * 예) '2026-10-10T03:00:00.000Z' → '10월 10일(토)', '2026-10-10T15:30:00.000Z' → '10월 11일(일)' (한국 10/11 00:30),
 *     'x' → ''
 */
export function seoulDateLabel(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const d = new Date(t + SEOUL_OFFSET_MS);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${WEEKDAYS[d.getUTCDay()]})`;
}

/**
 * 재인출 퀴즈가 열렸는지. 예약 시각과 같거나 지나면 열림.
 * 예) (예약 1초 전) → false, (예약 시각) → true, (예약 다음 날) → true
 */
export function isRetrievalOpen(nowIso: string, scheduledAtIso: string): boolean {
  return Date.parse(nowIso) >= Date.parse(scheduledAtIso);
}
