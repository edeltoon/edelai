import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRecords } from '../src/features/professor/records/reader.ts';
import { summarize } from '../src/features/professor/analysis/summarize.ts';
import { completePending } from '../src/features/professor/evaluation/draft.ts';
const parts = { judgment: 1, reasoning: null, concept: null, evidence: 2, penalty: 0, total: 3 };
test('null grades remain visible; pending scores do not lower completed average', () => {
  const sub = { id: 'p', studentId: 's1', courseId: 'phil', schemaVersion: 1, challengeId: 'c1', submittedAt: '2026-10-03T00:00:00Z', score: parts, pendingReview: ['reasoning', 'concept'], calibration: 80, answers: [], beforeSummary: '', grader: 'server' };
  const values: Record<string, unknown> = { 'edeltoon:student-index': ['s1'], 'edeltoon:student:s1:submissions': [sub] };
  const result = loadRecords({ getItem: k => k in values ? JSON.stringify(values[k]) : null });
  assert.equal(result.students.length, 1);
  const report = summarize(result.students);
  assert.equal(report.pendingCount, 1); assert.equal(report.averageScore, null);
  assert.equal(report.distribution.reduce((n, b) => n + b.count, 0), 0);
  result.students[0].submissions.push({ ...result.students[0].submissions[0], id: 'done', challengeId: 'c2', score: { ...parts, reasoning: 1, concept: 2, total: 6 } });
  assert.equal(summarize(result.students).averageScore, 6);
  assert.equal(summarize(result.students).completedCount, 1);
});
test('pending inputs require all fields including explicit zero; rule scores stay intact', () => {
  assert.equal(completePending(parts, { reasoning: '', concept: '2' }), null);
  assert.equal(completePending(parts, { reasoning: '1.5', concept: '2' }), null);
  assert.equal(completePending(parts, { reasoning: '3', concept: '2' }), null);
  assert.equal(completePending(parts, { reasoning: '0', concept: '2' })?.total, 5);
  const completed = completePending({ ...parts, reasoning: 1 }, { reasoning: '2', concept: '2' });
  assert.equal(completed?.reasoning, 1); assert.equal(completed?.total, 6);
  assert.equal(completePending({ ...parts, judgment: 0, evidence: 0, penalty: -2 }, { reasoning: '0', concept: '0' })?.total, 0);
  assert.equal(parts.reasoning, null);
});
