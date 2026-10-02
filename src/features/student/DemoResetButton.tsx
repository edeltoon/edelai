'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { studentStore } from './services/store';
import { studentRoutes } from './routes';
import { PHIL_COURSE_ID } from './content/courses';
import { useStudent } from './StudentSession';

/** 헤더의 "시연 리셋". 한 번 더 확인한 뒤 이 학생의 기록을 지운다(세션은 남김) */
export function DemoResetButton() {
  const router = useRouter();
  const student = useStudent();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      await studentStore.resetAll(student.userId, { keepSession: true });
      setConfirming(false);
      router.push(studentRoutes.freeStudy(PHIL_COURSE_ID));
    } catch (e) {
      setError(e instanceof Error ? e.message : '기록을 지우지 못했어요.');
    } finally {
      setBusy(false);
    }
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
      <span className={`hidden md:inline ${error ? 'text-wrong' : 'text-ink-sub'}`} role={error ? 'alert' : undefined}>
        {error ?? '대화·제출 기록을 모두 지울까요?'}
      </span>
      <button
        type="button"
        onClick={reset}
        disabled={busy}
        className="whitespace-nowrap rounded-control border border-sejong px-2 py-1 font-semibold text-sejong"
      >
        {error ? '다시 지우기' : '기록 지우기'}
      </button>
      <button
        type="button"
        onClick={() => {
          setConfirming(false);
          setError(null);
        }}
        className="whitespace-nowrap rounded-control px-2 py-1 text-ink-sub"
      >
        취소
      </button>
    </span>
  );
}
