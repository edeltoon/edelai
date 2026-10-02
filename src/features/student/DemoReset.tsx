'use client';

import { useRouter } from 'next/navigation';
import { createContext, Fragment, useCallback, useContext, useState, type ReactNode } from 'react';
import { STORE_MODE, studentStore } from './services/store';

// 시연 리셋 흐름 (헤더 버튼 → 기록 삭제 → 화면 다시 불러오기 → 결과 안내)
// 1) 본문을 잠시 내린다: 작성 중이던 임시 답안 자동 저장이 리셋 "전에" 끝나게 해서, 지운 뒤 다시 써지지 않게 한다
// 2) studentStore.resetAll: server 모드는 POST /api/student/demo-reset(제출·직행 시도·재인출 삭제, 시연 카드 pending)
//    성공 후 이 브라우저의 대화·임시 답안을 지운다. local 모드는 브라우저 기록만 지운다
// 3) 본문을 새 key로 다시 올려 모든 화면이 기록을 처음부터 다시 읽게 하고, 성공·실패를 안내한다

type Notice = { tone: 'ok' | 'error'; text: string };

interface DemoResetValue {
  resetting: boolean;
  reset: () => Promise<boolean>;
}

const DemoResetContext = createContext<DemoResetValue | null>(null);
const DemoResetView = createContext<{ epoch: number; resetting: boolean; notice: Notice | null; dismiss: () => void } | null>(null);

const OK_TEXT =
  STORE_MODE === 'server'
    ? '시연 리셋을 마쳤어요. 서버의 제출·정답 직행·재인출 기록을 지우고 오류 카드를 승인 대기로 되돌렸어요. 이 브라우저의 대화와 임시 답안도 지웠어요.'
    : '시연 리셋을 마쳤어요. 이 브라우저의 기록을 지웠어요. local 모드라 서버 기록은 바뀌지 않아요.';

const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function DemoResetProvider({ studentId, children }: { studentId: string; children: ReactNode }) {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);

  const reset = useCallback(async () => {
    setNotice(null);
    setResetting(true);
    await nextTick(); // 본문이 내려가며 남은 자동 저장을 마친 뒤 지운다
    let ok = false;
    try {
      await studentStore.resetAll(studentId, { keepSession: true });
      setNotice({ tone: 'ok', text: OK_TEXT });
      ok = true;
    } catch (e) {
      const message = e instanceof Error ? e.message : '알 수 없는 오류가 났어요.';
      setNotice({ tone: 'error', text: `시연 리셋에 실패했어요. ${message} 기록은 지워지지 않았어요. 다시 시도해 주세요.` });
    } finally {
      setEpoch((n) => n + 1);
      setResetting(false);
      router.refresh();
    }
    return ok;
  }, [router, studentId]);

  const dismiss = useCallback(() => setNotice(null), []);

  return (
    <DemoResetContext.Provider value={{ resetting, reset }}>
      <DemoResetView.Provider value={{ epoch, resetting, notice, dismiss }}>{children}</DemoResetView.Provider>
    </DemoResetContext.Provider>
  );
}

export function useDemoReset(): DemoResetValue {
  const value = useContext(DemoResetContext);
  if (!value) throw new Error('useDemoReset은 DemoResetProvider 안에서만 쓸 수 있어요');
  return value;
}

/** 학생 본문: 리셋 결과 안내 + 리셋할 때마다 새로 올리는 화면 */
export function DemoResetContent({ children }: { children: ReactNode }) {
  const view = useContext(DemoResetView);
  if (!view) throw new Error('DemoResetContent는 DemoResetProvider 안에서만 쓸 수 있어요');
  const { epoch, resetting, notice, dismiss } = view;
  return (
    <>
      {notice && (
        <div
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={`mx-4 mt-4 flex items-start justify-between gap-3 rounded-block px-4 py-3 text-body sm:mx-8 ${
            notice.tone === 'error' ? 'bg-wrong-bg text-wrong' : 'bg-correct-bg text-correct'
          }`}
        >
          <p>{notice.text}</p>
          <button type="button" onClick={dismiss} className="shrink-0 text-caption underline-offset-2 hover:underline">
            닫기
          </button>
        </div>
      )}
      {resetting ? (
        <p className="px-8 py-10 text-body text-ink-sub" role="status">
          시연 기록을 지우고 있어요…
        </p>
      ) : (
        <Fragment key={epoch}>{children}</Fragment>
      )}
    </>
  );
}
