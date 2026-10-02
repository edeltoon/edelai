import * as db from '@/lib/db';
import { handleGetChallenge } from '@/lib/server/student-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 학생 챌린지 조회 (교수 승인된 것만, 정답 정보 없음) */
export async function GET(request: Request, { params }: { params: Promise<{ challengeId: string }> }) {
  const { challengeId } = await params;
  return handleGetChallenge(request, challengeId, { db });
}
