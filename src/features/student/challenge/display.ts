// 챌린지·결과 화면 표시용 작은 도우미 (점수 계산은 하지 않는다. 계산은 src/lib)
import type { ApiError } from '../services/store.types';

export type LoadProblem =
  | { kind: 'not_approved' }
  | { kind: 'login'; message: string }
  | { kind: 'error'; message: string };

/** API 오류 → 화면 상태 */
export function problemOf(error: ApiError['error']): LoadProblem {
  if (error.code === 'CHALLENGE_NOT_APPROVED') return { kind: 'not_approved' };
  if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN' || error.code === 'SESSION_MISMATCH') {
    return { kind: 'login', message: error.message };
  }
  return { kind: 'error', message: error.message };
}

/** 점수 항목 표시: +2 / 대기 */
export function pointText(value: number | null): string {
  if (value === null) return '대기';
  return value < 0 ? `−${Math.abs(value)}` : `+${value}`;
}
