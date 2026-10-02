import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft } from '../src/features/professor/evaluation/draft.ts';
const input = { score: '7', reason: '', feedback: '설명 근거가 명확합니다.', reviewed: true };
test('evaluation requires explicit review, feedback and a reason for score changes', () => {
  for (const patch of [{ reviewed: false }, { feedback: ' ' }, { score: '6' }]) assert.equal(validateDraft({ ...input, ...patch }, 7).ok, false);
  assert.deepEqual(validateDraft({ ...input, score: '6.5', reason: ' 근거 보완 필요 ' }, 7), { ok: true, draft: { score: 6.5, reason: '근거 보완 필요', feedback: input.feedback } });
  assert.equal(validateDraft(input, 7).ok, true);
});
test('evaluation rejects blank, nonfinite, out-of-range and overprecise scores', () => {
  for (const score of ['', ' ', 'NaN', 'Infinity', '-1', '7.1', '3.14']) assert.equal(validateDraft({ ...input, score, reason: '근거' }, 7).ok, false);
  for (const score of ['0', '0.1', '7']) assert.equal(validateDraft({ ...input, score, reason: '근거' }, 7).ok, true);
});
test('evaluation enforces text limits and leaves original inputs untouched', () => {
  assert.equal(validateDraft({ ...input, reason: 'x'.repeat(1001) }, 7).ok, false);
  assert.equal(validateDraft({ ...input, feedback: 'x'.repeat(2001) }, 7).ok, false);
  const before = JSON.stringify(input); validateDraft(input, 7); assert.equal(JSON.stringify(input), before);
});
