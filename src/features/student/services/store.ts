// 학생 기록 저장소 계층. 화면은 이 인터페이스(StudentStore)만 쓴다.
//
// 지금 구현: 브라우저 localStorage (키 접두사 edeltoon:). 같은 브라우저 안에서만 공유되는 임시 저장소다.
// 교체 예정: 서버 저장소가 정해지면 서버 API 담당의 API(제출 저장·해설 공개·학생 기록 조회)로 교체한다.
//   - 제출 저장과 채점은 submitChallenge(ai.ts) 서버 응답이 원본이 되고, 이 저장소는 화면 캐시가 된다.
//   - 인터페이스가 Promise 기반이라 구현만 바꾸면 화면 코드는 그대로 둘 수 있다.
// 키·타입 목록: docs/STUDENT_RECORDS.md
//
// localStorage는 useEffect·이벤트 핸들러 안에서만 호출한다(렌더 중 금지).
import type { Judgment } from '@/types/content';
import {
  RECORD_SCHEMA_VERSION,
  type ChallengeSubmission,
  type Conversation,
  type DirectAnswerAttempt,
  type RetrievalResult,
  type StudentRecords,
} from '@/types/student-records';

/** 작성 중인 챌린지 입력 (제출 전, 새로고침 유지용). 교수 화면은 읽지 않는다 */
export interface DraftAnswer {
  judgment?: Judgment;
  confidence?: number;
  reasoning: string;
  correction: string;
  evidenceId?: string;
  pastedChars: number;
}

export interface ChallengeDraft {
  schemaVersion: number;
  studentId: string;
  challengeId: string;
  startedAt: string;
  updatedAt: string;
  selectedClaimId: string | null;
  answers: Record<string, DraftAnswer>;
}

export interface StudentStore {
  listConversations(studentId: string, courseId: string): Promise<Conversation[]>;
  getConversation(studentId: string, conversationId: string): Promise<Conversation | null>;
  saveConversation(conversation: Conversation): Promise<void>;

  addDirectAnswerAttempt(attempt: DirectAnswerAttempt): Promise<void>;
  listDirectAnswerAttempts(studentId: string): Promise<DirectAnswerAttempt[]>;

  getDraft(studentId: string, challengeId: string): Promise<ChallengeDraft | null>;
  saveDraft(draft: ChallengeDraft): Promise<void>;
  clearDraft(studentId: string, challengeId: string): Promise<void>;

  /** 같은 id가 있으면 교체 (해설 후 설명 저장 등) */
  saveSubmission(submission: ChallengeSubmission): Promise<void>;
  listSubmissions(studentId: string, challengeId?: string): Promise<ChallengeSubmission[]>;
  getLatestSubmission(studentId: string, challengeId: string): Promise<ChallengeSubmission | null>;

  saveRetrieval(result: RetrievalResult): Promise<void>;

  /** 교수 화면용: 학생 한 명의 기록 묶음 */
  readStudentRecords(studentId: string): Promise<StudentRecords>;
  /** 교수 화면용: 기록이 있는 학생 id 목록 */
  listStudentIds(): Promise<string[]>;

  /** 기록이 바뀌면 호출 (같은 탭 + 다른 탭). 해제 함수를 돌려준다 */
  subscribe(listener: () => void): () => void;
  /** 시연 리셋: edeltoon:* 전부 삭제. keepSession이면 세션만 남긴다 */
  resetAll(options?: { keepSession?: boolean }): Promise<void>;
}

/* ───────────── localStorage 구현 ───────────── */

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

  async resetAll(options) {
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

/** 화면이 쓰는 저장소. 서버 저장소로 바꿀 때 이 한 줄을 교체한다 */
export const studentStore: StudentStore = localStudentStore;
