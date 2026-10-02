// 검증 챌린지 입력 완료 규칙 (순수 함수). learning-loop-rules 3번 "이유 먼저".
// 모든 주장에 판정·확신도·본인 생각이 있어야 제출할 수 있다.
// '틀리다'로 판정한 주장은 올바른 개념 설명과 근거까지 있어야 본인 생각이 완료된 것으로 센다.
import type { Judgment } from '@/types/content';
import { isReasonValid } from './reasoning.ts';

/** 작성 중인 한 주장의 입력 (아직 비어 있을 수 있음) */
export interface ClaimInput {
  judgment?: Judgment;
  confidence?: number;
  reasoning: string;
  correction?: string;
  evidenceId?: string;
}

/** 올바른 개념 설명 최소 글자 수 (공백 제외) */
export const CORRECTION_MIN_CHARS = 5;

/**
 * 본인 생각 완료 여부.
 * 예) 판정 없음 + 이유 OK → 이유만 보면 완료(true). 판정은 따로 센다.
 *     '맞다' + 이유 OK → true
 *     '틀리다' + 이유 OK + 설명 없음 → false
 *     '틀리다' + 이유 OK + 설명 5자 이상 + 근거 선택 → true
 */
export function isThoughtComplete(input: ClaimInput): boolean {
  if (!isReasonValid(input.reasoning)) return false;
  if (input.judgment !== 'wrong') return true;
  const corr = (input.correction ?? '').replace(/\s+/g, '');
  return corr.length >= CORRECTION_MIN_CHARS && Boolean(input.evidenceId);
}

export interface InputProgress {
  total: number;
  judged: number;
  confident: number;
  thought: number;
  complete: boolean;
}

/**
 * 진행 현황 "판정 n/n · 확신도 n/n · 본인 생각 n/n".
 * 예) [] → 모두 0, complete false
 *     3개 모두 판정·확신도·이유 완료 → {3,3,3,3, complete:true}
 *     확신도가 0이어도 값이 있으면 입력한 것으로 센다 (undefined만 미입력)
 */
export function inputProgress(inputs: readonly ClaimInput[]): InputProgress {
  const judged = inputs.filter((i) => i.judgment !== undefined).length;
  const confident = inputs.filter((i) => i.confidence !== undefined).length;
  const thought = inputs.filter(isThoughtComplete).length;
  const total = inputs.length;
  return {
    total,
    judged,
    confident,
    thought,
    complete: total > 0 && judged === total && confident === total && thought === total,
  };
}
