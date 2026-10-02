'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import { Wordmark } from '@/components/shell';
import { DEMO_ACCOUNTS, HOME_PATH, SESSION_CHANGE_EVENT, SESSION_KEY, parseSession, startSession } from '@/lib/session';
import type { Role } from '@/types/session';

const ROLE_LABEL: Record<Role, string> = { student: '학생', professor: '교수' };

const OPTIONS: { role: Role; title: string; account: string; scope: string }[] = [
  {
    role: 'student',
    title: '학생으로 시작',
    account: `${DEMO_ACCOUNTS.student.name} · 학번 ${DEMO_ACCOUNTS.student.memberNo}`,
    scope: '수강 과목 · 질문 · 검증 · 복습',
  },
  {
    role: 'professor',
    title: '교수로 시작',
    account: `${DEMO_ACCOUNTS.professor.name} · 서양철학:쟁점과토론`,
    scope: '담당 과목 · 요약 · 기록 · 평가',
  },
];

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(SESSION_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(SESSION_CHANGE_EVENT, onChange);
  };
}

/** 원문 문자열을 스냅샷으로 써서 값이 같으면 다시 렌더하지 않는다 */
function getRawSession() {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function RoleSelect() {
  const router = useRouter();
  const [pending, setPending] = useState<Role | null>(null);
  const raw = useSyncExternalStore(subscribe, getRawSession, () => null);
  const current = parseSession(raw);

  function choose(role: Role) {
    if (pending) return;
    setPending(role);
    startSession(role);
    router.push(HOME_PATH[role]);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-subtle px-4 py-10">
      <div className="w-full max-w-[720px] rounded-block border border-line bg-page px-5 py-8 sm:px-10 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <Wordmark />
          <span className="rounded-full bg-info-soft px-3 py-1 text-caption font-semibold text-info">시연용</span>
        </div>

        <h1 className="mt-8 text-page font-bold text-ink">AI 학습·평가 공간</h1>
        <p className="mt-2 text-body text-ink-sub">역할을 고르면 그 역할의 공간으로 바로 이동해요.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((option) => {
            const isPending = pending === option.role;
            return (
              <button
                key={option.role}
                type="button"
                onClick={() => choose(option.role)}
                disabled={pending !== null}
                aria-busy={isPending}
                className="flex flex-col items-start gap-1 rounded-block border border-line bg-page px-5 py-5 text-left hover:border-sejong hover:bg-sejong-soft disabled:cursor-wait disabled:opacity-70"
              >
                <span className="text-lead font-bold text-ink">{isPending ? '이동하고 있어요' : option.title}</span>
                <span className="text-body text-ink">{option.account}</span>
                <span className="text-caption text-ink-sub">{option.scope}</span>
              </button>
            );
          })}
        </div>

        {current && (
          <p className="mt-5 text-body text-ink-sub">
            지금 {current.name}({ROLE_LABEL[current.role]}) 계정으로 들어와 있어요.{' '}
            <Link href={HOME_PATH[current.role]} className="font-semibold text-sejong underline-offset-2 hover:underline">
              이어서 들어가기 →
            </Link>
          </p>
        )}

        <p className="mt-8 border-t border-line pt-4 text-caption text-ink-sub">
          실제 학교 계정 인증은 없어요. 가상 계정으로 들어가는 시연용 화면이에요. 이름과 학번은 실제 정보가 아니에요.
        </p>
      </div>
    </main>
  );
}
