// 과목·개념·근거·오류 카드·챌린지 콘텐츠 타입 (mock-data 스킬 스키마 기반).
// 필드 이름을 바꿀 때는 학생·교수 담당 모두에게 먼저 확인한다.

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
