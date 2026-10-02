import { checkDbConnection } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** DB 연결 여부만 알려 준다: { ok: true, db: true | false }. 원인·설정 값은 내보내지 않는다 */
export async function GET() {
  return Response.json({ ok: true, db: await checkDbConnection() }, { headers: { 'Cache-Control': 'no-store' } });
}
