import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// 서버 전용 Supabase 클라이언트. 브라우저 코드에서 import하면 빌드가 실패한다(server-only).
// 환경 변수(.env.local에만, NEXT_PUBLIC_ 금지):
//   SUPABASE_URL         https://<project>.supabase.co
//   SUPABASE_SECRET_KEY  secret key (sb_secret_… 또는 기존 service_role 키). 모든 테이블 RLS를 우회한다

/** DB 계층 오류. message는 사용자에게 보여도 되는 한국어 문구이고, DB 원문·비밀 값은 담지 않는다 */
export class DbError extends Error {
  constructor(
    readonly code: string,
    message: string,
    /** PostgREST/Postgres 오류 코드 (예: '42P01'). 서버 로그·디버깅용 */
    readonly dbCode?: string,
  ) {
    super(message);
    this.name = 'DbError';
  }
}

export function isDbConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.SUPABASE_URL?.trim() && env.SUPABASE_SECRET_KEY?.trim());
}

let cached: SupabaseClient | null = null;

export function getDb(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) {
    throw new DbError('DB_NOT_CONFIGURED', '서버의 Supabase 설정(SUPABASE_URL, SUPABASE_SECRET_KEY)이 필요해요.');
  }
  if (key.startsWith('sb_publishable_')) {
    throw new DbError('DB_WRONG_KEY', 'SUPABASE_SECRET_KEY에는 공개(publishable) 키가 아니라 secret key를 넣어야 해요.');
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
  return cached;
}

/** Supabase 응답 오류를 DbError로 바꾼다. 원문 메시지는 내보내지 않는다 */
export function dbFail(action: string, error: { code?: string } | null): never {
  throw new DbError('DB_QUERY_FAILED', `${action}에 실패했어요. 잠시 후 다시 시도해 주세요.`, error?.code);
}
