// DB 계층 타입: 테이블 행(snake_case)과 서버가 쓰는 도메인 타입.
// 행 → 도메인 변환은 mappers.ts. 정답 정보(ChallengeAnswerKey)는 서버 전용이다.
import type { ChallengeClaimPublic, EvidenceOption } from '@/types/challenge';
import type { ErrorType } from '@/types/content';
import type { ReviewCard } from '@/types/professor-cards';
import type {
  ChallengeSubmission,
  ClaimAnswer,
  ClaimGrade,
  ErrorReveal,
  RetrievalCriterion,
  ScoreBreakdown,
} from '@/types/student-records';

/* ───────────── 도메인 타입 ───────────── */

export interface Student {
  id: string;
  name: string;
  memberNo: string;
  major: string | null;
}

/**
 * DB에 저장된 오류 카드. PR #5의 ReviewCard에 DB 전용 필드를 더한 모양.
 * ReviewCard와 다른 점 (교수 담당 확인 필요):
 * - courseId: ReviewCard에 없음 (생성 API 입력의 courseId)
 * - evidenceId: DB는 null 허용. 없으면 ''로 돌려준다
 * - source·sourceTitle·sourceExcerpt: DB는 source jsonb 하나에 저장
 * - approvedAt·createdAt·updatedAt: ReviewCard에 없음
 */
export type ErrorCardRecord = ReviewCard & {
  courseId: string;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** 서버 채점 전용 정답 키 (challenge_keys.answer_key). 학생 응답으로 내보내지 않는다 */
export interface ChallengeAnswerKey {
  /** 본인 생각 키워드 규칙 점수에 쓰는 개념 키워드 */
  reasonKeywords: string[];
  claims: {
    claimId: string;
    isError: boolean;
    /** 해설: 제출 후에만 공개 */
    explanation: string;
    /** 오류 주장이면 교수 승인 오류 카드 id */
    errorCardId?: string;
  }[];
}

/** 교수 조정·확정 (교수 담당 확인 필요) */
export interface ProfessorReview {
  /** 교수가 조정한 점수. null이면 AI·규칙 점수 그대로 */
  professorScore: ScoreBreakdown | null;
  professorComment: string | null;
  finalizedBy: string | null;
  finalizedAt: string | null;
}

/** DB에 저장된 제출 = 학생 기록 타입 + 교수 조정·확정 */
export type SubmissionRecord = ChallengeSubmission & ProfessorReview & { updatedAt: string };

/* ───────────── 테이블 행 (0001_init.sql) ───────────── */

export interface StudentRow {
  id: string;
  name: string;
  member_no: string;
  major: string | null;
  created_at: string;
}

export interface ErrorCardSourceJson {
  source?: 'claude';
  sourceTitle?: string;
  sourceExcerpt?: string;
}

export interface ErrorCardRow {
  id: string;
  course_id: string;
  concept_id: string;
  title: string;
  wrong_claim: string;
  correct_claim: string;
  correct_keywords: string[];
  evidence_id: string | null;
  evidence: string | null;
  source: ErrorCardSourceJson | null;
  error_type: ErrorType;
  difficulty: '하' | '중' | '상';
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengePublicJson {
  conceptName: string;
  claims: ChallengeClaimPublic[];
  evidenceOptions: EvidenceOption[];
}

export interface ChallengeRow {
  id: string;
  course_id: string;
  concept_id: string;
  title: string;
  question: string;
  error_count: number;
  public: ChallengePublicJson;
  created_at: string;
  updated_at: string;
}

export interface ChallengeKeyRow {
  challenge_id: string;
  answer_key: ChallengeAnswerKey;
}

export interface SubmissionRow {
  id: string;
  schema_version: number;
  student_id: string;
  course_id: string;
  challenge_id: string;
  concept_id: string;
  submitted_at: string;
  grader: 'mock' | 'server';
  answers: ClaimAnswer[];
  score: ScoreBreakdown;
  total: number;
  calibration: number;
  false_alarms: number;
  pending_review: ('reasoning' | 'concept')[];
  direct_answer_flag: boolean;
  pasted_ratio: number;
  claim_grades: ClaimGrade[];
  error_reveals: ErrorReveal[];
  before_summary: string;
  after_explanation: string | null;
  after_explained_at: string | null;
  retrieval_scheduled_at: string;
  professor_score: ScoreBreakdown | null;
  professor_comment: string | null;
  finalized_by: string | null;
  finalized_at: string | null;
  updated_at: string;
}

export interface DirectAnswerAttemptRow {
  id: string;
  student_id: string;
  course_id: string;
  conversation_id: string;
  text: string;
  matched: string;
  at: string;
}

export interface RetrievalRow {
  id: string;
  schema_version: number;
  student_id: string;
  course_id: string;
  challenge_id: string;
  submission_id: string | null;
  quiz_id: string;
  question: string;
  answer: string;
  rubric: RetrievalCriterion[];
  score: number;
  feedback: string;
  submitted_at: string;
}
