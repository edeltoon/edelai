import 'server-only';
import type { ChallengeSubmission, ScoreBreakdown } from '@/types/student-records';
import { DbError, dbFail, getDb } from './client';
import { fromNewSubmission, toSubmission } from './mappers';
import type { SubmissionRecord, SubmissionRow } from './types';

// 챌린지 제출 (학생 API가 저장, 교수 API가 조회·조정·확정).
// 사용 예 (교수 API):
//   import { listSubmissions, saveProfessorReview, finalizeSubmission } from '@/lib/db';
//   const rows = await listSubmissions({ courseId: 'phil' });                 // 반 전체, 최신순
//   await saveProfessorReview(id, { professorScore: {...}, professorComment: '근거 연결 좋음' });
//   await finalizeSubmission(id, session.userId);                             // 평가 확정
// 사용 예 (학생 API): insertSubmission(채점 결과), updateAfterExplanation(id, userId, text)

export async function insertSubmission(
  submission: Omit<ChallengeSubmission, 'id' | 'schemaVersion'>,
): Promise<SubmissionRecord> {
  const { data, error } = await getDb()
    .from('submissions')
    .insert(fromNewSubmission(submission))
    .select('*')
    .single();
  if (error) dbFail('제출 저장', error);
  return toSubmission(data as SubmissionRow);
}

export async function getSubmission(id: string): Promise<SubmissionRecord | null> {
  const { data, error } = await getDb().from('submissions').select('*').eq('id', id).maybeSingle();
  if (error) dbFail('제출 조회', error);
  return data ? toSubmission(data as SubmissionRow) : null;
}

/** 조건에 맞는 제출, 최신순. 조건을 하나 이상 주는 것을 권장 */
export async function listSubmissions(filter: {
  studentId?: string;
  courseId?: string;
  challengeId?: string;
}): Promise<SubmissionRecord[]> {
  let query = getDb().from('submissions').select('*');
  if (filter.studentId) query = query.eq('student_id', filter.studentId);
  if (filter.courseId) query = query.eq('course_id', filter.courseId);
  if (filter.challengeId) query = query.eq('challenge_id', filter.challengeId);
  const { data, error } = await query.order('submitted_at', { ascending: false });
  if (error) dbFail('제출 목록 조회', error);
  return (data as SubmissionRow[]).map(toSubmission);
}

async function updateOne(
  id: string,
  patch: Partial<SubmissionRow>,
  action: string,
  studentId?: string,
): Promise<SubmissionRecord> {
  let query = getDb().from('submissions').update(patch).eq('id', id);
  if (studentId) query = query.eq('student_id', studentId);
  const { data, error } = await query.select('*').maybeSingle();
  if (error) dbFail(action, error);
  if (!data) throw new DbError('SUBMISSION_NOT_FOUND', '제출 기록을 찾을 수 없어요.');
  return toSubmission(data as SubmissionRow);
}

/** 해설 후 내 설명. 본인 제출만 수정되도록 studentId도 함께 확인한다 */
export function updateAfterExplanation(id: string, studentId: string, afterExplanation: string): Promise<SubmissionRecord> {
  return updateOne(
    id,
    { after_explanation: afterExplanation, after_explained_at: new Date().toISOString() },
    '해설 후 설명 저장',
    studentId,
  );
}

/**
 * 교수 조정 (교수 담당 확인 필요). professorScore를 주면 total 컬럼도 그 점수로 맞춘다.
 * AI 채점 대기(pendingReview) 항목을 교수가 채점하면 pendingReview를 비워서 넘긴다.
 */
export function saveProfessorReview(
  id: string,
  review: {
    professorScore?: ScoreBreakdown | null;
    professorComment?: string | null;
    pendingReview?: ('reasoning' | 'concept')[];
  },
): Promise<SubmissionRecord> {
  const patch: Partial<SubmissionRow> = {};
  if (review.professorScore !== undefined) {
    patch.professor_score = review.professorScore;
    if (review.professorScore) patch.total = review.professorScore.total;
  }
  if (review.professorComment !== undefined) patch.professor_comment = review.professorComment;
  if (review.pendingReview !== undefined) patch.pending_review = review.pendingReview;
  return updateOne(id, patch, '교수 조정 저장');
}

/** 평가 확정 (교수 담당 확인 필요) */
export function finalizeSubmission(id: string, finalizedBy: string): Promise<SubmissionRecord> {
  return updateOne(id, { finalized_by: finalizedBy, finalized_at: new Date().toISOString() }, '평가 확정');
}
