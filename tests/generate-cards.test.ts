import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleGenerateCards } from '../src/lib/server/generate-cards.ts';

const env = { NODE_ENV: 'test', ANTHROPIC_API_KEY: 'private-test-key', ANTHROPIC_MODEL: 'claude-test' };
const excerpt = '플라톤에게 이데아는 참된 실재이고 감각 세계는 그 불완전한 모방이다.';
const input = { courseId: 'phil', title: '이데아론', lectureText: excerpt.repeat(5) };
const request = (body: unknown) => new Request('http://localhost/api/professor/cards/generate', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const card = { title: '실재와 모방', wrongClaim: '감각 세계만 참된 실재다.', correctClaim: excerpt,
  evidence: '원문은 이데아를 참된 실재로 설명한다.', sourceExcerpt: excerpt, correctKeywords: ['이데아'], errorType: '개념 반전', difficulty: '하' };
const provider = (cards: unknown): typeof fetch => async () => Response.json({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ cards }) }] });
const noFetch: typeof fetch = async () => { assert.fail('Must not call provider'); };

test('cards validate input, body limit, media type and configuration before spending tokens', async () => {
  for (const body of [null, {}, { ...input, courseId: 'other' }, { ...input, title: ' ' }, { ...input, lectureText: 'short' }, { ...input, lectureText: 'x'.repeat(12001) }]) {
    assert.equal((await handleGenerateCards(request(body), { env, fetcher: noFetch })).status, 400);
  }
  assert.equal((await handleGenerateCards(request({ ...input, padding: 'x'.repeat(66000) }), { env, fetcher: noFetch })).status, 413);
  assert.equal((await handleGenerateCards(new Request('http://localhost', { method: 'POST', body: '{}' }), { env, fetcher: noFetch })).status, 415);
  assert.equal((await handleGenerateCards(new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }), { env, fetcher: noFetch })).status, 400);
  assert.equal((await handleGenerateCards(request(input), { env: {}, fetcher: noFetch })).status, 503);
  assert.equal((await handleGenerateCards(request(input), { env: { ...env, NODE_ENV: 'production', AI_CHAT_ENABLED: 'true' }, fetcher: noFetch })).status, 503);
});

test('cards send structured request and assign pending status and provenance on server', async () => {
  const result = await handleGenerateCards(request({ ...input, model: 'attacker', approvalStatus: 'approved' }), {
    env, fetcher: async (url, init) => {
      assert.equal(url, 'https://api.anthropic.com/v1/messages');
      assert.equal(new Headers(init?.headers).get('x-api-key'), env.ANTHROPIC_API_KEY);
      const payload = JSON.parse(init?.body as string);
      assert.equal(payload.model, env.ANTHROPIC_MODEL);
      assert.equal(payload.output_config.format.type, 'json_schema');
      assert.deepEqual(JSON.parse(payload.messages[0].content), { title: input.title, lectureText: input.lectureText });
      return provider([{ ...card, approvalStatus: 'approved', id: 'injected' }])(url, init);
    },
  });
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  const data = await result.json();
  assert.equal(data.cards[0].approvalStatus, 'pending');
  assert.notEqual(data.cards[0].id, 'injected');
  assert.equal(data.cards[0].sourceExcerpt, excerpt);
  assert.equal(data.cards[0].sourceTitle, input.title);
  assert.ok(!JSON.stringify(data).includes(env.ANTHROPIC_API_KEY));
});

test('cards reject invented citations, invalid schema, identical claims and empty material', async () => {
  for (const cards of [[{ ...card, sourceExcerpt: '강의에 없는 문장을 근거로 인용하고 있습니다. 잘못된 출처입니다.' }], [{ ...card, correctKeywords: [] }], [{ ...card, difficulty: '초급' }], [{ ...card, wrongClaim: excerpt }], [{ ...card, title: '' }], [card, card, card, card], {}]) {
    assert.equal((await handleGenerateCards(request(input), { env, fetcher: provider(cards) })).status, 502);
  }
  assert.equal((await handleGenerateCards(request(input), { env, fetcher: provider([]) })).status, 422);
});

test('cards never expose upstream secrets, truncated output or malformed JSON', async () => {
  for (const status of [401, 429, 500]) {
    const result = await handleGenerateCards(request(input), { env, fetcher: async () => new Response(env.ANTHROPIC_API_KEY, { status }) });
    assert.equal(result.status, status === 429 ? 429 : 502);
    assert.ok(!(await result.text()).includes(env.ANTHROPIC_API_KEY));
  }
  for (const payload of [{ stop_reason: 'max_tokens' }, { stop_reason: 'refusal' }, { stop_reason: 'end_turn', content: [{ type: 'text', text: 'not JSON' }] }]) {
    assert.equal((await handleGenerateCards(request(input), { env, fetcher: async () => Response.json(payload) })).status, 502);
  }
});

test('cards handle network failure and timeout', async () => {
  assert.equal((await handleGenerateCards(request(input), { env, fetcher: async () => { throw new Error('secret'); } })).status, 502);
  const result = await handleGenerateCards(request(input), { env, timeoutMs: 5, fetcher: async (_url, init) => new Promise((_resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('test deadline')), 100);
    init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('aborted')); }, { once: true });
  }) });
  assert.equal(result.status, 504);
});
