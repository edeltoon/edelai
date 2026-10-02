'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ConversationMessage } from '@/types/student-records';
import { getEvidence } from '../content/lecture';
import { studentRoutes } from '../routes';
import { Markdown } from './Markdown';

/** 학생 질문: 오른쪽 말풍선 */
export function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap rounded-block bg-bubble px-4 py-3 text-body text-ink sm:max-w-[75%]">{text}</p>
    </div>
  );
}

function AiHeader({ caption }: { caption?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-6 place-items-center rounded-control bg-sejong text-caption font-bold text-(--color-page)" aria-hidden="true">
        AI
      </span>
      <span className="text-body font-semibold text-ink">과목 AI</span>
      {caption && <span className="text-caption text-ink-sub">{caption}</span>}
    </div>
  );
}

function EvidenceChip({ evidenceId, label }: { evidenceId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const evidence = getEvidence(evidenceId);
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 text-caption text-ink-sub hover:text-ink"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="size-4" aria-hidden="true">
          <path d="M4 1.75h5.5L12.5 4.75v9.5h-8.5z M9.5 1.75v3h3" strokeLinejoin="round" />
        </svg>
        {label}
        <span className="rounded-full bg-info-soft px-2 py-0.5 text-info">{open ? '접기' : '근거 보기'}</span>
      </button>
      {open && evidence && (
        <blockquote className="mt-2 rounded-block bg-subtle px-4 py-3 text-caption text-ink">
          <span className="font-semibold">{evidence.topic}</span> · {evidence.excerpt}
        </blockquote>
      )}
    </li>
  );
}

/** AI 답변: 배경 없는 문서형 + 개념 카드 + 강의자료 근거 + 검증 챌린지 유도 */
export function AiMessage({ message, courseId }: { message: ConversationMessage; courseId: string }) {
  return (
    <article className="space-y-3" aria-label="과목 AI 답변">
      <AiHeader />
      <div className="pl-8">
        <Markdown text={message.text} />
        {message.concepts && message.concepts.length > 0 && (
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            {message.concepts.map((c) => (
              <div key={c.term} className="rounded-block bg-subtle px-4 py-3">
                <dt className="text-body font-semibold text-ink">{c.term}</dt>
                <dd className="mt-0.5 text-caption text-ink-sub">{c.gloss}</dd>
              </div>
            ))}
          </dl>
        )}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-3">
            <p className="text-caption text-ink-sub">관련 강의자료</p>
            <ul className="mt-1 space-y-1">
              {message.citations.map((c) => (
                <EvidenceChip key={c.evidenceId} evidenceId={c.evidenceId} label={c.label} />
              ))}
            </ul>
          </div>
        )}
        {message.suggestChallengeId && <ChallengeInvite courseId={courseId} />}
      </div>
    </article>
  );
}

/** 같은 개념의 검증 챌린지로 가는 띠 (설계안 ChallengeInvite) */
export function ChallengeInvite({ courseId, text = '같은 개념의 AI 답변을 직접 검증해 볼까요?' }: { courseId: string; text?: string }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-block bg-sejong-soft px-4 py-3">
      <p className="text-body font-semibold text-sejong">{text}</p>
      <Link
        href={studentRoutes.challenges(courseId)}
        className="inline-flex h-9 items-center rounded-control border border-line bg-page px-3 text-caption font-semibold text-ink"
      >
        검증 챌린지 시작 →
      </Link>
    </div>
  );
}

/** 정답 직행 요청: /api/chat을 부르지 않고 검증 과정으로 안내 */
export function DirectAnswerNotice({ courseId }: { courseId: string }) {
  return (
    <article className="space-y-3" aria-label="검증 과정 안내">
      <AiHeader caption="검증 과정 안내" />
      <div className="ml-8 rounded-block bg-caution-bg px-4 py-3 text-body text-caution">
        <p className="font-semibold">정답만 바로 알려 드리지는 않아요.</p>
        <p className="mt-1">
          검증 챌린지는 주장마다 맞다·틀리다를 직접 판단하고 그 이유를 쓰는 과정이 점수가 돼요. 헷갈리는 개념을 물어보면 함께 정리해 드릴게요.
        </p>
      </div>
      <div className="pl-8">
        <ChallengeInvite courseId={courseId} text="직접 판단해 보고 해설로 확인해 볼까요?" />
      </div>
    </article>
  );
}

/** 답변 대기: 반짝임 없이 정적인 문구 */
export function PendingAnswer() {
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <AiHeader />
      <p className="pl-8 text-body text-ink-sub">답변을 쓰고 있어요. 보통 10~20초 걸려요.</p>
    </div>
  );
}
