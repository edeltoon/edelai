import 'server-only';
import type { Session } from '../../types/session.ts';

export const AUTH_COOKIE = 'setask-access';
type Env = Record<string, string | undefined>;
export function authConfig(env: Env = process.env) {
  const url = env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  const key = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key) return null;
  return { url, key };
}
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }

/** Only admin-controlled app_metadata grants roles. user_metadata and localStorage are never trusted. */
export function sessionFromUser(user: unknown): Session | null {
  if (!object(user) || typeof user.id !== 'string' || !object(user.app_metadata)) return null;
  const m = user.app_metadata;
  if ((m.role !== 'student' && m.role !== 'professor') || typeof m.member_no !== 'string' ||
    !/^[A-Za-z0-9-]{1,30}$/.test(m.member_no) || typeof m.app_user_id !== 'string' || !m.app_user_id ||
    typeof m.name !== 'string' || !m.name) return null;
  return { role: m.role, userId: m.app_user_id, name: m.name, memberNo: m.member_no, signedInAt: new Date().toISOString() };
}

export async function verifyAccess(token: string | undefined, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<Session | null> {
  const config = authConfig(env);
  if (!config || !token || token.length > 8000) return null;
  try {
    const response = await fetcher(config.url + '/auth/v1/user', {
      headers: { apikey: config.key, Authorization: 'Bearer ' + token }, cache: 'no-store', signal: AbortSignal.timeout(10_000),
    });
    return response.ok ? sessionFromUser(await response.json()) : null;
  } catch { return null; }
}

export async function authenticateMember(input: unknown, env: Env = process.env, fetcher: typeof fetch = fetch) {
  const fail = (status: number, message: string) => ({ ok: false as const, status, message });
  if (!object(input) || typeof input.memberNo !== 'string' || !/^[A-Za-z0-9-]{1,30}$/.test(input.memberNo.trim()) ||
    typeof input.password !== 'string' || !input.password || input.password.length > 256) return fail(400, '학번·교번과 비밀번호를 확인해 주세요.');
  const config = authConfig(env);
  let mapping: unknown;
  try { mapping = JSON.parse(env.AUTH_MEMBER_EMAILS ?? '{}'); } catch { return fail(503, '로그인 계정 설정이 필요해요.'); }
  if (!config || !object(mapping) || !Object.keys(mapping).length) return fail(503, '로그인 서버 설정이 아직 준비되지 않았어요.');
  const memberNo = input.memberNo.trim();
  const email = Object.hasOwn(mapping, memberNo) ? mapping[memberNo] : undefined;
  if (typeof email !== 'string') return fail(401, '학번·교번 또는 비밀번호가 올바르지 않아요.');
  try {
    const response = await fetcher(config.url + '/auth/v1/token?grant_type=password', {
      method: 'POST', cache: 'no-store', headers: { apikey: config.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: input.password }), signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 429) return fail(429, '로그인 시도가 많아요. 잠시 후 다시 시도해 주세요.');
    if (!response.ok) return fail(response.status >= 500 ? 502 : 401, '로그인하지 못했어요. 입력 정보와 계정 상태를 확인해 주세요.');
    const data: unknown = await response.json();
    if (!object(data) || typeof data.access_token !== 'string' || typeof data.expires_in !== 'number' ||
      !Number.isFinite(data.expires_in) || data.expires_in <= 0) return fail(502, '로그인 응답을 확인할 수 없어요.');
    // Revalidate with the Auth server, rather than trusting browser claims.
    const session = await verifyAccess(data.access_token, env, fetcher);
    if (!session || session.memberNo !== memberNo) return fail(403, '계정의 학번·교번 및 역할 등록을 확인해 주세요.');
    return { ok: true as const, token: data.access_token, expiresIn: Math.min(data.expires_in, 3600), session };
  } catch { return fail(502, '로그인 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
}
