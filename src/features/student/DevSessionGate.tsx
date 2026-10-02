'use client';

import Link from 'next/link';
import { Wordmark } from '@/components/shell';
import { DEMO_ACCOUNTS, startSession } from '@/lib/session';
import type { Session } from '@/types/session';

/**
 * 학생 세션이 없을 때 보이는 임시 진입 화면.
 * 정식 진입은 역할 선택 화면(/)이고, 이 화면은 개발 중 학생 화면으로 바로 들어오기 위한 것이다.
 */
export function DevSessionGate({ current }: { current: Session | null }) {
  const student = DEMO_ACCOUNTS.student;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-subtle px-4 py-10">
      <div className="w-full max-w-[480px] rounded-block border border-line bg-page px-6 py-8">
        <Wordmark />
        <h1 className="mt-6 text-title font-bold text-ink">
          {current ? '학생 계정으로 들어와야 해요' : '학생 세션이 없어요'}
        </h1>
        <p className="mt-2 text-body text-ink-sub">
          {current
            ? `지금은 ${current.name}(교수) 계정이에요. 학생 화면은 학생 계정으로만 볼 수 있어요.`
            : '역할 선택 화면에서 "학생으로 시작"을 누르거나, 아래 개발용 버튼으로 바로 들어갈 수 있어요.'}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/"
            className="flex h-11 items-center justify-center rounded-control bg-sejong px-4 text-body font-semibold text-page"
          >
            역할 선택으로 가기
          </Link>
          <button
            type="button"
            onClick={() => startSession('student')}
            className="flex h-11 items-center justify-center rounded-control border border-line-strong px-4 text-body text-ink"
          >
            개발용: {student.name} 학생으로 시작
          </button>
        </div>
      </div>
    </main>
  );
}
