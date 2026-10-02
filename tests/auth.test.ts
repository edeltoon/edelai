import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authenticateMember, sessionFromUser, verifyAccess } from '../src/lib/server/auth.ts';
const env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'test-public', AUTH_MEMBER_EMAILS: '{"P001":"prof@example.test"}' };
const user = { id: 'auth-uuid', app_metadata: { role: 'professor', member_no: 'P001', app_user_id: 'p1', name: '교수 예시' } };
test('roles only come from admin app metadata', () => {
  assert.equal(sessionFromUser({ id: 'uuid', user_metadata: user.app_metadata }), null);
  assert.equal(sessionFromUser({ ...user, app_metadata: { ...user.app_metadata, role: 'admin' } }), null);
  assert.equal(sessionFromUser(user)?.role, 'professor');
});
test('configuration, member/password validation fail before provider calls', async () => {
  const noFetch: typeof fetch = async () => { assert.fail('Unexpected fetch'); };
  for (const input of [{}, { memberNo: 'P001', password: '' }, { memberNo: 'P001', password: 'a'.repeat(257) }]) assert.equal((await authenticateMember(input, env, noFetch)).ok, false);
  assert.equal((await authenticateMember({ memberNo: 'P001', password: 'test-only' }, {}, noFetch)).ok, false);
  assert.equal((await authenticateMember({ memberNo: 'P002', password: 'test-only' }, env, noFetch)).ok, false);
});
test('member mapping is server-only; identity is revalidated and member number matched', async () => {
  const fetcher: typeof fetch = async (url, init) => {
    if (String(url).includes('/token?')) {
      assert.deepEqual(JSON.parse(init!.body as string), { email: 'prof@example.test', password: 'test-only' });
      return Response.json({ access_token: 'token', expires_in: 3600, user: { app_metadata: { role: 'student' } } });
    }
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer token');
    return Response.json(user);
  };
  const result = await authenticateMember({ memberNo: 'P001', password: 'test-only', role: 'student', email: 'evil@example.test' }, env, fetcher);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.session.role, 'professor');
  const bad = await authenticateMember({ memberNo: 'P001', password: 'test-only' }, env, async url => String(url).includes('/token?') ? Response.json({ access_token: 'token', expires_in: 3600 }) : Response.json({ ...user, app_metadata: { ...user.app_metadata, member_no: 'P002' } }));
  assert.equal(bad.ok, false);
});
test('provider secrets and expired tokens fail closed', async () => {
  const result = await authenticateMember({ memberNo: 'P001', password: 'secret-password' }, env, async () => new Response('secret-password', { status: 401 }));
  assert.ok(!JSON.stringify(result).includes('secret-password'));
  assert.equal(await verifyAccess('expired', env, async () => new Response('{}', { status: 401 })), null);
  assert.equal(await verifyAccess(undefined, env), null);
});
