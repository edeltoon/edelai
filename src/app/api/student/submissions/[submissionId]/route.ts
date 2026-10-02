import * as db from '@/lib/db';
import { handleUpdateSubmission } from '@/lib/server/student-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 해설 후 내 설명 저장 (본인 제출만) */
export async function PATCH(request: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  return handleUpdateSubmission(request, submissionId, { db });
}
