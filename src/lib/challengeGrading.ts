// 검증 챌린지 제출 채점 조립 (순수 함수). local mock(학생 화면)과 서버 채점이 같은 함수를 쓴다.
// - 규칙: 판정 정오, 오탐(맞는 주장을 '틀리다') 이유 0점, 오류를 놓치면 개념·근거 0점, 근거 일치, 과정 감점, 합계, 보정
// - 바꿔 끼우는 부분: 본인 생각·개념 설명 점수(ItemGrades). Claude 채점 결과 또는 키워드 규칙(keywordItemGrades)
// node 테스트에서도 불러오도록 값 import는 상대 경로 + .ts 확장자를 쓴다.
import type { ErrorType } from '@/types/content';
import type {
  ChallengeSubmission,
  ClaimAnswer,
  ClaimGrade,
  ErrorReveal,
  GradingMethod,
} from '@/types/student-records';
import { calibrationAccuracy } from './calibration.ts';
import {
  evidenceScore,
  firstSentenceSummary,
  keywordConceptScore,
  keywordReasonGrade,
  pastedReasonRatio,
  ruleReasonFeedback,
} from './reasoning.ts';
import { retrievalDate } from './schedule.ts';
import {
  claimReasoningScore,
  countFalseAlarms,
  errorClaimPoint,
  isFalseAlarm,
  judgmentPoint,
  pendingReviewItems,
  processPenalty,
  reasoningPoint,
  totalScore,
} from './scoring.ts';

/** 채점 기준이 되는 주장 (서버 전용 정답 정보 포함. 제출 후에만 쓴다) */
export interface GradingClaim {
  claimId: string;
  isError: boolean;
  /** 해설 (맞는 주장은 왜 맞는지, 오류 주장은 무엇이 틀렸는지) */
  explanation: string;
  /** 오류 주장이면 교수 승인 오류 카드 정보 */
  errorCard?: {
    errorType: ErrorType;
    correctClaim: string;
    correctKeywords: string[];
    evidenceId: string;
    evidenceLabel: string;
  };
}

export interface ItemScore {
  /** 0~2 */
  score: number;
  feedback: string;
}

/** 본인 생각·개념 설명 채점 결과 (Claude 또는 키워드 규칙) */
export interface ItemGrades {
  method: GradingMethod;
  /** 주장 id → 본인 생각 점수 */
  reasoning: Record<string, ItemScore>;
  /** 오류를 찾은('틀리다') 오류 주장 id → 개념 설명 점수 */
  concept: Record<string, ItemScore>;
  /** 해설 전 생각 요약. 비면 오류 주장 이유의 첫 문장 */
  beforeSummary: string;
}

const MISSED_CONCEPT_FEEDBACK = '오류를 찾지 못해 이 주장의 개념 점수는 0이에요. 해설을 읽고 다시 설명해 보세요.';

function clampItem(score: number): number {
  return Math.min(2, Math.max(0, Math.round(score)));
}

/** 오류 주장 중 학생이 '틀리다'로 찾은 것 (개념 설명을 채점할 대상) */
export function conceptTargets(claims: readonly GradingClaim[], answers: readonly ClaimAnswer[]): GradingClaim[] {
  return claims.filter((c) => c.isError && answers.find((a) => a.claimId === c.claimId)?.judgment === 'wrong');
}

/**
 * 키워드 규칙 채점 (local mock, Claude 실패 시 대체).
 * 예) 20자 이상 + 개념 키워드 → 2, 정답 키워드 2개 이상 들어간 수정 설명 → 개념 2
 */
export function keywordItemGrades(
  claims: readonly GradingClaim[],
  answers: readonly ClaimAnswer[],
  reasonKeywords: readonly string[],
): ItemGrades {
  const reasoning: Record<string, ItemScore> = {};
  for (const answer of answers) {
    const claim = claims.find((c) => c.claimId === answer.claimId);
    const { score, basis } = keywordReasonGrade(answer.reasoning, reasonKeywords);
    reasoning[answer.claimId] = {
      score,
      feedback: ruleReasonFeedback(score, claim ? isFalseAlarm(claim.isError, answer.judgment) : false, {
        basis,
        missedError: claim?.isError === true && answer.judgment === 'correct',
      }),
    };
  }
  const concept: Record<string, ItemScore> = {};
  for (const target of conceptTargets(claims, answers)) {
    const answer = answers.find((a) => a.claimId === target.claimId);
    const score = keywordConceptScore(answer?.correction, target.errorCard?.correctKeywords ?? []);
    concept[target.claimId] = {
      score,
      feedback:
        score === 2
          ? '정답 설명의 핵심을 짚었어요.'
          : score === 1
            ? '정답 설명의 일부만 담겼어요. 해설과 비교해 보세요.'
            : '정답 설명과 거리가 있어요. 해설을 읽고 다시 정리해 보세요.',
    };
  }
  const firstError = claims.find((c) => c.isError);
  const errorReasoning = firstError ? (answers.find((a) => a.claimId === firstError.claimId)?.reasoning ?? '') : '';
  return { method: 'keyword', reasoning, concept, beforeSummary: firstSentenceSummary(errorReasoning) };
}

