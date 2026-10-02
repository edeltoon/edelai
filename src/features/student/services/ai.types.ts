// 학생 화면 ↔ 서버 API 요청·응답 타입.
//
// 1) 자유 학습: 구현됨. POST /api/chat (docs/API.md, src/types/chat.ts) 형식을 그대로 쓴다.
// 2) 검증 챌린지: 계약 초안. 서버 API 담당에게 "이 형태로 만들어 달라"고 요청하는 문서 역할이다.
//    서버가 생기기 전에는 services/ai.mock.ts가 같은 형태로 응답한다(시연용 예시 채점).
//
// 공통 오류 형식은 /api/chat과 같다: { ok: false, error: { code, message } }
import type { ChatMessage } from '@/types/chat';
import type { ChallengeSubmission, ClaimAnswer } from '@/types/student-records';

export type ApiError = { ok: false; error: { code: string; message: string } };

/* ───────────── 1. 자유 학습 (POST /api/chat, 구현됨) ───────────── */

export interface AskTutorInput {
  courseId: 'phil';
  /** 이번 질문 (1~4,000자) */
  message: string;
  /** 이전 대화. user/model 순서의 완료된 쌍, 최근 5쌍까지 (ai.ts가 잘라서 보낸다) */
  history: ChatMessage[];
}

export type AskTutorResult =
  | { ok: true; reply: string; model: string }
  | { ok: false; status: number | null; code: string; message: string };

/* ───────────── 2. 검증 챌린지 (계약 초안) ───────────── */

/** 학생에게 보내는 주장. 오류 여부·오류 카드 id는 절대 포함하지 않는다 */
export interface ChallengeClaimPublic {
  id: string;
  /** 화면 표시용 순서 라벨. 주장 순서는 오류 여부와 무관하게 고정 */
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
 * GET /api/challenges/{challengeId}?studentId=s1
 * → { ok: true, challenge: ChallengePublic } | ApiError
 * 교수 승인(approvalStatus === 'approved')된 오류 카드로 만든 챌린지만 내려준다.
 * 응답에는 오류 개수(errorCount)만 있고, 어떤 주장이 오류인지는 없다.
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

/**
 * POST /api/challenges/{challengeId}/submissions
 * 모든 주장의 판정·확신도·본인 생각이 채워진 경우에만 보낸다(화면에서 막고, 서버도 검증해 400).
 */
export interface SubmitChallengeRequest {
  studentId: string;
  courseId: string;
  /** 주장 순서대로. claimId는 ChallengePublic.claims[].id */
  answers: ClaimAnswer[];
  /** 직전 제출 이후 같은 과목의 정답 직행 시도 여부 (학생 화면이 기록에서 계산해 보낸다) */
  directAnswerFlag: boolean;
  /** 챌린지 화면에 처음 들어온 시각 (ISO) */
  startedAt: string;
}

/**
 * → { ok: true, submission: ChallengeSubmission } | ApiError
 *
 * 서버 채점 규칙 (src/lib 순수 함수를 그대로 쓰면 학생 화면 mock과 결과가 같다):
 * - 판정 정오: 규칙 기반. 오류 주장이면 'wrong', 아니면 'correct'가 정답.
 * - 본인 생각 0~2, 올바른 개념 0~2: AI 평가 (Claude). 실패 시 오류로 응답하고 키워드 점수로 조용히 대체하지 않는다.
 *   단, 맞는 주장을 '틀리다'로 판정한 오탐 주장의 본인 생각 점수는 0 (scoring.claimReasoningScore).
 *   오탐 수는 submission.falseAlarms (scoring.countFalseAlarms).
 * - 근거 0/2: 선택한 evidenceId === 오류 카드 evidenceId (규칙).
 * - 합계: scoring.judgmentPoint / reasoningPoint / errorClaimPoint / processPenalty / totalScore.
 * - 확신도 보정: calibration.calibrationAccuracy.
 * - 재인출 예약: schedule.retrievalDate(submittedAt).
 * - 응답 submission.grader = 'server'. 제출이 끝난 뒤에만 claimGrades·errorReveals(정답·해설)를 담는다.
 */
export type SubmitChallengeResponse = { ok: true; submission: ChallengeSubmission } | ApiError;

/**
 * PATCH /api/submissions/{submissionId}
 * body: { afterExplanation: string }  (해설 후 내 설명, 1~1,000자)
 * → { ok: true, submission: ChallengeSubmission } | ApiError
 */
export interface SaveAfterExplanationRequest {
  afterExplanation: string;
}

export type SaveAfterExplanationResponse = { ok: true; submission: ChallengeSubmission } | ApiError;
