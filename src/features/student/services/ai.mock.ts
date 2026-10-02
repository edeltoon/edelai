// 검증 챌린지 mock (서버 챌린지 API가 생기기 전 임시). 계약은 ai.types.ts와 같다.
// 채점은 src/lib의 키워드 규칙으로 하고, 결과에 grader: 'mock'을 남긴다(화면에 "시연용 예시 채점" 표시).
// 정답 키는 제출할 때만 동적 import한다. 이 파일 위쪽에서 answerKey를 정적 import하지 말 것.
import { calibrationAccuracy } from '@/lib/calibration';
import { inputProgress } from '@/lib/challengeInput';
import { evidenceScore, keywordConceptScore, keywordReasonScore, pastedReasonRatio } from '@/lib/reasoning';
import { errorClaimPoint, judgmentPoint, processPenalty, reasoningPoint, totalScore } from '@/lib/scoring';
import { retrievalDate } from '@/lib/schedule';
import { RECORD_SCHEMA_VERSION, type ClaimGrade, type ErrorReveal } from '@/types/student-records';
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

/** 해설 전 생각 요약: 오류 주장에 쓴 본인 생각의 첫 문장 (mock). 서버는 AI 요약으로 대체 */
function summarizeBefore(reasoning: string): string {
  const first = reasoning.split(/(?<=[.!?。])\s+|\n+/)[0]?.trim() ?? '';
  return first.length > 60 ? `${first.slice(0, 60)}…` : first;
}

export async function submitChallengeMock(
  challengeId: string,
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

  const claimGrades: ClaimGrade[] = [];
  const errorReveals: ErrorReveal[] = [];
  const conceptScores: number[] = [];
  const evidenceScores: number[] = [];

  for (const answer of answers) {
    const k = key.claims.find((c) => c.claimId === answer.claimId);
    if (!k) return fail('CHALLENGE_KEY_MISMATCH', '채점 기준을 찾을 수 없어요.');
    const truth = k.isError ? 'wrong' : 'correct';
    const reasoningScore = keywordReasonScore(answer.reasoning, key.reasonKeywords);
    claimGrades.push({
      claimId: answer.claimId,
      isError: k.isError,
      judgmentCorrect: answer.judgment === truth,
      reasoningScore,
      explanation: k.explanation,
      feedback:
        reasoningScore === 2
          ? '수업 개념을 들어 판단 이유를 설명했어요.'
          : reasoningScore === 1
            ? '이유는 썼지만 수업 개념과의 연결이 약해요.'
            : '이유를 20자 이상, 수업 개념과 연결해 써 보세요.',
    });

    if (k.isError && k.errorCard) {
      const found = answer.judgment === 'wrong';
      // 오류를 놓쳤다면(맞다로 판정) 개념·근거 점수는 0
      const conceptScore = found ? keywordConceptScore(answer.correction, k.errorCard.correctKeywords) : 0;
      const evScore = found ? evidenceScore(answer.evidenceId, k.errorCard.evidenceId) : 0;
      conceptScores.push(conceptScore);
      evidenceScores.push(evScore);
      errorReveals.push({
        claimId: answer.claimId,
        errorType: k.errorCard.errorType,
        correctClaim: k.errorCard.correctClaim,
        explanation: k.explanation,
        evidenceId: k.errorCard.evidenceId,
        evidenceLabel: getEvidence(k.errorCard.evidenceId)?.label ?? '강의자료',
        conceptScore,
        evidenceScore: evScore,
      });
    }
  }

  const pastedRatio = pastedReasonRatio(answers);
  const score = totalScore({
    judgment: judgmentPoint(claimGrades.map((g) => g.judgmentCorrect)),
    reasoning: reasoningPoint(claimGrades.map((g) => g.reasoningScore)),
    concept: errorClaimPoint(conceptScores),
    evidence: errorClaimPoint(evidenceScores),
    penalty: processPenalty(req.directAnswerFlag, pastedRatio),
  });
  const calibration = calibrationAccuracy(
    claimGrades.map((g, i) => ({ claimId: g.claimId, confidence: answers[i].confidence, correct: g.judgmentCorrect })),
  );
  const firstError = errorReveals[0];
  const beforeSource = firstError ? answers.find((a) => a.claimId === firstError.claimId)?.reasoning ?? '' : '';
  const submittedAt = new Date().toISOString();

  return {
    ok: true,
    submission: {
      id: newId('sub'),
      schemaVersion: RECORD_SCHEMA_VERSION,
      studentId: req.studentId,
      courseId: req.courseId,
      challengeId,
      conceptId: challenge.conceptId,
      submittedAt,
      grader: 'mock',
      answers,
      directAnswerFlag: req.directAnswerFlag,
      pastedRatio,
      score,
      calibration,
      claimGrades,
      errorReveals,
      beforeSummary: summarizeBefore(beforeSource),
      retrievalScheduledAt: retrievalDate(submittedAt),
    },
  };
}
