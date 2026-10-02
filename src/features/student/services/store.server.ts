// 저장소 server 구현: 서버 API 담당이 만드는 /api/student/* (Supabase는 서버 쪽만 안다).
// NEXT_PUBLIC_STORE_MODE=server일 때 쓴다. 계약은 store.types.ts "서버 API 계약".
//
// - 호출이 실패하면 StoreError를 던진다. 화면은 message를 그대로 보여준다. local로 몰래 대체하지 않는다.
// - 대화 기록과 제출 전 입력(draft)은 첫 목표에서 브라우저 저장(local 구현)을 그대로 쓴다.
//   대화 기록을 서버로 옮길지는 팀 결정 대기 (docs/STUDENT_RECORDS.md 질문 1).
// - 제출 기록은 제출 API(POST .../submissions)와 해설 후 설명 API(PATCH)가 서버에 저장하므로
//   saveSubmission은 다시 보내지 않는다.
import type { RetrievalResult } from '@/types/student-records';
import {
  demoResetOnServer,
  getStudentRecordsFromServer,
  recordDirectAnswerAttemptToServer,
  saveRetrievalToServer,
} from './serverApi';
import { STORE_CHANGE_EVENT, localStudentStore } from './store.local';
import { StoreError, type ApiError, type StudentStore } from './store.types';

function unwrap<T extends { ok: true }>(res: T | ApiError): T {
  if (!res.ok) throw new StoreError(res.error.code, res.error.message);
  return res;
}

function notifyChange() {
  window.dispatchEvent(new Event(STORE_CHANGE_EVENT));
}

/** 로그인한 학생의 서버 기록. 학생은 쿠키 세션으로 식별되므로 studentId는 확인용으로만 쓴다 */
async function records(studentId: string) {
  const result = unwrap(await getStudentRecordsFromServer()).records;
  if (result.studentId !== studentId) {
    throw new StoreError('SESSION_MISMATCH', '로그인한 계정이 바뀌었어요. 페이지를 새로고침해 주세요.');
  }
  return result;
}

export const serverStudentStore: StudentStore = {
  mode: 'server',

  // 대화 기록: 브라우저 저장 (팀 결정 대기)
  listConversations: (sid, courseId) => localStudentStore.listConversations(sid, courseId),
  getConversation: (sid, id) => localStudentStore.getConversation(sid, id),
  saveConversation: (conversation) => localStudentStore.saveConversation(conversation),

  async addDirectAnswerAttempt(attempt) {
    unwrap(
      await recordDirectAnswerAttemptToServer({
        courseId: attempt.courseId,
        conversationId: attempt.conversationId,
        text: attempt.text,
      }),
    );
    notifyChange();
  },
  async listDirectAnswerAttempts(sid) {
    return (await records(sid)).directAnswerAttempts;
  },

  // 제출 전 입력: 브라우저 저장
  getDraft: (sid, challengeId) => localStudentStore.getDraft(sid, challengeId),
  saveDraft: (draft) => localStudentStore.saveDraft(draft),
  clearDraft: (sid, challengeId) => localStudentStore.clearDraft(sid, challengeId),

  async saveSubmission() {
    // 서버가 제출·해설 후 설명 API에서 이미 저장했다. 화면 갱신만 알린다
    notifyChange();
  },
  async listSubmissions(sid, challengeId) {
    return (await records(sid)).submissions
      .filter((s) => !challengeId || s.challengeId === challengeId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  },
  async getLatestSubmission(sid, challengeId) {
    return (await serverStudentStore.listSubmissions(sid, challengeId))[0] ?? null;
  },

  async saveRetrieval(result: RetrievalResult) {
    unwrap(
      await saveRetrievalToServer({
        courseId: result.courseId,
        challengeId: result.challengeId,
        submissionId: result.submissionId,
        quizId: result.quizId,
        question: result.question,
        answer: result.answer,
        rubric: result.rubric,
        score: result.score,
        feedback: result.feedback,
        submittedAt: result.submittedAt,
      }),
    );
    notifyChange();
  },

  async readStudentRecords(sid) {
    const server = await records(sid);
    // 대화 기록은 아직 브라우저에 있으므로 합쳐서 돌려준다
    const local = await localStudentStore.readStudentRecords(sid);
    return { ...server, conversations: local.conversations };
  },
  async listStudentIds() {
    throw new StoreError('NOT_SUPPORTED', 'server 모드에서는 교수 화면 API로 학생 목록을 조회해요.');
  },

  subscribe: (listener) => localStudentStore.subscribe(listener),

  async resetAll(studentId, options) {
    unwrap(await demoResetOnServer());
    await localStudentStore.resetAll(studentId, options);
  },
};