export interface BuildSubmissionInput {
  studentId: string;
  courseId: string;
  challengeId: string;
  conceptId: string;
  grader: ChallengeSubmission['grader'];
  /** 채점 기준 주장 (챌린지 주장 순서) */
  claims: readonly GradingClaim[];
  /** 학생 답 (claims와 같은 순서, 모든 주장에 하나씩) */
  answers: readonly ClaimAnswer[];
  items: ItemGrades;
  directAnswerFlag: boolean;
  submittedAt: string;
}

/**
 * 채점된 제출 기록을 만든다 (id·schemaVersion 제외).
 * 예) 설계안 예시 답안 + 모든 항목 2점 → total 7 / 전부 '틀리다' → 판정 0, 오탐 2개 이유 0점
 */
export function buildGradedSubmission(input: BuildSubmissionInput): Omit<ChallengeSubmission, 'id' | 'schemaVersion'> {
  const { claims, answers, items } = input;
  if (claims.length !== answers.length || claims.some((c, i) => c.claimId !== answers[i].claimId)) {
    throw new Error('주장과 답의 순서가 맞지 않아요');
  }

  const claimGrades: ClaimGrade[] = [];
  const errorReveals: ErrorReveal[] = [];
  const reasoningScores: number[] = [];
  const conceptScores: number[] = [];
  const evidenceScores: number[] = [];

  claims.forEach((claim, i) => {
    const answer = answers[i];
    const falseAlarm = isFalseAlarm(claim.isError, answer.judgment);
    const item = items.reasoning[claim.claimId];
    const reasoningScore = claimReasoningScore(clampItem(item?.score ?? 0), claim.isError, answer.judgment);
    reasoningScores.push(reasoningScore);
    claimGrades.push({
      claimId: claim.claimId,
      isError: claim.isError,
      judgmentCorrect: answer.judgment === (claim.isError ? 'wrong' : 'correct'),
      reasoningScore,
      scoredBy: falseAlarm ? 'rule' : items.method,
      explanation: claim.explanation,
      feedback: falseAlarm ? ruleReasonFeedback(0, true) : (item?.feedback ?? ruleReasonFeedback(reasoningScore, false)),
    });

    if (claim.isError && claim.errorCard) {
      const found = answer.judgment === 'wrong';
      const conceptItem = found ? items.concept[claim.claimId] : undefined;
      const conceptScore = found ? clampItem(conceptItem?.score ?? 0) : 0;
      const evScore = found ? evidenceScore(answer.evidenceId, claim.errorCard.evidenceId) : 0;
      conceptScores.push(conceptScore);
      evidenceScores.push(evScore);
      errorReveals.push({
        claimId: claim.claimId,
        errorType: claim.errorCard.errorType,
        correctClaim: claim.errorCard.correctClaim,
        explanation: claim.explanation,
        evidenceId: claim.errorCard.evidenceId,
        evidenceLabel: claim.errorCard.evidenceLabel,
        conceptScore,
        conceptScoredBy: found ? items.method : 'rule',
        conceptFeedback: found ? conceptItem?.feedback : MISSED_CONCEPT_FEEDBACK,
        evidenceScore: evScore,
      });
    }
  });

  const pastedRatio = pastedReasonRatio(answers);
  const score = totalScore({
    judgment: judgmentPoint(claimGrades.map((g) => g.judgmentCorrect)),
    reasoning: reasoningPoint(reasoningScores),
    concept: errorClaimPoint(conceptScores),
    evidence: errorClaimPoint(evidenceScores),
    penalty: processPenalty(input.directAnswerFlag, pastedRatio),
  });
  const calibration = calibrationAccuracy(
    claimGrades.map((g, i) => ({ claimId: g.claimId, confidence: answers[i].confidence, correct: g.judgmentCorrect })),
  );
  const firstError = claims.find((c) => c.isError);
  const errorReasoning = firstError ? (answers.find((a) => a.claimId === firstError.claimId)?.reasoning ?? '') : '';

  return {
    studentId: input.studentId,
    courseId: input.courseId,
    challengeId: input.challengeId,
    conceptId: input.conceptId,
    submittedAt: input.submittedAt,
    grader: input.grader,
    gradingMethod: items.method,
    answers: [...answers],
    directAnswerFlag: input.directAnswerFlag,
    pastedRatio,
    falseAlarms: countFalseAlarms(claims.map((c, i) => ({ isError: c.isError, judgment: answers[i].judgment }))),
    score,
    pendingReview: pendingReviewItems(score),
    calibration,
    claimGrades,
    errorReveals,
    beforeSummary: items.beforeSummary.trim() || firstSentenceSummary(errorReasoning),
    retrievalScheduledAt: retrievalDate(input.submittedAt),
  };
}
