// 저장소 local 구현: 브라우저 localStorage (키 접두사 edeltoon:).
// NEXT_PUBLIC_STORE_MODE=local(기본)일 때 쓴다. 서버 없이 노트북 한 대로 시연할 수 있도록 끝까지 유지한다.
// 같은 브라우저 안에서만 공유된다(교수 화면도 같은 브라우저에서만 읽을 수 있음).
// server 모드에서도 대화 기록·제출 전 입력(draft)은 이 구현을 쓴다(store.server.ts 참고).
// localStorage는 useEffect·이벤트 핸들러 안에서만 호출한다(렌더 중 금지).
import {
  RECORD_SCHEMA_VERSION,
  type ChallengeSubmission,
  type Conversation,
  type DirectAnswerAttempt,
  type RetrievalResult,
} from '@/types/student-records';
import type { ChallengeDraft, StudentStore } from './store.types';

export const STORE_PREFIX = 'edeltoon:';
export const STORE_CHANGE_EVENT = 'edeltoon:store-change';

export const storeKeys = {
  studentIndex: () => `${STORE_PREFIX}student-index`,
  conversations: (sid: string) => `${STORE_PREFIX}student:${sid}:conversations`,
  directAnswerAttempts: (sid: string) => `${STORE_PREFIX}student:${sid}:direct-answer-attempts`,
  drafts: (sid: string) => `${STORE_PREFIX}student:${sid}:drafts`,
  submissions: (sid: string) => `${STORE_PREFIX}student:${sid}:submissions`,
  retrievals: (sid: string) => `${STORE_PREFIX}student:${sid}:retrievals`,
} as const;

const SESSION_KEY = `${STORE_PREFIX}session`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 용량 초과·저장 차단: 화면 동작은 계속하고 저장만 건너뛴다
  }
  window.dispatchEvent(new Event(STORE_CHANGE_EVENT));
}

function touchStudent(sid: string): void {
  const ids = read<string[]>(storeKeys.studentIndex(), []);
  if (!ids.includes(sid)) write(storeKeys.studentIndex(), [...ids, sid]);
}

const byNewest = (a: { updatedAt?: string; submittedAt?: string }, b: { updatedAt?: string; submittedAt?: string }) =>
  (b.updatedAt ?? b.submittedAt ?? '').localeCompare(a.updatedAt ?? a.submittedAt ?? '');

export const localStudentStore: StudentStore = {
  mode: 'local',

  async listConversations(sid, courseId) {
    return read<Conversation[]>(storeKeys.conversations(sid), [])
      .filter((c) => c.courseId === courseId)
      .sort(byNewest);
  },
  async getConversation(sid, id) {
    return read<Conversation[]>(storeKeys.conversations(sid), []).find((c) => c.id === id) ?? null;
  },
  async saveConversation(conversation) {
    const sid = conversation.studentId;
    const list = read<Conversation[]>(storeKeys.conversations(sid), []).filter((c) => c.id !== conversation.id);
    write(storeKeys.conversations(sid), [...list, conversation]);
    touchStudent(sid);
  },

  async addDirectAnswerAttempt(attempt) {
    const sid = attempt.studentId;
    write(storeKeys.directAnswerAttempts(sid), [...read<DirectAnswerAttempt[]>(storeKeys.directAnswerAttempts(sid), []), attempt]);
    touchStudent(sid);
  },
  async listDirectAnswerAttempts(sid) {
    return read<DirectAnswerAttempt[]>(storeKeys.directAnswerAttempts(sid), []);
  },

  async getDraft(sid, challengeId) {
    const draft = read<Record<string, ChallengeDraft>>(storeKeys.drafts(sid), {})[challengeId];
    return draft && draft.schemaVersion === RECORD_SCHEMA_VERSION ? draft : null;
  },
  async saveDraft(draft) {
    const all = read<Record<string, ChallengeDraft>>(storeKeys.drafts(draft.studentId), {});
    write(storeKeys.drafts(draft.studentId), { ...all, [draft.challengeId]: draft });
  },
  async clearDraft(sid, challengeId) {
    const all = read<Record<string, ChallengeDraft>>(storeKeys.drafts(sid), {});
    delete all[challengeId];
    write(storeKeys.drafts(sid), all);
  },

  async saveSubmission(submission) {
    const sid = submission.studentId;
    const list = read<ChallengeSubmission[]>(storeKeys.submissions(sid), []).filter((s) => s.id !== submission.id);
    write(storeKeys.submissions(sid), [...list, submission]);
    touchStudent(sid);
  },
  async listSubmissions(sid, challengeId) {
    return read<ChallengeSubmission[]>(storeKeys.submissions(sid), [])
      .filter((s) => !challengeId || s.challengeId === challengeId)
      .sort(byNewest);
  },
  async getLatestSubmission(sid, challengeId) {
    return (await localStudentStore.listSubmissions(sid, challengeId))[0] ?? null;
  },

  async saveRetrieval(result) {
    const sid = result.studentId;
    const list = read<RetrievalResult[]>(storeKeys.retrievals(sid), []).filter((r) => r.id !== result.id);
    write(storeKeys.retrievals(sid), [...list, result]);
    touchStudent(sid);
  },

  async readStudentRecords(sid) {
    return {
      studentId: sid,
      conversations: read<Conversation[]>(storeKeys.conversations(sid), []),
      directAnswerAttempts: read<DirectAnswerAttempt[]>(storeKeys.directAnswerAttempts(sid), []),
      submissions: read<ChallengeSubmission[]>(storeKeys.submissions(sid), []),
      retrievals: read<RetrievalResult[]>(storeKeys.retrievals(sid), []),
    };
  },
  async listStudentIds() {
    return read<string[]>(storeKeys.studentIndex(), []);
  },

  subscribe(listener) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith(STORE_PREFIX)) listener();
    };
    window.addEventListener(STORE_CHANGE_EVENT, listener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(STORE_CHANGE_EVENT, listener);
      window.removeEventListener('storage', onStorage);
    };
  },

  async resetAll(_studentId, options) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k?.startsWith(STORE_PREFIX) && !(options?.keepSession && k === SESSION_KEY)) keys.push(k);
      }
      keys.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // 무시
    }
    window.dispatchEvent(new Event(STORE_CHANGE_EVENT));
  },
};
