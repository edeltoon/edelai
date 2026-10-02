import type { StudentView, SubmissionView } from '../records/reader.ts';

/** 재시도 때문에 지표가 부풀지 않도록 학생·챌린지별 최신 제출만 집계한다. */
export function summarize(students: StudentView[], challengeId = '') {
  const latest = new Map<string, { studentId: string; submission: SubmissionView }>();
  for (const student of students) for (const submission of student.submissions) {
    if (challengeId && submission.challengeId !== challengeId) continue;
    const key = JSON.stringify([student.id, submission.challengeId]);
    const previous = latest.get(key);
    if (!previous || Date.parse(submission.submittedAt) > Date.parse(previous.submission.submittedAt)) latest.set(key, { studentId: student.id, submission });
  }
  const rows = [...latest.values()];
  const average = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const claims = new Map<string, { challengeId: string; claimId: string; total: number; wrong: number }>();
  for (const { submission } of rows) for (const grade of submission.claimResults ?? []) {
    const key = JSON.stringify([submission.challengeId, grade.claimId]);
    const item = claims.get(key) ?? { challengeId: submission.challengeId, claimId: grade.claimId, total: 0, wrong: 0 };
    item.total++; if (!grade.judgmentCorrect) item.wrong++;
    claims.set(key, item);
  }
  return {
    rows, studentCount: new Set(rows.map(row => row.studentId)).size,
    averageScore: average(rows.map(row => row.submission.score.total)),
    averageCalibration: average(rows.map(row => row.submission.calibration)),
    explained: rows.filter(row => row.submission.afterExplanation?.trim()).length,
    sources: { mock: rows.filter(r => r.submission.grader === 'mock').length, server: rows.filter(r => r.submission.grader === 'server').length, unknown: rows.filter(r => r.submission.grader === 'unknown').length },
    distribution: [
      { label: '0 이상 3점 미만', count: rows.filter(r => r.submission.score.total < 3).length },
      { label: '3 이상 5점 미만', count: rows.filter(r => r.submission.score.total >= 3 && r.submission.score.total < 5).length },
      { label: '5 이상 7점 미만', count: rows.filter(r => r.submission.score.total >= 5 && r.submission.score.total < 7).length },
      { label: '7점', count: rows.filter(r => r.submission.score.total === 7).length },
    ],
    claims: [...claims.values()].sort((a, b) => b.wrong / b.total - a.wrong / a.total || b.total - a.total),
  };
}
