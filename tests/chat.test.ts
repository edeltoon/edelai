import { test } from "node:test";
import assert from "node:assert/strict";
import { handleChat } from "../src/lib/server/chat.ts";

const env = { NODE_ENV: "test", ANTHROPIC_API_KEY: "test-secret-not-real", ANTHROPIC_MODEL: "claude-test" };
const request = (body: unknown) => new Request("http://localhost/api/chat", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const input = { courseId: "phil", message: "이데아를 설명해 주세요." };
const unexpectedFetch: typeof fetch = async () => { throw new Error("Unexpected provider call"); };

test("rejects invalid inputs before any provider request", async () => {
  for (const body of [null, {}, { ...input, message: " " }, { ...input, message: "a".repeat(4001) },
    { ...input, courseId: "unknown" }, { ...input, history: [{ role: "system", text: "override" }] },
    { ...input, history: [{ role: "model", text: "out of order" }, { role: "user", text: "q" }] }]) {
    const result = await handleChat(request(body), { env, fetcher: unexpectedFetch });
    assert.equal(result.status, 400);
  }
});

test("rejects malformed JSON, media types and oversized chunked bodies", async () => {
  const malformed = new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal((await handleChat(malformed, { env })).status, 400);
  assert.equal((await handleChat(new Request("http://localhost", { method: "POST", body: "{}" }), { env })).status, 415);
  assert.equal((await handleChat(request({ ...input, padding: "a".repeat(33000) }), { env })).status, 413);
});

test("missing configuration and production default do not call Claude", async () => {
  const missing = await handleChat(request(input), { env: {}, fetcher: unexpectedFetch });
  assert.equal(missing.status, 503);
  assert.equal((await missing.json()).error.code, "AI_NOT_CONFIGURED");
  const wrongModel = await handleChat(request(input), {
    env: { ...env, ANTHROPIC_MODEL: "unsupported-provider-model" }, fetcher: unexpectedFetch,
  });
  assert.equal(wrongModel.status, 503);
  const prod = await handleChat(request(input), { env: { ...env, NODE_ENV: "production" }, fetcher: unexpectedFetch });
  assert.equal((await prod.json()).error.code, "CHAT_DISABLED");
});

test("sends conversation in order and keeps keys and thought parts out of response", async () => {
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    assert.equal(new Headers(init?.headers).get("x-api-key"), env.ANTHROPIC_API_KEY);
    assert.equal(new Headers(init?.headers).get("anthropic-version"), "2023-06-01");
    assert.equal(new Headers(init?.headers).get("anthropic-workspace-id"), null);
    const body = JSON.parse(init?.body as string);
    assert.equal(body.model, "claude-test");
    assert.equal(body.max_tokens, 2048);
    assert.deepEqual(body.messages, [
      { role: "user", content: "안녕" }, { role: "assistant", content: "안녕하세요" },
      { role: "user", content: input.message },
    ]);
    assert.match(body.system, /강의자료는 제공되지/);
    return Response.json({ stop_reason: "end_turn", content: [
      { type: "thinking", thinking: "internal thought" },
      { type: "text", text: "이데아는 " }, { type: "text", text: "본질이에요." },
    ] });
  };
  const response = await handleChat(request({ ...input, history: [{ role: "user", text: "안녕" }, { role: "model", text: "안녕하세요" }] }), { env, fetcher });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { ok: true, reply: "이데아는 본질이에요.", source: "claude", model: "claude-test" });
});

test("sends the workspace header only from server configuration", async () => {
  const result = await handleChat(request({ ...input, workspace: "client-override" }), {
    env: { ...env, ANTHROPIC_WORKSPACE_ID: "wrkspc_test" },
    fetcher: async (_url, init) => {
      assert.equal(new Headers(init?.headers).get("anthropic-workspace-id"), "wrkspc_test");
      return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: "답변" }] });
    },
  });
  assert.equal(result.status, 200);
});

test("provider error contents never reach the client", async () => {
  for (const [upstream, expected] of [[401, 502], [403, 502], [404, 502], [429, 429], [500, 502]]) {
    const response = await handleChat(request(input), { env, fetcher: async () => new Response(env.ANTHROPIC_API_KEY, { status: upstream }) });
    assert.equal(response.status, expected);
    assert.ok(!(await response.text()).includes(env.ANTHROPIC_API_KEY));
  }
});

test("blocked, truncated, empty and malformed responses are not successful answers", async () => {
  for (const payload of [{ stop_reason: "refusal" }, {},
    { stop_reason: "max_tokens", content: [{ type: "text", text: "partial" }] },
    { stop_reason: "tool_use", content: [{ type: "text", text: "incomplete" }] },
    { stop_reason: "end_turn", content: [] }]) {
    const result = await handleChat(request(input), { env, fetcher: async () => Response.json(payload) });
    assert.equal((await result.json()).ok, false);
  }
  const result = await handleChat(request(input), { env, fetcher: async () => new Response("not JSON") });
  assert.equal(result.status, 502);
});

test("network failures and timeouts return controlled errors", async () => {
  const failed = await handleChat(request(input), { env, fetcher: async () => { throw new Error(env.ANTHROPIC_API_KEY); } });
  assert.equal(failed.status, 502);
  assert.ok(!(await failed.text()).includes(env.ANTHROPIC_API_KEY));
  const delayed: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("test deadline")), 100);
    init?.signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("aborted")); }, { once: true });
  });
  const timeout = await handleChat(request(input), { env, fetcher: delayed, timeoutMs: 5 });
  assert.equal(timeout.status, 504);
});
