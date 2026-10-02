'use client';

import { createContext, useContext, useSyncExternalStore } from 'react';
import { getSessionSnapshot, parseSession, subscribeSession } from '@/lib/session';
import type { Session } from '@/types/session';

/** 서버 렌더·하이드레이션 중임을 나타내는 스냅샷 (localStorage를 아직 못 읽음) */
const SERVER_SNAPSHOT = '__server__';

export type SessionState = { status: 'loading' } | { status: 'none' } | { status: 'ready'; session: Session };

/** 저장된 세션 상태. 렌더 중 localStorage를 직접 읽지 않고 useSyncExternalStore로 구독한다 */
export function useSessionState(): SessionState {
  const raw = useSyncExternalStore(subscribeSession, getSessionSnapshot, () => SERVER_SNAPSHOT);
  if (raw === SERVER_SNAPSHOT) return { status: 'loading' };
  const session = parseSession(raw);
  return session ? { status: 'ready', session } : { status: 'none' };
}

const StudentContext = createContext<Session | null>(null);

export const StudentSessionProvider = StudentContext.Provider;

/** 학생 레이아웃 안에서만 쓴다. 레이아웃이 학생 세션을 확인한 뒤 내려준다 */
export function useStudent(): Session {
  const session = useContext(StudentContext);
  if (!session) throw new Error('useStudent는 학생 레이아웃 안에서만 쓸 수 있어요');
  return session;
}
