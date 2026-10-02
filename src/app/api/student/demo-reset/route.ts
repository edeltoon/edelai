import * as db from '@/lib/db';
import { handleDemoReset } from '@/lib/server/student-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 시연 리셋: 학생 기록 삭제 + 시연 카드 승인 대기로 */
export async function POST(request: Request) {
  return handleDemoReset(request, { db });
}
