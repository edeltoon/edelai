import type { ErrorCard } from '@/types/content';

export type ReviewCard = ErrorCard & {
  title: string;
  evidence: string;
  rejectionReason?: string;
};

// 화면 검토용 예시. 실제 강의자료 및 교수 검수를 거친 배포 데이터가 아닙니다.
export const sampleCards: ReviewCard[] = [
  {
    id: 'preview-idea', conceptId: 'idea', title: '이데아와 감각 세계',
    wrongClaim: '감각 세계가 진정한 실재이고, 이데아는 감각 세계의 불완전한 모방이다.',
    correctClaim: '플라톤의 이데아론에서 이데아는 참된 실재이며, 감각 세계의 사물들은 이데아의 불완전한 모방으로 설명된다.',
    correctKeywords: ['이데아', '실재'], evidenceId: 'preview-evidence-idea',
    evidence: '설계안의 이데아론 예시: 실재와 모방의 관계가 뒤바뀐 주장을 검토합니다. 실제 강의자료와 대조가 필요합니다.',
    errorType: '개념 반전', difficulty: '하', approvalStatus: 'pending',
  },
  {
    id: 'preview-cave', conceptId: 'cave', title: '동굴의 비유와 인식',
    wrongClaim: '동굴의 비유는 동굴 벽의 그림자가 참된 실재이므로 감각에만 의존해야 한다는 뜻이다.',
    correctClaim: '동굴의 비유는 그림자에 머무른 인식에서 벗어나 참된 실재를 이해하는 과정을 설명한다.',
    correctKeywords: ['인식', '실재'], evidenceId: 'preview-evidence-cave',
    evidence: '설계안의 동굴의 비유 예시: 그림자와 실재의 관계를 구분합니다. 실제 강의자료와 대조가 필요합니다.',
    errorType: '개념 혼동', difficulty: '중', approvalStatus: 'pending',
  },
];
