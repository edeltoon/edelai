'use client';

import { useState } from 'react';
import { useDemoReset } from './DemoReset';

/** 헤더의 "시연 리셋". 한 번 더 확인한 뒤 이 학생의 기록을 지운다(세션은 남김). 결과 안내는 본문 위에 보인다 */
export function DemoResetButton() {
  const { resetting, reset } = useDemoReset();
  const [confirming, setConfirming] = useState(false);

  async function run() {
    const ok = await reset();
    if (ok) setConfirming(false);
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
      <span className="hidden text-ink-sub md:inline">제출·대화 기록을 모두 지울까요?</span>
      <button
        type="button"
        onClick={run}
        disabled={resetting}
        aria-busy={resetting}
        className="whitespace-nowrap rounded-control border border-sejong px-2 py-1 font-semibold text-sejong disabled:opacity-50"
      >
        {resetting ? '지우는 중…' : '기록 지우기'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={resetting}
        className="whitespace-nowrap rounded-control px-2 py-1 text-ink-sub disabled:opacity-50"
      >
        취소
      </button>
    </span>
  );
}
