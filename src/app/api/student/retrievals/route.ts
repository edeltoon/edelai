import * as db from '@/lib/db';
import { handleSaveRetrieval } from '@/lib/server/student-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 재인출 퀴즈 결과 저장: 아직 자리만 (501) */
export async function POST(request: Request) {
  return handleSaveRetrieval(request, { db });
}
