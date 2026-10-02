import { test } from "node:test";
import assert from "node:assert/strict";
import { isSameOrigin } from "../src/lib/server/origin.ts";

const h = (init: Record<string, string>) => new Headers(init);

test("same-origin check compares the Origin host with the request host, not a fixed address", () => {
  assert.equal(isSameOrigin(h({ origin: "https://setask.vercel.app", "x-forwarded-host": "setask.vercel.app", host: "localhost:3000" })), true);
  assert.equal(isSameOrigin(h({ origin: "https://setask.vercel.app", host: "setask.vercel.app" })), true);
  assert.equal(isSameOrigin(h({ origin: "http://localhost:3000", host: "localhost:3000" })), true);
  assert.equal(isSameOrigin(h({ origin: "https://SETASK.vercel.app", host: "setask.vercel.app" })), true);
  assert.equal(isSameOrigin(h({ origin: "https://evil.example", "x-forwarded-host": "setask.vercel.app" })), false);
  assert.equal(isSameOrigin(h({ origin: "http://localhost:3001", host: "localhost:3000" })), false);
  assert.equal(isSameOrigin(h({ host: "setask.vercel.app" })), false);
  assert.equal(isSameOrigin(h({ origin: "null", host: "setask.vercel.app" })), false);
  assert.equal(isSameOrigin(h({ origin: "https://setask.vercel.app" })), false);
});
