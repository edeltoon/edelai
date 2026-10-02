import * as db from '@/lib/db';
import { handleGetRecords } from '@/lib/server/student-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 학생 기록 조회 (제출·정답 직행 시도·재인출) */
export async function GET(request: Request) {
  return handleGetRecords(request, { db });
}
