'use client';

import { useEffect, useState } from 'react';
import { studentStore } from '../services/store';

/**
 * 저장소에서 값을 읽고, 기록이 바뀌면 다시 읽는다. local·server 모드 모두 같은 Promise 인터페이스.
 * key가 바뀌면(학생·과목 변경) 다시 읽는다. 첫 읽기 전에는 loading: true.
 * 실패하면 error에 메시지를 담는다(server 모드 API 오류 등). 화면은 그대로 보여준다.
 */
export function useStoreQuery<T>(
  key: string | null,
  load: () => Promise<T>,
): { data: T | undefined; loading: boolean; error: string | null } {
  const [state, setState] = useState<{ key: string | null; data: T | undefined; error: string | null }>({
    key: null,
    data: undefined,
    error: null,
  });

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    const run = () => {
      load().then(
        (data) => {
          if (alive) setState({ key, data, error: null });
        },
        (e: unknown) => {
          if (alive) setState({ key, data: undefined, error: e instanceof Error ? e.message : '기록을 불러오지 못했어요.' });
        },
      );
    };
    run();
    const unsubscribe = studentStore.subscribe(run);
    return () => {
      alive = false;
      unsubscribe();
    };
    // load는 key로 식별한다 (호출부에서 매 렌더 새 함수를 만들어도 다시 구독하지 않게)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const fresh = state.key === key;
  return {
    data: fresh ? state.data : undefined,
    loading: key !== null && !fresh,
    error: fresh ? state.error : null,
  };
}
