// 학생 화면 저장소 인터페이스와 학생 서버 API 계약 (Supabase + 서버 API 라우트 기준).
//
// 저장은 Supabase(Postgres)로 확정됐고, DB 접근은 서버 API 담당이 만드는 src/app/api/** 라우트에서만 한다.
// 학생 화면은 DB를 모르고 StudentStore 인터페이스만 쓴다. 구현은 NEXT_PUBLIC_STORE_MODE로 고른다.
//   local  (기본): store.local.ts. localStorage + 학생 화면 mock 채점. 노트북 한 대 시연용으로 끝까지 유지
//   server       : store.server.ts. 아래 계약의 /api/student/* 를 호출. 실패는 오류로 보여주고 local로 대체하지 않음
//
// 이 파일의 "서버 API 계약"은 학생 API(/api/student/*)의 형태다. Supabase와 학생 API는 학생 화면 담당이
// feat/supabase에서 구현한다(교수 API는 교수 담당이 같은 DB 계층으로 만든다).
// 학생 식별: 실제 인증이 없으므로 세션의 userId(예: 's1')를 GET은 쿼리, POST/PATCH는 본문으로 보낸다.
//           인증이 생기면 서버가 세션에서 꺼내고 이 필드는 무시해도 된다.
// 오류 형식: /api/chat과 같다. HTTP 상태 코드 + { ok: false, error: { code, message } }
import type {
  ChallengeSubmission,
  ClaimAnswer,
  Conversation,
  DirectAnswerAttempt,
  RetrievalCriterion,
  RetrievalResult,
  StudentRecords,
} from '@/types/student-records';
import type { Judgment } from '@/types/content';

export type ApiError = { ok: false; error: { code: string; message: string } };

/* ═══════════════ 1. 저장소 인터페이스 (화면은 이것만 쓴다) ═══════════════ */

/** 작성 중인 챌린지 입력 (제출 전, 새로고침 유지용). 교수 화면은 읽지 않는다. 두 모드 모두 브라우저에만 저장 */
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

/** 저장소 호출 실패. 화면은 message를 그대로 보여준다 */
export class StoreError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'StoreError';
  }
}

export interface StudentStore {
  readonly mode: 'local' | 'server';

  /* 대화 기록: 첫 목표에서는 두 모드 모두 브라우저 저장 (서버 저장 여부는 팀 결정 대기) */
  listConversations(studentId: string, courseId: string): Promise<Conversation[]>;
  getConversation(studentId: string, conversationId: string): Promise<Conversation | null>;
  saveConversation(conversation: Conversation): Promise<void>;

  /* 정답 직행 시도: server 모드는 POST /api/student/direct-answer-attempts */
  addDirectAnswerAttempt(attempt: DirectAnswerAttempt): Promise<void>;
  listDirectAnswerAttempts(studentId: string): Promise<DirectAnswerAttempt[]>;

  /* 제출 전 입력: 두 모드 모두 브라우저 저장 */
  getDraft(studentId: string, challengeId: string): Promise<ChallengeDraft | null>;
  saveDraft(draft: ChallengeDraft): Promise<void>;
  clearDraft(studentId: string, challengeId: string): Promise<void>;

  /**
   * 채점이 끝난 제출 기록을 보관. local 모드는 localStorage에 쓴다.
   * server 모드는 제출 API(POST .../submissions)와 해설 후 설명 API(PATCH)가 이미 서버에 저장하므로 다시 보내지 않는다.
   */
  saveSubmission(submission: ChallengeSubmission): Promise<void>;
  listSubmissions(studentId: string, challengeId?: string): Promise<ChallengeSubmission[]>;
  getLatestSubmission(studentId: string, challengeId: string): Promise<ChallengeSubmission | null>;

  /* 재인출 결과: server 모드는 POST /api/student/retrievals */
  saveRetrieval(result: RetrievalResult): Promise<void>;

  /** 학생 한 명의 기록 묶음 (local 모드에서는 교수 화면도 이걸로 읽을 수 있음) */
  readStudentRecords(studentId: string): Promise<StudentRecords>;
  /** 기록이 있는 학생 id 목록. local 모드 전용 (server 모드는 교수 화면 API를 쓴다) */
  listStudentIds(): Promise<string[]>;

  /** 이 브라우저에서 기록이 바뀌면 호출. 해제 함수를 돌려준다 */
  subscribe(listener: () => void): () => void;
  /** 시연 리셋. 학생 기록을 지운다. keepSession이면 세션은 남긴다 */
  resetAll(studentId: string, options?: { keepSession?: boolean }): Promise<void>;
}

/* ═══════════════ 2. 서버 API 계약 (초안, 서버 API 담당 구현 요청) ═══════════════ */

export const studentApi = {
  /** GET    챌린지 조회 (교수 승인 오류 카드로 만든 것만) */
  challenge: (challengeId: string) => `/api/student/challenges/${encodeURIComponent(challengeId)}`,
  /** POST   제출 저장 + 채점 + 해설 공개 */
  submissions: (challengeId: string) => `/api/student/challenges/${encodeURIComponent(challengeId)}/submissions`,
  /** PATCH  해설 후 내 설명 수정 */
  submission: (submissionId: string) => `/api/student/submissions/${encodeURIComponent(submissionId)}`,
  /** GET    학생 기록 조회 */
  records: () => '/api/student/records',
  /** POST   정답 직행 시도 기록 */
  directAnswerAttempts: () => '/api/student/direct-answer-attempts',
  /** POST   재인출 결과 저장 */
  retrievals: () => '/api/student/retrievals',
  /** POST   시연 리셋 (이 학생의 기록 삭제) */
  demoReset: () => '/api/student/demo-reset',
} as const;

