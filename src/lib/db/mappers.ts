// 테이블 행 ↔ 도메인 타입 변환 (순수 함수, DB 호출 없음).
import type { ChallengePublic } from '@/types/challenge';
import type { ReviewCard } from '@/types/professor-cards';
import type { ChallengeSubmission, DirectAnswerAttempt, RetrievalResult } from '@/types/student-records';
import type {
  ChallengeRow,
  DirectAnswerAttemptRow,
  ErrorCardRecord,
  ErrorCardRow,
  RetrievalRow,
  Student,
  StudentRow,
  SubmissionRecord,
  SubmissionRow,
} from './types';

export function toStudent(row: StudentRow): Student {
  return { id: row.id, name: row.name, memberNo: row.member_no, major: row.major };
}

export function toErrorCard(row: ErrorCardRow): ErrorCardRecord {
  return {
    id: row.id,
    courseId: row.course_id,
    conceptId: row.concept_id,
    title: row.title,
    wrongClaim: row.wrong_claim,
    correctClaim: row.correct_claim,
    correctKeywords: row.correct_keywords,
    evidenceId: row.evidence_id ?? '',
    evidence: row.evidence ?? '',
    errorType: row.error_type,
    difficulty: row.difficulty,
    approvalStatus: row.approval_status,
    approvedBy: row.approved_by ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    source: row.source?.source,
    sourceTitle: row.source?.sourceTitle,
    sourceExcerpt: row.source?.sourceExcerpt,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** ReviewCard → 저장할 행 (approved_at·created_at·updated_at은 DB가 채움) */
export function fromReviewCard(
  card: ReviewCard,
  courseId: string,
): Omit<ErrorCardRow, 'approved_at' | 'created_at' | 'updated_at'> {
  const source =
    card.source || card.sourceTitle || card.sourceExcerpt
      ? { source: card.source, sourceTitle: card.sourceTitle, sourceExcerpt: card.sourceExcerpt }
      : null;
  return {
    id: card.id,
    course_id: courseId,
    concept_id: card.conceptId,
    title: card.title,
    wrong_claim: card.wrongClaim,
    correct_claim: card.correctClaim,
    correct_keywords: card.correctKeywords,
    evidence_id: card.evidenceId || null,
    evidence: card.evidence || null,
    source,
    error_type: card.errorType,
    difficulty: card.difficulty,
    approval_status: card.approvalStatus,
    approved_by: card.approvedBy ?? null,
    rejection_reason: card.rejectionReason ?? null,
  };
}

export function toChallengePublic(row: ChallengeRow): ChallengePublic {
  return {
    id: row.id,
    courseId: row.course_id,
    conceptId: row.concept_id,
    conceptName: row.public.conceptName,
    title: row.title,
    question: row.question,
    errorCount: row.error_count,
    claims: row.public.claims,
    evidenceOptions: row.public.evidenceOptions,
  };
}

/** 제출 단위 채점 방식: 주장별 scoredBy에서 계산 (DB 컬럼 없음). 하나라도 keyword면 keyword */
function gradingMethodOf(row: SubmissionRow): ChallengeSubmission['gradingMethod'] {
  const methods = [
    ...row.claim_grades.map((g) => g.scoredBy),
    ...row.error_reveals.map((r) => r.conceptScoredBy),
  ].filter((m): m is 'claude' | 'keyword' => m === 'claude' || m === 'keyword');
  if (methods.length === 0) return undefined;
  return methods.every((m) => m === 'claude') ? 'claude' : 'keyword';
}

export function toSubmission(row: SubmissionRow): SubmissionRecord {
  return {
    id: row.id,
    schemaVersion: row.schema_version,
    studentId: row.student_id,
    courseId: row.course_id,
    challengeId: row.challenge_id,
    conceptId: row.concept_id,
    submittedAt: row.submitted_at,
    grader: row.grader,
    gradingMethod: gradingMethodOf(row),
    answers: row.answers,
    directAnswerFlag: row.direct_answer_flag,
    pastedRatio: row.pasted_ratio,
    falseAlarms: row.false_alarms,
    score: row.score,
    pendingReview: row.pending_review,
    calibration: row.calibration,
    claimGrades: row.claim_grades,
    errorReveals: row.error_reveals,
    beforeSummary: row.before_summary,
    afterExplanation: row.after_explanation ?? undefined,
    afterExplainedAt: row.after_explained_at ?? undefined,
    retrievalScheduledAt: row.retrieval_scheduled_at,
    professorScore: row.professor_score,
    professorComment: row.professor_comment,
    finalizedBy: row.finalized_by,
    finalizedAt: row.finalized_at,
    updatedAt: row.updated_at,
  };
}

/** 새 제출 → 저장할 행 (id·updated_at·교수 필드는 DB 기본값) */
export function fromNewSubmission(
  s: Omit<ChallengeSubmission, 'id' | 'schemaVersion'>,
): Omit<
  SubmissionRow,
  'id' | 'schema_version' | 'updated_at' | 'professor_score' | 'professor_comment' | 'finalized_by' | 'finalized_at'
> {
  return {
    student_id: s.studentId,
    course_id: s.courseId,
    challenge_id: s.challengeId,
    concept_id: s.conceptId,
    submitted_at: s.submittedAt,
    grader: s.grader,
    answers: s.answers,
    score: s.score,
    total: s.score.total,
    calibration: s.calibration,
    false_alarms: s.falseAlarms,
    pending_review: s.pendingReview,
    direct_answer_flag: s.directAnswerFlag,
    pasted_ratio: s.pastedRatio,
    claim_grades: s.claimGrades,
    error_reveals: s.errorReveals,
    before_summary: s.beforeSummary,
    after_explanation: s.afterExplanation ?? null,
    after_explained_at: s.afterExplainedAt ?? null,
    retrieval_scheduled_at: s.retrievalScheduledAt,
  };
}

export function toDirectAnswerAttempt(row: DirectAnswerAttemptRow): DirectAnswerAttempt {
  return {
    id: row.id,
    studentId: row.student_id,
    courseId: row.course_id,
    conversationId: row.conversation_id,
    text: row.text,
    matched: row.matched,
    at: row.at,
  };
}

export function toRetrieval(row: RetrievalRow): RetrievalResult {
  return {
    id: row.id,
    schemaVersion: row.schema_version,
    studentId: row.student_id,
    courseId: row.course_id,
    challengeId: row.challenge_id,
    submissionId: row.submission_id ?? '',
    quizId: row.quiz_id,
    question: row.question,
    answer: row.answer,
    rubric: row.rubric,
    score: row.score,
    feedback: row.feedback,
    submittedAt: row.submitted_at,
  };
}
