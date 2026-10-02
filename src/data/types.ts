// 공용 데이터 타입. 필드 이름을 바꿀 때는 학생·교수·데이터 담당 모두에게 먼저 확인한다.
// 1) 콘텐츠 타입: mock-data 스킬 스키마
// 2) 세션 타입: 로그인 담당과 공유 (localStorage `edeltoon:session`)
// 3) 학생 기록 타입: 학생 화면이 저장하고 교수 화면이 읽는다 (키 목록은 docs/STUDENT_RECORDS.md)

/* ───────────── 1. 콘텐츠 ───────────── */

export type Role = 'student' | 'professor';
export type ErrorType = '개념 반전' | '개념 혼동' | '근거 누락' | '허위 출처';
export type Judgment = 'correct' | 'wrong'; // 맞다 / 틀리다

export interface Course {
  id: string;
  code: string;
  name: string;
  term: string;
  professorName: string;
  /** 데모에서 클릭 가능한 과목인지 (서양철학만 true) */
  enabled: boolean;
}

export interface Concept {
  id: string;
  courseId: string;
  name: string;
  keywords: string[];
}

/** 강의자료 근거. label 예: "3주차 강의자료 · p.12" */
export interface Evidence {
  id: string;
  label: string;
  excerpt?: string;
}

export interface ErrorCard {
  id: string;
  conceptId: string;
  wrongClaim: string;
  correctClaim: string;
  correctKeywords: string[];
  evidenceId: string;
  errorType: ErrorType;
  difficulty: '하' | '중' | '상';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
}

/** errorCardId가 있으면 오류 주장. 학생 화면으로 보내는 데이터에는 절대 포함하지 않는다 */
export interface Claim {
  id: string;
  text: string;
  errorCardId?: string;
}

export interface Challenge {
  id: string;
  courseId: string;
  conceptId: string;
  title: string;
  question: string;
  claims: Claim[];
  evidenceOptions: string[];
}

/* ───────────── 2. 세션 ───────────── */

/** localStorage `edeltoon:session`. 실제 인증 없음, 가상 정보만 */
export interface Session {
  role: Role;
  /** 학생: s1~s5, 교수: p1 */
  userId: string;
  name: string;
  /** 학번·교번 (가상) */
  memberNo: string;
  major?: string;
  signedInAt: string; // ISO
}

/* ───────────── 3. 학생 기록 ───────────── */

export const RECORD_SCHEMA_VERSION = 1;

export interface ConceptCardView {
  term: string;
  gloss: string;
}

export interface CitationView {
  evidenceId: string;
  label: string;
}

export interface ChatMessage {
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
  messages: ChatMessage[];
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
  answers: ClaimAnswer[];
  /** 챌린지 시작 ~ 제출 사이 같은 과목의 정답 직행 시도 여부 */
  directAnswerFlag: boolean;
  /** 이유 칸 중 붙여넣기로만 채워진 비율 0~1 */
  pastedRatio: number;
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
