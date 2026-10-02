'use client';

import { createContext, useContext } from 'react';
import type { Session } from '@/types/session';

// 학생 세션은 서버(src/app/student/layout.tsx)가 로그인 쿠키를 확인해 넘겨준 값만 쓴다.
// localStorage의 edeltoon:session은 화면 호환용으로 남아 있을 수 있지만, 학생 식별·권한에는 쓰지 않는다.

const StudentContext = createContext<Session | null>(null);

export const StudentSessionProvider = StudentContext.Provider;

/** 학생 레이아웃 안에서만 쓴다. 레이아웃이 서버에서 확인한 학생 세션을 내려준다 */
export function useStudent(): Session {
  const session = useContext(StudentContext);
  if (!session) throw new Error('useStudent는 학생 레이아웃 안에서만 쓸 수 있어요');
  return session;
}
