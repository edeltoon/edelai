// 브라우저 localStorage 세션(edeltoon:session) 읽기·쓰기. 화면 표시 호환용이다.
// 로그인·권한·학생 식별은 서버의 HttpOnly 쿠키 세션(src/lib/server/auth.ts)이 기준이고, 이 값은 쓰지 않는다.
// 사용처: 로그인 화면(표시용 저장), 로그아웃(정리), 첫 화면에서 쓰지 않는 역할 선택 데모(src/features/role-select).
// localStorage는 렌더 중이 아니라 useEffect·이벤트 핸들러 안에서만 호출한다.
import type { Role, Session } from '@/types/session';

export const SESSION_KEY = 'edeltoon:session';
/** 같은 탭 안에서 세션이 바뀌었음을 알리는 이벤트 이름 */
export const SESSION_CHANGE_EVENT = 'edeltoon:session-change';

/** 역할 선택 화면에서 쓰는 가상 계정 */
export const DEMO_ACCOUNTS: Record<Role, Omit<Session, 'signedInAt'>> = {
  student: { role: 'student', userId: 's1', name: '김동하', memberNo: '26011225', major: '철학과' },
  // 교수 담당 확인 필요: 교수 화면에서 쓸 id·이름·교번은 임시값
  professor: { role: 'professor', userId: 'p1', name: '담당 교수', memberNo: 'PROF-DEMO' },
};

/** 역할별 첫 화면 경로 */
export const HOME_PATH: Record<Role, string> = {
  student: '/student',
  professor: '/professor',
};

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.role === 'student' || v.role === 'professor') &&
    typeof v.userId === 'string' &&
    typeof v.name === 'string' &&
    typeof v.memberNo === 'string' &&
    typeof v.signedInAt === 'string'
  );
}

/** 저장 문자열을 세션으로 해석. 없거나 형식이 깨졌으면 null */
export function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** 저장된 세션. 없거나 형식이 깨졌으면 null */
export function readSession(): Session | null {
  try {
    return parseSession(window.localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

/** useSyncExternalStore용 구독: 같은 탭(SESSION_CHANGE_EVENT)과 다른 탭(storage) 변경 */
export function subscribeSession(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === SESSION_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(SESSION_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(SESSION_CHANGE_EVENT, onChange);
  };
}

/** useSyncExternalStore용 스냅샷: 저장 문자열 그대로 (같은 값이면 다시 렌더하지 않음) */
export function getSessionSnapshot(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

/** 역할을 고르면 해당 가상 계정으로 세션을 만든다 */
export function startSession(role: Role): Session {
  const session: Session = { ...DEMO_ACCOUNTS[role], signedInAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // 저장이 막힌 브라우저(사생활 보호 모드 등)에서도 이동은 계속한다
  }
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  return session;
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // 무시
  }
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}
