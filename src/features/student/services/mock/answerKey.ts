// mock 채점 전용 정답 키. 서버 채점 API가 생기면 이 파일은 지운다.
//
// 주의: 이 파일은 ai.mock.ts의 submitChallenge 안에서만 `await import()`로 불러온다.
// 다른 파일에서 정적으로 import하면 제출 전에 정답이 화면 번들에 실린다. 절대 정적 import 금지.
// (mock 모드에서도 제출 전에는 이 청크를 내려받지 않는다. 그래도 번들 산출물에는 존재하므로
//  화면에는 "시연용 예시 채점"으로 표시한다.)
//
// TODO(검수 필요): 오류 카드·해설 문장은 PLAN.md 3.2·10장과 설계안 문구로 만든 초안
import type { ErrorCard } from '@/types/content';

export interface ClaimKey {
  claimId: string;
  isError: boolean;
  /** 해설: 맞는 주장은 왜 맞는지, 오류 주장은 무엇이 틀렸는지 */
  explanation: string;
  /** 오류 주장이면 교수 승인 오류 카드 */
  errorCard?: ErrorCard;
}

export interface ChallengeKey {
  challengeId: string;
  /** 본인 생각 점수(키워드 규칙)에 쓰는 개념 키워드 */
  reasonKeywords: string[];
  claims: ClaimKey[];
}

const KEYS: ChallengeKey[] = [
  {
    challengeId: 'ch1',
    reasonKeywords: ['이데아', '실재', '모방', '감각', '본질', '동굴', '그림자', '인식', '불완전'],
    claims: [
      {
        claimId: 'ch1-a',
        isError: false,
        explanation:
          '맞는 주장이에요. 감각 세계는 우리가 보고 듣고 만지며 경험하는 세계이고, 플라톤은 이 세계가 변하고 소멸한다고 보았어요.',
      },
      {
        claimId: 'ch1-b',
        isError: true,
        explanation: '실재와 모방의 관계가 뒤집혔어요. 이데아가 진정한 실재이고, 감각 세계는 그것의 불완전한 모방입니다.',
        errorCard: {
          id: 'ec-idea-1',
          conceptId: 'idea',
          wrongClaim: '플라톤은 감각 세계를 진정한 실재, 이데아를 그 모방으로 보았다.',
          correctClaim: '이데아가 진정한 실재이고, 감각 세계는 그 불완전한 모방이다.',
          correctKeywords: ['이데아', '실재', '모방', '감각'],
          evidenceId: 'ev-w3-p12',
          errorType: '개념 반전',
          difficulty: '중',
          approvalStatus: 'approved',
          approvedBy: 'p1',
        },
      },
      {
        claimId: 'ch1-c',
        isError: false,
        explanation:
          '맞는 주장이에요. 동굴의 비유는 그림자만 보던 사람이 동굴 밖으로 나가 실재를 알아 가는 과정으로, 인식이 높아지는 단계를 보여 줘요.',
      },
    ],
  },
];

export function getChallengeKey(challengeId: string): ChallengeKey | undefined {
  // 교수 승인된 오류 카드만 출제·채점에 반영한다
  return KEYS.find(
    (k) =>
      k.challengeId === challengeId &&
      k.claims.every((c) => !c.isError || c.errorCard?.approvalStatus === 'approved'),
  );
}
