// 검증 챌린지 mock (local 모드). 응답 형태는 store.types.ts 서버 API 계약과 같다.
// 채점은 src/lib의 키워드 규칙으로 하고, 결과에 grader: 'mock'을 남긴다(화면에 "시연용 예시 채점" 표시).
// 정답 키는 제출할 때만 동적 import한다. 이 파일 위쪽에서 answerKey를 정적 import하지 말 것.
import { buildGradedSubmission, keywordItemGrades, type GradingClaim } from '@/lib/challengeGrading';
import { inputProgress } from '@/lib/challengeInput';
import { RECORD_SCHEMA_VERSION } from '@/types/student-records';
import { getChallengePublic } from '../content/challenges';
import { getEvidence } from '../content/lecture';
import type { GetChallengeResponse, SubmitChallengeRequest, SubmitChallengeResponse } from './ai.types';
import { newId } from './ids';

function wait(min: number, max: number) {
  return new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));
}

const fail = (code: string, message: string) => ({ ok: false as const, error: { code, message } });

export async function getChallengeMock(challengeId: string): Promise<GetChallengeResponse> {
  await wait(150, 300);
  const challenge = getChallengePublic(challengeId);
  return challenge ? { ok: true, challenge } : fail('CHALLENGE_NOT_FOUND', '챌린지를 찾을 수 없어요.');
}

export async function submitChallengeMock(
  challengeId: string,
  studentId: string,
  req: SubmitChallengeRequest,
): Promise<SubmitChallengeResponse> {
  const challenge = getChallengePublic(challengeId);
  if (!challenge) return fail('CHALLENGE_NOT_FOUND', '챌린지를 찾을 수 없어요.');

  const ordered = challenge.claims.map((c) => req.answers.find((a) => a.claimId === c.id));
  if (ordered.some((a) => !a) || !inputProgress(req.answers).complete || req.answers.length !== challenge.claims.length) {
    return fail('INCOMPLETE_SUBMISSION', '모든 주장에 판정·확신도·본인 생각을 채워 주세요.');
  }
  const answers = ordered as NonNullable<(typeof ordered)[number]>[];

  await wait(900, 1400);
  const { getChallengeKey } = await import('./mock/answerKey');
  const key = getChallengeKey(challengeId);
  if (!key) return fail('CHALLENGE_NOT_APPROVED', '교수님이 승인한 챌린지가 아니에요.');

  // 공용 채점 조립(src/lib/challengeGrading)에 키워드 규칙 점수를 끼운다. 서버 채점과 같은 규칙
  const claims: GradingClaim[] = [];
  for (const answer of answers) {
    const k = key.claims.find((c) => c.claimId === answer.claimId);
    if (!k) return fail('CHALLENGE_KEY_MISMATCH', '채점 기준을 찾을 수 없어요.');
    claims.push({
      claimId: k.claimId,
      isError: k.isError,
      explanation: k.explanation,
      errorCard: k.errorCard
        ? {
            errorType: k.errorCard.errorType,
            correctClaim: k.errorCard.correctClaim,
            correctKeywords: k.errorCard.correctKeywords,
            evidenceId: k.errorCard.evidenceId,
            evidenceLabel: getEvidence(k.errorCard.evidenceId)?.label ?? '강의자료',
          }
        : undefined,
    });
  }

  const graded = buildGradedSubmission({
    studentId,
    courseId: req.courseId,
    challengeId,
    conceptId: challenge.conceptId,
    grader: 'mock',
    claims,
    answers,
    items: keywordItemGrades(claims, answers, key.reasonKeywords),
    directAnswerFlag: req.directAnswerFlag,
    submittedAt: new Date().toISOString(),
  });

  return { ok: true, submission: { id: newId('sub'), schemaVersion: RECORD_SCHEMA_VERSION, ...graded } };
}
