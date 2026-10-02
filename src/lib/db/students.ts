import 'server-only';
import type { DirectAnswerAttempt, RetrievalResult, StudentRecords } from '@/types/student-records';
import { dbFail, getDb } from './client';
import { toDirectAnswerAttempt, toRetrieval, toStudent } from './mappers';
import { listSubmissions } from './submissions';
import type { DirectAnswerAttemptRow, RetrievalRow, Student, StudentRow } from './types';

// 학생, 정답 직행 시도, 재인출, 학생 기록 묶음, 시연 리셋.
// 사용 예 (교수 API): const students = await listStudents(); const records = await getStudentRecords('s1');

export async function listStudents(): Promise<Student[]> {
  const { data, error } = await getDb().from('students').select('*').order('id');
  if (error) dbFail('학생 목록 조회', error);
  return (data as StudentRow[]).map(toStudent);
}

export async function getStudent(id: string): Promise<Student | null> {
  const { data, error } = await getDb().from('students').select('*').eq('id', id).maybeSingle();
  if (error) dbFail('학생 조회', error);
  return data ? toStudent(data as StudentRow) : null;
}

/* ───────────── 정답 직행 시도 ───────────── */

export async function insertDirectAnswerAttempt(attempt: Omit<DirectAnswerAttempt, 'id'>): Promise<DirectAnswerAttempt> {
  const { data, error } = await getDb()
    .from('direct_answer_attempts')
    .insert({
      student_id: attempt.studentId,
      course_id: attempt.courseId,
      conversation_id: attempt.conversationId,
      text: attempt.text,
      matched: attempt.matched,
      at: attempt.at,
    })
    .select('*')
    .single();
  if (error) dbFail('정답 직행 시도 기록', error);
  return toDirectAnswerAttempt(data as DirectAnswerAttemptRow);
}

export async function listDirectAnswerAttempts(filter: { studentId?: string; courseId?: string }): Promise<DirectAnswerAttempt[]> {
  let query = getDb().from('direct_answer_attempts').select('*');
  if (filter.studentId) query = query.eq('student_id', filter.studentId);
  if (filter.courseId) query = query.eq('course_id', filter.courseId);
  const { data, error } = await query.order('at', { ascending: false });
  if (error) dbFail('정답 직행 시도 조회', error);
  return (data as DirectAnswerAttemptRow[]).map(toDirectAnswerAttempt);
}

/* ───────────── 재인출 (첫 목표 이후) ───────────── */

export async function insertRetrieval(result: Omit<RetrievalResult, 'id' | 'schemaVersion'>): Promise<RetrievalResult> {
  const { data, error } = await getDb()
    .from('retrievals')
    .insert({
      student_id: result.studentId,
      course_id: result.courseId,
      challenge_id: result.challengeId,
      submission_id: result.submissionId || null,
      quiz_id: result.quizId,
      question: result.question,
      answer: result.answer,
      rubric: result.rubric,
      score: result.score,
      feedback: result.feedback,
      submitted_at: result.submittedAt,
    })
    .select('*')
    .single();
  if (error) dbFail('재인출 결과 저장', error);
  return toRetrieval(data as RetrievalRow);
}

export async function listRetrievals(filter: { studentId?: string; courseId?: string }): Promise<RetrievalResult[]> {
  let query = getDb().from('retrievals').select('*');
  if (filter.studentId) query = query.eq('student_id', filter.studentId);
  if (filter.courseId) query = query.eq('course_id', filter.courseId);
  const { data, error } = await query.order('submitted_at', { ascending: false });
  if (error) dbFail('재인출 결과 조회', error);
  return (data as RetrievalRow[]).map(toRetrieval);
}

/* ───────────── 학생 기록 묶음과 시연 리셋 ───────────── */

/** 학생 한 명의 서버 기록. 대화 기록은 첫 목표에서 브라우저(local)에 있으므로 빈 배열 */
export async function getStudentRecords(studentId: string): Promise<StudentRecords> {
  const [submissions, directAnswerAttempts, retrievals] = await Promise.all([
    listSubmissions({ studentId }),
    listDirectAnswerAttempts({ studentId }),
    listRetrievals({ studentId }),
  ]);
  return { studentId, conversations: [], directAnswerAttempts, submissions, retrievals };
}

/** 시연 리셋: 이 학생의 재인출·제출·직행 시도를 지운다. 오류 카드·챌린지·학생은 남긴다 */
export async function resetStudentRecords(studentId: string): Promise<void> {
  const db = getDb();
  for (const [table, action] of [
    ['retrievals', '재인출 기록 삭제'],
    ['submissions', '제출 기록 삭제'],
    ['direct_answer_attempts', '정답 직행 시도 삭제'],
  ] as const) {
    const { error } = await db.from(table).delete().eq('student_id', studentId);
    if (error) dbFail(action, error);
  }
}
