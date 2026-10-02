import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../src/features/professor/analysis/summarize.ts';
import { loadRecords, type StudentView, type SubmissionView } from '../src/features/professor/records/reader.ts';
const submission: SubmissionView = { id: 'a', challengeId: 'ch1', submittedAt: '2026-10-01T00:00:00Z', score: { total: 4, judgment: 0, reasoning: 2, concept: 1, evidence: 1, penalty: 0 }, calibration: 80, answers: [], beforeSummary: '', grader: 'mock', claimResults: [{ claimId: 'A', judgmentCorrect: true }] };
const student = (id: string, submissions: SubmissionView[]): StudentView => ({ id, submissions, conversations: [] });
test('empty reports have missing averages rather than fabricated zero scores', () => {
  const report = summarize([]);
  assert.equal(report.averageScore, null); assert.equal(report.averageCalibration, null); assert.equal(report.studentCount, 0); assert.deepEqual(report.claims, []);
});
test('latest submission per student and challenge, without mutating source or mixing claim IDs', () => {
  const data = [student('s1', [submission, { ...submission, id: 'new', submittedAt: '2026-10-02T00:00:00Z', score: { ...submission.score, total: 7 }, afterExplanation: '설명', claimResults: [{ claimId: 'A', judgmentCorrect: false }] }, { ...submission, id: 'other', challengeId: 'ch2' }]), student('s2', [submission])];
  const original = JSON.stringify(data); const report = summarize(data);
  assert.equal(report.rows.length, 3); assert.equal(report.studentCount, 2); assert.equal(report.averageScore, 5); assert.equal(report.explained, 1);
  assert.deepEqual(report.claims.find(c => c.challengeId === 'ch1'), { challengeId: 'ch1', claimId: 'A', total: 2, wrong: 1 });
  assert.equal(report.claims.find(c => c.challengeId === 'ch2')?.wrong, 0);
  assert.equal(JSON.stringify(data), original); assert.equal(summarize(data, 'ch2').rows.length, 1);
});
test('missing correctness is not inferred from wrong judgment; decimal scores fit one bucket', () => {
  const report = summarize([student('s1', [{ ...submission, claimResults: undefined, score: { ...submission.score, total: 2.5 } }])]);
  assert.deepEqual(report.claims, []); assert.equal(report.distribution[0].count, 1); assert.equal(report.distribution.reduce((n, b) => n + b.count, 0), 1);
});
test('reader excludes duplicate or malformed grades but preserves valid submissions', () => {
  for (const grades of [[{ claimId: 'A', judgmentCorrect: 'yes' }], [{ claimId: 'A', judgmentCorrect: true }, { claimId: 'A', judgmentCorrect: false }]]) {
    const values: Record<string, unknown> = { 'edeltoon:student-index': ['s1'], 'edeltoon:student:s1:submissions': [{ ...submission, schemaVersion: 1, studentId: 's1', courseId: 'phil', claimGrades: grades }] };
    const result = loadRecords({ getItem: key => key in values ? JSON.stringify(values[key]) : null });
    assert.equal(result.students[0].submissions.length, 1); assert.equal(result.students[0].submissions[0].claimResults, undefined); assert.ok(result.warnings.length);
  }
});
