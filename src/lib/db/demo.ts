import 'server-only';
import { resetErrorCardToPending } from './errorCards';
import { resetStudentRecords } from './students';

/**
 * 시연 시작 때 승인 대기(pending)로 돌려놓을 오류 카드.
 * 0002_seed.sql에서 pending으로 넣은 카드와 같아야 한다(교수 승인 장면을 매번 보여 주기 위해).
 */
export const DEMO_ERROR_CARD_IDS = ['ec-idea-1'] as const;

/**
 * 시연 리셋: 학생 기록(제출·정답 직행 시도·재인출)을 지우고, 시연용 오류 카드를 승인 대기로 되돌린다.
 * 오류 카드 내용·챌린지·학생은 그대로 둔다.
 * 사용 예 (학생 API POST /api/student/demo-reset): await resetDemo(userId);
 */
export async function resetDemo(studentId: string): Promise<void> {
  await resetStudentRecords(studentId);
  for (const id of DEMO_ERROR_CARD_IDS) {
    await resetErrorCardToPending(id);
  }
}
