'use client';

import { CORRECTION_MIN_CHARS } from '@/lib/challengeInput';
import { REASON_MAX_SENTENCES, reasonStatus } from '@/lib/reasoning';
import type { ChallengeClaimPublic, EvidenceOption } from '../services/store.types';
import type { DraftAnswer } from '../services/store';

interface ThinkingPanelProps {
  claim: ChallengeClaimPublic;
  answer: DraftAnswer;
  evidenceOptions: EvidenceOption[];
  disabled: boolean;
  onChange: (patch: Partial<DraftAnswer>) => void;
}

const REASON_HINT: Record<ReturnType<typeof reasonStatus>, string> = {
  empty: '왜 그렇게 판단했는지 1~3문장으로 적어 주세요.',
  tooShort: '조금 더 구체적으로 적어 주세요. (10자 이상)',
  tooMany: `${REASON_MAX_SENTENCES}문장 이내로 줄여 주세요.`,
  ok: '좋아요. 판단 이유가 적혔어요.',
};

/** 선택한 주장의 "내 생각": 이유(필수), '틀리다'면 올바른 개념 설명과 근거 */
export function ThinkingPanel({ claim, answer, evidenceOptions, disabled, onChange }: ThinkingPanelProps) {
  const status = reasonStatus(answer.reasoning);
  const wrong = answer.judgment === 'wrong';
  const correctionShort = answer.correction.replace(/\s+/g, '').length < CORRECTION_MIN_CHARS;
  const reasonId = `reason-${claim.id}`;
  const correctionId = `correction-${claim.id}`;
  const evidenceId = `evidence-${claim.id}`;

  return (
    <div>
      <h2 className="text-title font-bold text-ink">주장 {claim.label}에 대한 내 생각</h2>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <label htmlFor={reasonId} className="text-body text-ink">
          왜 그렇게 판단했나요?
        </label>
        <span className="text-caption text-ink-sub">본인 생각 1~3문장 · 필수</span>
      </div>
      <textarea
        id={reasonId}
        rows={4}
        maxLength={1000}
        disabled={disabled}
        value={answer.reasoning}
        onChange={(e) => onChange({ reasoning: e.target.value })}
        onPaste={(e) => onChange({ pastedChars: answer.pastedChars + e.clipboardData.getData('text').length })}
        placeholder={answer.judgment ? '내 말로 판단 근거를 적어 보세요.' : '먼저 맞다·틀리다를 고른 뒤 이유를 적어 보세요.'}
        className="mt-2 w-full resize-y rounded-control border border-line px-4 py-3 text-body text-ink"
        aria-describedby={`${reasonId}-hint`}
      />
      <p id={`${reasonId}-hint`} className={`mt-1 text-caption ${status === 'ok' ? 'text-ink-sub' : 'text-challenge'}`}>
        {REASON_HINT[status]}
      </p>

      {wrong && (
        <>
          <label htmlFor={correctionId} className="mt-5 block text-body text-ink">
            올바른 개념을 내 말로 설명
          </label>
          <textarea
            id={correctionId}
            rows={2}
            maxLength={1000}
            disabled={disabled}
            value={answer.correction}
            onChange={(e) => onChange({ correction: e.target.value })}
            placeholder="이 주장을 바르게 고치면 어떻게 될까요?"
            className="mt-2 w-full resize-y rounded-control border border-line px-4 py-3 text-body text-ink"
          />
          {correctionShort && <p className="mt-1 text-caption text-challenge">고친 설명을 {CORRECTION_MIN_CHARS}자 이상 적어 주세요.</p>}

          <label htmlFor={evidenceId} className="mt-5 block text-body text-ink">
            내 판단을 뒷받침하는 근거
          </label>
          <select
            id={evidenceId}
            disabled={disabled}
            value={answer.evidenceId ?? ''}
            onChange={(e) => onChange({ evidenceId: e.target.value || undefined })}
            className="mt-2 h-11 w-full rounded-control border border-line bg-page px-3 text-body text-ink"
          >
            <option value="">근거를 골라 주세요</option>
            {evidenceOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label} · {o.topic}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
