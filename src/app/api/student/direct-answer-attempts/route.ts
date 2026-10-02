import * as db from '@/lib/db';
import { handleRecordDirectAnswer } from '@/lib/server/student-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 정답 직행 요청 시도 기록 (감점 아님, 과정 지표용) */
export async function POST(request: Request) {
  return handleRecordDirectAnswer(request, { db });
}
