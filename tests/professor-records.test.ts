import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadRecords } from '../src/features/professor/records/reader.ts';

const submission = { id: 'sub1', schemaVersion: 1, studentId: 's1', courseId: 'phil', challengeId: 'ch1', submittedAt: '2026-10-02T06:00:00Z',
  score: { judgment: 1, reasoning: 2, concept: 2, evidence: 2, penalty: 0, total: 7 }, calibration: 98,
  answers: [{ claimId: 'B', judgment: 'wrong', confidence: 85, reasoning: '원문과 관계가 반대입니다.', pastedChars: 0 }], beforeSummary: '제출 설명', grader: 'mock' };
const conversation = { id: 'c1', studentId: 's1', courseId: 'phil', title: '질문', messages: [{ id: 'm1', role: 'user', text: '<script>not HTML</script>' }] };
function store(values: Record<string, unknown>) {
  return { getItem(key: string) { assert.ok(!key.endsWith(':drafts')); return key in values ? JSON.stringify(values[key]) : null; } };
}

test('professor records read PR6 keys and expose only submitted phil records without touching drafts', () => {
  const result = loadRecords(store({ 'edeltoon:student-index': ['s1'], 'edeltoon:student:s1:submissions': [submission, { ...submission, id: 'other', courseId: 'math' }], 'edeltoon:student:s1:conversations': [conversation], 'edeltoon:student:s1:drafts': { secret: true } }));
  assert.equal(result.students.length, 1);
  assert.equal(result.students[0].submissions.length, 1);
  assert.equal(result.students[0].submissions[0].grader, 'mock');
  assert.equal(result.students[0].conversations[0].messages[0].text, '<script>not HTML</script>');
  assert.equal(result.warnings.length, 0);
});

test('empty, unavailable and malformed storage never fabricate student records', () => {
  assert.deepEqual(loadRecords(store({})), { students: [], warnings: [] });
  for (const source of [{ getItem: () => '{' }, { getItem: () => { throw new Error('blocked'); } }, store({ 'edeltoon:student-index': {} })]) {
    const result = loadRecords(source);
    assert.equal(result.students.length, 0);
    assert.ok(result.warnings.length);
  }
});

test('bad scores, schema, nested answers and student identity are excluded', () => {
  for (const patch of [{ schemaVersion: 2 }, { studentId: 's2' }, { score: { ...submission.score, total: 99 } }, { answers: [null] }, { submittedAt: 'invalid' }, { afterExplanation: {} }]) {
    const result = loadRecords(store({ 'edeltoon:student-index': ['s1'], 'edeltoon:student:s1:submissions': [{ ...submission, ...patch }] }));
    assert.equal(result.students.length, 0);
    assert.ok(result.warnings.length);
  }
});

test('unknown grading source stays explicit and submissions are sorted newest first', () => {
  const result = loadRecords(store({ 'edeltoon:student-index': ['s1', 's1', null], 'edeltoon:student:s1:submissions': [submission, { ...submission, id: 'new', submittedAt: '2026-10-03T06:00:00Z', grader: 'untrusted' }] }));
  assert.equal(result.students[0].submissions[0].id, 'new');
  assert.equal(result.students[0].submissions[0].grader, 'unknown');
  assert.equal(result.students.length, 1);
});