/* ── 2-1. GET /api/student/challenges/{challengeId}?userId=s1 ── */

/** 학생에게 보내는 주장. 오류 여부·오류 카드 id는 절대 포함하지 않는다 */
export interface ChallengeClaimPublic {
  id: string;
  /** 화면 표시용 순서 라벨 (A, B, C…). 주장 순서는 오류 여부와 무관하게 고정 */
  label: string;
  text: string;
}

export interface EvidenceOption {
  id: string;
  /** 예: "3주차 강의자료 · p.12" */
  label: string;
  /** 예: "동굴의 비유" */
  topic: string;
}

/**
 * 교수가 승인(approvalStatus === 'approved')한 오류 카드로 만든 챌린지만 내려준다.
 * 오류 개수(errorCount)만 있고 어떤 주장이 오류인지는 없다.
 * 오류: 404 CHALLENGE_NOT_FOUND, 409 CHALLENGE_NOT_APPROVED
 */
export interface ChallengePublic {
  id: string;
  courseId: string;
  conceptId: string;
  conceptName: string;
  title: string;
  /** 이 답변을 만든 학생 질문 */
  question: string;
  errorCount: number;
  claims: ChallengeClaimPublic[];
  evidenceOptions: EvidenceOption[];
}

export type GetChallengeResponse = { ok: true; challenge: ChallengePublic } | ApiError;

/* ── 2-2. POST /api/student/challenges/{challengeId}/submissions ── */

/** 모든 주장의 판정·확신도·본인 생각이 채워진 경우에만 보낸다(화면에서 막고, 서버도 400 INCOMPLETE_SUBMISSION) */
export interface SubmitChallengeRequest {
  userId: string;
  courseId: string;
  /** 주장 순서대로. claimId는 ChallengePublic.claims[].id */
  answers: ClaimAnswer[];
  /** 직전 제출 이후 같은 과목의 정답 직행 시도 여부 */
  directAnswerFlag: boolean;
  /** 챌린지 화면에 처음 들어온 시각 (ISO) */
  startedAt: string;
}

/**
 * 서버가 채점하고 저장한 뒤 제출 기록 전체를 돌려준다(이때 처음으로 정답·해설 포함).
 * 채점 규칙(src/lib 순수 함수를 그대로 쓰면 학생 화면 local 모드와 결과가 같다):
 * - 판정 정오(규칙): 오류 주장이면 'wrong', 아니면 'correct'가 정답
 * - 본인 생각 0~2, 올바른 개념 0~2: AI 평가(Claude). AI 채점이 실패해도 제출 전체를 실패시키지 않는다.
 *   규칙 기반 점수(판정·근거·과정 감점)는 저장하고, 실패한 AI 항목만 null + pendingReview에 넣어 "교수 채점 대기"로 둔다.
 *   (키워드 점수로 조용히 대체하지 않는다)
 *   단, 오탐(맞는 주장을 '틀리다')인 주장의 본인 생각 점수는 0 (scoring.claimReasoningScore)
 * - 근거 0/2(규칙): evidenceId === 오류 카드 evidenceId
 * - 합계: scoring.judgmentPoint / reasoningPoint / errorClaimPoint / processPenalty / totalScore
 * - 보정: calibration.calibrationAccuracy, 오탐 수: scoring.countFalseAlarms
 * - 재인출 예약: schedule.retrievalDate(submittedAt)
 * - submission.grader = 'server'
 */
export type SubmitChallengeResponse = { ok: true; submission: ChallengeSubmission } | ApiError;

/* ── 2-3. PATCH /api/student/submissions/{submissionId} ── */

export interface SaveAfterExplanationRequest {
  userId: string;
  /** 해설 후 내 설명 (1~1,000자) */
  afterExplanation: string;
}

export type SaveAfterExplanationResponse = { ok: true; submission: ChallengeSubmission } | ApiError;

/* ── 2-4. GET /api/student/records?userId=s1 ── */

/** 서버에 있는 기록만 담는다. 대화 기록(conversations)은 서버 저장이 정해지기 전까지 빈 배열이어도 된다 */
export type GetStudentRecordsResponse = { ok: true; records: StudentRecords } | ApiError;

/* ── 2-5. POST /api/student/direct-answer-attempts ── */

export interface RecordDirectAnswerAttemptRequest {
  userId: string;
  courseId: string;
  conversationId: string;
  /** 학생이 입력한 원문 (교수 원문 열람용) */
  text: string;
  /** 걸린 표현. 예: '정답 번호' */
  matched: string;
  at: string;
}

export type RecordDirectAnswerAttemptResponse = { ok: true; attempt: DirectAnswerAttempt } | ApiError;

/* ── 2-6. POST /api/student/retrievals (첫 목표 이후) ── */

export interface SaveRetrievalRequest {
  userId: string;
  courseId: string;
  challengeId: string;
  submissionId: string;
  quizId: string;
  question: string;
  answer: string;
  rubric: RetrievalCriterion[];
  score: number;
  feedback: string;
  submittedAt: string;
}

export type SaveRetrievalResponse = { ok: true; retrieval: RetrievalResult } | ApiError;

/* ── 2-7. POST /api/student/demo-reset ── */

export interface DemoResetRequest {
  userId: string;
}

export type DemoResetResponse = { ok: true } | ApiError;
