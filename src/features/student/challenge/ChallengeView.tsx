'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { inputProgress, isThoughtComplete } from '@/lib/challengeInput';
import { hasDirectAnswerSince } from '@/lib/directAnswer';
import type { ChallengeSubmission, ClaimAnswer } from '@/types/student-records';
import { getChallenge, IS_MOCK_GRADING, submitChallenge } from '../services/ai';
import type { ChallengePublic } from '../services/store.types';
import { studentStore } from '../services/store';
import { studentRoutes } from '../routes';
import { useStudent } from '../StudentSession';
import { ClaimCard } from './ClaimCard';
import { ThinkingPanel } from './ThinkingPanel';
import { problemOf, type LoadProblem } from './display';
import { PrimaryLink, SecondaryButton, SecondaryLink, StateNotice } from './StateNotice';
import { useChallengeDraft } from './useChallengeDraft';

type Load =
  | { status: 'loading' }
  | { status: 'problem'; problem: LoadProblem }
  | { status: 'submitted'; challenge: ChallengePublic; submission: ChallengeSubmission }
  | { status: 'ready'; challenge: ChallengePublic };

/** 검증 챌린지 풀이: 오류 개수만 공개, 주장별 판정·확신도·이유를 모두 써야 제출 */
export function ChallengeView({ courseId, challengeId }: { courseId: string; challengeId: string }) {
  const student = useStudent();
  const router = useRouter();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await getChallenge(challengeId);
      if (!alive) return;
      if (!res.ok) return setLoad({ status: 'problem', problem: problemOf(res.error) });
      try {
        const latest = await studentStore.getLatestSubmission(student.userId, challengeId);
        if (!alive) return;
        setLoad(latest ? { status: 'submitted', challenge: res.challenge, submission: latest } : { status: 'ready', challenge: res.challenge });
      } catch (e) {
        if (alive) setLoad({ status: 'problem', problem: { kind: 'error', message: e instanceof Error ? e.message : '기록을 불러오지 못했어요.' } });
      }
    })();
    return () => {
      alive = false;
    };
  }, [challengeId, student.userId, attempt]);

  const retry = useCallback(() => {
    setLoad({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  if (load.status === 'loading') {
    return <p className="px-8 py-10 text-body text-ink-sub" role="status">챌린지를 불러오고 있어요…</p>;
  }
  if (load.status === 'problem') {
    const { problem } = load;
    if (problem.kind === 'not_approved') {
      return (
        <StateNotice
          tone="challenge"
          title="교수님이 아직 챌린지를 열지 않았어요"
          body="교수님이 이 챌린지의 오류 카드를 승인하면 바로 풀 수 있어요. 그동안 자유 학습에서 개념을 먼저 정리해 보세요."
          actions={
            <>
              <SecondaryButton onClick={retry}>다시 확인하기</SecondaryButton>
              <SecondaryLink href={studentRoutes.freeStudy(courseId)}>자유 학습으로 가기</SecondaryLink>
            </>
          }
        />
      );
    }
    if (problem.kind === 'login') {
      return (
        <StateNotice tone="wrong" title="다시 로그인해 주세요" body={problem.message} actions={<PrimaryLink href="/">로그인 화면으로</PrimaryLink>} />
      );
    }
    return (
      <StateNotice tone="wrong" title="챌린지를 불러오지 못했어요" body={problem.message} actions={<SecondaryButton onClick={retry}>다시 시도하기</SecondaryButton>} />
    );
  }
  if (load.status === 'submitted') {
    return (
      <StateNotice
        title="이미 제출한 챌린지예요"
        body={`${load.submission.score.total}점으로 제출했어요. 해설과 내 생각 비교는 결과 화면에서 볼 수 있어요. 정답이 공개된 챌린지는 다시 풀 수 없어요.`}
        actions={
          <>
            <PrimaryLink href={studentRoutes.result(courseId, challengeId)}>결과·해설 보기</PrimaryLink>
            <SecondaryLink href={studentRoutes.challenges(courseId)}>챌린지 목록</SecondaryLink>
          </>
        }
      />
    );
  }

  return (
    <ChallengeForm
      courseId={courseId}
      challenge={load.challenge}
      onSubmitted={() => router.push(studentRoutes.result(courseId, load.challenge.id))}
    />
  );
}

function ChallengeForm({
  courseId,
  challenge,
  onSubmitted,
}: {
  courseId: string;
  challenge: ChallengePublic;
  onSubmitted: () => void;
}) {
  const student = useStudent();
  const claimIds = challenge.claims.map((c) => c.id);
  const { draft, updateAnswer, select, clear } = useChallengeDraft(student.userId, challenge.id, claimIds);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<LoadProblem | null>(null);
  const inFlight = useRef(false);

  if (!draft) return <p className="px-8 py-10 text-body text-ink-sub" role="status">입력을 불러오고 있어요…</p>;

  const inputs = challenge.claims.map((c) => draft.answers[c.id]);
  const progress = inputProgress(inputs);
  const selected = challenge.claims.find((c) => c.id === draft.selectedClaimId) ?? challenge.claims[0];
  const firstMissing = challenge.claims.find((c, i) => {
    const a = inputs[i];
    return a.judgment === undefined || a.confidence === undefined || !isThoughtComplete(a);
  });

  async function submit() {
    if (inFlight.current || !progress.complete || !draft) return;
    inFlight.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const answers: ClaimAnswer[] = challenge.claims.map((c) => {
        const a = draft.answers[c.id];
        const wrong = a.judgment === 'wrong';
        return {
          claimId: c.id,
          judgment: a.judgment!,
          confidence: a.confidence!,
          reasoning: a.reasoning.trim(),
          ...(wrong ? { correction: a.correction.trim(), evidenceId: a.evidenceId } : {}),
          pastedChars: a.pastedChars,
        };
      });
      // 정답 직행 태그: 직전 제출 이후 같은 과목의 시도 (server 모드는 서버도 다시 계산)
      let directAnswerFlag = false;
      try {
        const [attempts, last] = await Promise.all([
          studentStore.listDirectAnswerAttempts(student.userId),
          studentStore.getLatestSubmission(student.userId, challenge.id),
        ]);
        directAnswerFlag = hasDirectAnswerSince(attempts, courseId, last?.submittedAt ?? null);
      } catch {
        directAnswerFlag = false;
      }
      const res = await submitChallenge(challenge.id, student.userId, {
        courseId,
        answers,
        directAnswerFlag,
        startedAt: draft.startedAt,
      });
      if (!res.ok) {
        setSubmitError(problemOf(res.error));
        return;
      }
      await studentStore.saveSubmission(res.submission);
      await clear();
      onSubmitted();
    } catch (e) {
      setSubmitError({ kind: 'error', message: e instanceof Error ? e.message : '제출하지 못했어요. 다시 시도해 주세요.' });
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-8">
        <h1 className="text-title font-bold text-ink">
          검증 챌린지 · {challenge.title}
        </h1>
        <span className="rounded-full bg-sejong-soft px-3 py-1 text-caption font-semibold text-sejong">제출 전 · 정답 비공개</span>
      </div>

      <div className="px-4 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-block bg-challenge-bg px-5 py-4">
          <p className="text-lead font-bold text-challenge">이 답변에는 오류가 {challenge.errorCount}개 있습니다.</p>
          <p className="text-body text-challenge">오류의 위치는 직접 찾아보세요.</p>
        </div>
        <p className="mt-3 text-caption text-ink-sub">AI 답변을 만든 질문: {challenge.question}</p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            {challenge.claims.map((claim) => (
              <ClaimCard
                key={claim.id}
                claim={claim}
                answer={draft.answers[claim.id]}
                selected={claim.id === selected.id}
                disabled={submitting}
                onSelect={() => select(claim.id)}
                onJudge={(judgment) => updateAnswer(claim.id, { judgment })}
                onConfidence={(confidence) => updateAnswer(claim.id, { confidence })}
              />
            ))}
          </div>

          <div className="rounded-block border border-line bg-page px-5 py-5 lg:self-start">
            <ThinkingPanel
              claim={selected}
              answer={draft.answers[selected.id]}
              evidenceOptions={challenge.evidenceOptions}
              disabled={submitting}
              onChange={(patch) => updateAnswer(selected.id, patch)}
            />

            <p className={`mt-5 text-body ${progress.complete ? 'text-correct' : 'text-ink-sub'}`} aria-live="polite">
              {progress.complete ? '✓ ' : ''}판정 {progress.judged}/{progress.total} · 확신도 {progress.confident}/{progress.total} · 본인 생각 {progress.thought}/{progress.total}
            </p>

            <button
              type="button"
              onClick={submit}
              disabled={!progress.complete || submitting}
              aria-busy={submitting}
              className="mt-3 h-12 w-full rounded-control bg-sejong px-4 text-body font-semibold text-(--color-page) disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? '채점하고 있어요…' : progress.complete ? '제출하고 정답·해설 보기' : '왜 그렇게 생각했는지 먼저 적어보세요'}
            </button>
            <p className="mt-2 text-center text-caption text-ink-sub" aria-live="polite">
              {submitting
                ? IS_MOCK_GRADING
                  ? '시연용 예시 채점 중이에요.'
                  : 'AI가 이유와 개념 설명을 채점하고 있어요. 5~10초 걸려요. 창을 닫지 말아 주세요.'
                : progress.complete
                  ? '제출하면 정답과 해설이 열려요. 제출 후에는 고칠 수 없어요.'
                  : firstMissing
                    ? `주장 ${firstMissing.label}의 판정·확신도·이유를 채워 주세요. 판정·확신도·이유를 모두 쓰면 해설이 열립니다.`
                    : '판정·확신도·이유를 모두 쓰면 해설이 열립니다.'}
            </p>
            {submitError && (
              <p role="alert" className="mt-3 rounded-control bg-wrong-bg px-3 py-2 text-body text-wrong">
                {submitError.kind === 'not_approved'
                  ? '교수님이 챌린지를 다시 닫았어요. 잠시 후 다시 시도해 주세요.'
                  : submitError.kind === 'login'
                    ? `${submitError.message} 로그인 화면에서 다시 로그인해 주세요.`
                    : submitError.message}
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 rounded-block bg-caution-bg px-5 py-3 text-body text-caution">
          정답 직행은 검증 과정으로 안내합니다. 답 복사와 필수 과정 누락이 함께 확인되면 과정 점수 -2를 교수님이 검토합니다.
        </p>
      </div>
    </div>
  );
}
