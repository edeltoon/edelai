import * as db from '@/lib/db';
import { handleSubmitChallenge } from '@/lib/server/student-api';

export const runtime = 'nodejs';
// Claude 호출(최대 25~30초 시간 제한)을 기다릴 수 있도록 배포 함수 실행 시간을 늘린다
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** 챌린지 제출: 규칙 채점 + Claude 채점(실패 시 키워드 대체) 후 저장, 정답·해설 공개 */
export async function POST(request: Request, { params }: { params: Promise<{ challengeId: string }> }) {
  const { challengeId } = await params;
  return handleSubmitChallenge(request, challengeId, { db });
}
