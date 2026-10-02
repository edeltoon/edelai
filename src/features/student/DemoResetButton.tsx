'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { studentStore } from './services/store';
import { studentRoutes } from './routes';
import { PHIL_COURSE_ID } from './content/courses';

/** 헤더의 "시연 리셋". 한 번 더 확인한 뒤 edeltoon:* 기록을 지운다(세션은 남김) */
export function DemoResetButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function reset() {
    setBusy(true);
    await studentStore.resetAll({ keepSession: true });
    setBusy(false);
    setConfirming(false);
    router.push(studentRoutes.freeStudy(PHIL_COURSE_ID));
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="whitespace-nowrap rounded-control px-2 py-1 text-caption text-ink-sub hover:text-ink"
      >
        시연 리셋
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1 text-caption" role="group" aria-label="시연 리셋 확인">
      <span className="hidden text-ink-sub md:inline">대화·제출 기록을 모두 지울까요?</span>
      <button
        type="button"
        onClick={reset}
        disabled={busy}
        className="rounded-control border border-sejong px-2 py-1 font-semibold text-sejong"
      >
        기록 지우기
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="rounded-control px-2 py-1 text-ink-sub">
        취소
      </button>
    </span>
  );
}
