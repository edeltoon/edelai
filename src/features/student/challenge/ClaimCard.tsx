'use client';

import { isThoughtComplete } from '@/lib/challengeInput';
import type { Judgment } from '@/types/content';
import type { ChallengeClaimPublic } from '../services/store.types';
import type { DraftAnswer } from '../services/store';

interface ClaimCardProps {
  claim: ChallengeClaimPublic;
  answer: DraftAnswer;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onJudge: (judgment: Judgment) => void;
  onConfidence: (confidence: number) => void;
}

const JUDGE_LABEL: Record<Judgment, string> = { correct: '맞다', wrong: '틀리다' };

/** 주장 하나: 판정(맞다/틀리다), 이유 작성 상태, 확신도 슬라이더. 오류 여부는 이 카드가 모른다 */
export function ClaimCard({ claim, answer, selected, disabled, onSelect, onJudge, onConfidence }: ClaimCardProps) {
  const thoughtDone = isThoughtComplete(answer);
  const confidenceSet = answer.confidence !== undefined;

  return (
    <article
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={`cursor-pointer rounded-block border bg-page px-5 py-4 ${selected ? 'border-info-bar' : 'border-line'}`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-control bg-line-strong/50 text-caption font-semibold text-ink-sub"
        >
          {claim.label}
        </span>
        <p className="text-lead text-ink">
          <span className="sr-only">주장 {claim.label}: </span>
          {claim.text}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div role="group" aria-label={`주장 ${claim.label} 판정`} className="flex gap-1">
          {(['correct', 'wrong'] as const).map((j) => {
            const on = answer.judgment === j;
            const tone = j === 'correct' ? 'border-info-soft bg-info-soft text-info' : 'border-sejong bg-sejong-soft text-sejong';
            return (
              <button
                key={j}
                type="button"
                disabled={disabled}
                aria-pressed={on}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                  onJudge(j);
                }}
                className={`h-9 rounded-control border px-4 text-body ${on ? `${tone} font-semibold` : 'border-line text-ink-sub hover:text-ink'}`}
              >
                {JUDGE_LABEL[j]}
              </button>
            );
          })}
        </div>

        <span className={`text-caption ${thoughtDone ? 'text-ink-sub' : 'text-ink-sub/70'}`}>
          {thoughtDone ? '✓ 이유 작성 완료' : '이유 작성 전'}
        </span>

        <label className="ml-auto flex items-center gap-3 text-caption text-ink-sub" onClick={(e) => e.stopPropagation()}>
          확신도
          <span className={`tabular w-7 text-right text-body font-semibold ${confidenceSet ? 'text-ink' : 'text-ink-sub'}`}>
            {confidenceSet ? answer.confidence : '—'}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            disabled={disabled}
            value={answer.confidence ?? 50}
            aria-label={`주장 ${claim.label} 확신도`}
            aria-valuetext={confidenceSet ? `${answer.confidence}` : '아직 정하지 않음'}
            onChange={(e) => onConfidence(Number(e.target.value))}
            onFocus={onSelect}
            className={`w-28 accent-info-bar ${confidenceSet ? '' : 'opacity-50'}`}
          />
        </label>
      </div>
    </article>
  );
}
