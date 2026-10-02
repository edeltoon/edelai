// 학생에게 공개되는 챌린지 형태 (학생 API 응답, DB challenges.public).
// 어떤 주장이 오류인지(isError, errorCardId, 정답)는 절대 포함하지 않는다.

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

export interface ChallengePublic {
  id: string;
  courseId: string;
  conceptId: string;
  conceptName: string;
  title: string;
  /** 이 답변을 만든 학생 질문 */
  question: string;
  /** 오류 개수만 공개 */
  errorCount: number;
  claims: ChallengeClaimPublic[];
  evidenceOptions: EvidenceOption[];
}
