// 학생 기록 타입 (초안). 학생 화면이 저장하고 교수 화면이 읽는다.
// 저장 키와 교체 계획은 docs/STUDENT_RECORDS.md (학생 화면 PR에서 추가).
// 서버 API의 ChatMessage(src/types/chat.ts)와 구분하려고 대화 메시지는 ConversationMessage로 부른다.

import type { ErrorType, Judgment } from './content';

export const RECORD_SCHEMA_VERSION = 1;

export interface ConceptCardView {
  term: string;
  gloss: string;
}

export interface CitationView {
  evidenceId: string;
  label: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'ai' | 'notice';
  text: string;
  at: string; // ISO
  concepts?: ConceptCardView[];
  citations?: CitationView[];
  /** AI 답변 아래 "검증 챌린지 시작" 배너가 가리키는 챌린지 */
  suggestChallengeId?: string;
  /** role === 'notice'이고 정답 직행 요청으로 답 대신 안내한 경우 */
  directAnswer?: { matched: string };
}

export interface Conversation {
  id: string;
  studentId: string;
  courseId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
}

export interface DirectAnswerAttempt {
  id: string;
  studentId: string;
  courseId: string;
  conversationId: string;
  text: string;
  matched: string;
  at: string;
}

export interface ClaimAnswer {
  claimId: string;
  judgment: Judgment;
  /** 0~100, 5 단위 */
  confidence: number;
  /** 본인 생각 (1~3문장) */
  reasoning: string;
  /** '틀리다'일 때: 올바른 개념을 내 말로 설명 */
  correction?: string;
  /** 선택한 근거 Evidence.id */
  evidenceId?: string;
  /** 이유 칸에 붙여넣기로 들어간 글자 수 (과정 우회 판정용) */
  pastedChars: number;
}

export interface ScoreBreakdown {
  judgment: number; // 0~1
  reasoning: number; // 0~2
  concept: number; // 0~2
  evidence: number; // 0~2
  penalty: number; // 0 또는 -2
  total: number; // 0~7
}

export interface ClaimGrade {
  claimId: string;
  isError: boolean;
  judgmentCorrect: boolean;
  reasoningScore: number; // 0~2
  explanation: string;
  feedback?: string;
}

export interface ErrorReveal {
  claimId: string;
  errorType: ErrorType;
  correctClaim: string;
  explanation: string;
  evidenceId: string;
  evidenceLabel: string;
  conceptScore: number; // 0~2
  evidenceScore: number; // 0~2
}

export interface ChallengeSubmission {
  id: string;
  schemaVersion: number;
  studentId: string;
  courseId: string;
  challengeId: string;
  conceptId: string;
  submittedAt: string;
  /** 채점 주체. 'mock'은 학생 화면의 시연용 예시 채점(키워드 규칙), 'server'는 서버 API 채점 */
  grader: 'mock' | 'server';
  answers: ClaimAnswer[];
  /** 직전 제출 이후 같은 과목의 정답 직행 시도 여부 */
  directAnswerFlag: boolean;
  /** 이유 칸 중 붙여넣기로만 채워진 비율 0~1 */
  pastedRatio: number;
  /** 오탐 수: 맞는 주장을 '틀리다'로 판정한 주장 개수 (그 주장의 이유 점수는 0) */
  falseAlarms: number;
  score: ScoreBreakdown;
  /** 확신도 보정 정확도 0~100 */
  calibration: number;
  claimGrades: ClaimGrade[];
  errorReveals: ErrorReveal[];
  /** 해설 전 생각 요약 */
  beforeSummary: string;
  /** 해설 후 내 설명 */
  afterExplanation?: string;
  afterExplainedAt?: string;
  retrievalScheduledAt: string;
}

export interface RetrievalCriterion {
  criterion: string;
  met: boolean;
}

export interface RetrievalResult {
  id: string;
  schemaVersion: number;
  studentId: string;
  courseId: string;
  challengeId: string;
  submissionId: string;
  quizId: string;
  question: string;
  answer: string;
  rubric: RetrievalCriterion[];
  score: number; // 0~10
  feedback: string;
  submittedAt: string;
}

/** 교수 화면이 학생 한 명의 기록을 한 번에 읽을 때의 묶음 */
export interface StudentRecords {
  studentId: string;
  conversations: Conversation[];
  directAnswerAttempts: DirectAnswerAttempt[];
  submissions: ChallengeSubmission[];
  retrievals: RetrievalResult[];
}
