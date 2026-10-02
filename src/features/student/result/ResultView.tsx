'use client';

import { useCallback, useEffect, useState } from 'react';
import { overconfidentClaimIds } from '@/lib/calibration';
import type { ChallengeSubmission } from '@/types/student-records';
import { getChallengePublic } from '../content/challenges';
import { getChallenge, saveAfterExplanation } from '../services/ai';
import type { ChallengePublic } from '../services/store.types';
import { studentStore } from '../services/store';
import { studentRoutes } from '../routes';
import { useStudent } from '../StudentSession';
import { monthDay, pointText, problemOf, type LoadProblem } from '../challenge/display';
import { PrimaryLink, SecondaryButton, SecondaryLink, StateNotice } from '../challenge/StateNotice';

type Load =
  | { status: 'loading' }
  | { status: 'problem'; problem: LoadProblem }
  | { status: 'empty' }
  | { status: 'ready'; submission: ChallengeSubmission; challenge: ChallengePublic };

const REVEAL_STEP_MS = 120;

/** 제출 직후 해설: 점수·내역, 오류 공개, 모든 주장 해설, 해설 전후 설명, 재인출 예약 */
export function ResultView({ courseId, challengeId }: { courseId: string; challengeId: string }) {
  const student = useStudent();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const submission = await studentStore.getLatestSubmission(student.userId, challengeId);
        if (!alive) return;
        if (!submission) return setLoad({ status: 'empty' });
        // 주장 문장은 챌린지 공개 정보에서 (승인이 바뀌어 못 불러오면 화면용 공개 데이터)
        const res = await getChallenge(challengeId);
        const challenge = res.ok ? res.challenge : getChallengePublic(challengeId);
        if (!alive) return;
        if (!challenge) return setLoad({ status: 'problem', problem: { kind: 'error', message: '챌린지 정보를 찾을 수 없어요.' } });
        setLoad({ status: 'ready', submission, challenge });
      } catch (e) {
        if (!alive) return;
        const message = e instanceof Error ? e.message : '기록을 불러오지 못했어요.';
        const code = (e as { code?: string }).code;
        setLoad({ status: 'problem', problem: code ? problemOf({ code, message }) : { kind: 'error', message } });
      }
    })();
    return () => {
      alive = false;
    };
  }, [challengeId, student.userId, attempt]);

  if (load.status === 'loading') return <p className="px-8 py-10 text-body text-ink-sub" role="status">결과를 불러오고 있어요…</p>;
  if (load.status === 'empty') {
    return (
      <StateNotice
        title="아직 제출하지 않은 챌린지예요"
        body="주장별 판정·확신도·이유를 모두 써서 제출하면 정답과 해설이 열려요."
        actions={<PrimaryLink href={studentRoutes.challenge(courseId, challengeId)}>챌린지 풀러 가기</PrimaryLink>}
      />
    );
  }
  if (load.status === 'problem') {
    return load.problem.kind === 'login' ? (
      <StateNotice tone="wrong" title="다시 로그인해 주세요" body={load.problem.message} actions={<PrimaryLink href="/">로그인 화면으로</PrimaryLink>} />
    ) : (
      <StateNotice
        tone="wrong"
        title="결과를 불러오지 못했어요"
        body={load.problem.kind === 'error' ? load.problem.message : '잠시 후 다시 시도해 주세요.'}
        actions={<SecondaryButton onClick={() => { setLoad({ status: 'loading' }); setAttempt((n) => n + 1); }}>다시 시도하기</SecondaryButton>}
      />
    );
  }
  return <ResultBody courseId={courseId} challenge={load.challenge} initial={load.submission} />;
}

function ResultBody({ courseId, challenge, initial }: { courseId: string; challenge: ChallengePublic; initial: ChallengeSubmission }) {
  const [submission, setSubmission] = useState(initial);
  const [revealed, setRevealed] = useState(0);
  const { score } = submission;

  // 유일한 연출: 주장 해설을 위에서부터 120ms 간격으로 펼친다 (reduced-motion은 전역 CSS가 전환을 끔)
  useEffect(() => {
    const total = challenge.claims.length;
    const timer = setInterval(() => setRevealed((n) => (n >= total ? n : n + 1)), REVEAL_STEP_MS);
    return () => clearInterval(timer);
  }, [challenge.claims.length]);

  const label = (claimId: string) => challenge.claims.find((c) => c.id === claimId)?.label ?? '?';
  const overconfident = overconfidentClaimIds(
    submission.claimGrades.map((g) => ({
      claimId: g.claimId,
      confidence: submission.answers.find((a) => a.claimId === g.claimId)?.confidence ?? 0,
      correct: g.judgmentCorrect,
    })),
  );
  const pending = submission.pendingReview ?? [];
  const keywordFallback = submission.grader === 'server' && submission.gradingMethod === 'keyword';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-8">
        <h1 className="text-title font-bold text-ink">검증이 완료됐어요</h1>
        <span className="rounded-full bg-correct-bg px-3 py-1 text-caption font-semibold text-correct">제출 직후</span>
      </div>

      <div className="mx-auto w-full max-w-[880px] px-4 py-6 sm:px-8">
        {/* 점수 */}
        <section aria-label="점수" className="rounded-block bg-sejong-soft px-6 py-5">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <p className="tabular text-hero font-bold leading-none text-sejong">+{score.total}점</p>
            <p className="tabular text-body text-sejong">
              판정 {pointText(score.judgment)} · 이유 {pointText(score.reasoning)}
              <br />
              개념 {pointText(score.concept)} · 근거 {pointText(score.evidence)}
              {score.penalty !== 0 && <> · 과정 {pointText(score.penalty)}</>}
            </p>
            <p className="tabular ml-auto text-caption text-ink-sub">
              확신도 보정 정확도 <span className="text-body font-semibold text-ink">{submission.calibration}</span>/100
            </p>
          </div>
          <ul className="mt-3 space-y-1 text-caption text-ink-sub">
            {keywordFallback && <li>· AI 채점이 원활하지 않아 이유·개념 점수는 키워드 규칙으로 매겼어요. 교수님이 다시 확인할 수 있어요.</li>}
            {submission.grader === 'mock' && <li>· 시연용 예시 채점이에요(키워드 규칙).</li>}
            {pending.length > 0 && (
              <li>· 교수 채점 대기: {pending.map((p) => (p === 'reasoning' ? '이유' : '개념')).join('·')} 점수는 교수님이 확인한 뒤 확정돼요.</li>
            )}
            {score.penalty !== 0 && <li>· 정답 직행 요청 뒤 이유를 붙여넣기로 채워 과정 점수가 깎였어요. 교수님이 검토해요.</li>}
            <li>· AI 채점은 보조 지표이며 교수님이 조정할 수 있어요.</li>
          </ul>
        </section>

        {/* 오류 공개 */}
        {submission.errorReveals.map((r) => (
          <section key={r.claimId} className="mt-8" aria-label={`오류 공개 주장 ${label(r.claimId)}`}>
            <h2 className="text-lead font-bold text-ink">
              오류 공개 · 주장 {label(r.claimId)} <span className="ml-2 rounded-control bg-wrong-bg px-2 py-0.5 text-caption font-semibold text-wrong">{r.errorType}</span>
            </h2>
            <p className="mt-3 max-w-[720px] text-lead text-ink">{r.explanation}</p>
            <p className="mt-2 max-w-[720px] text-body text-ink">
              <span className="font-semibold">바른 설명</span> {r.correctClaim}
            </p>
            <p className="mt-2 text-caption text-ink-sub">근거: {r.evidenceLabel}</p>
            {r.conceptFeedback && (
              <p className="mt-2 text-body text-ink-sub">
                내 개념 설명 {pointText(r.conceptScore)} · {r.conceptFeedback}
              </p>
            )}
          </section>
        ))}

        {/* 해설 전 생각 vs 해설 후 내 설명 */}
        <BeforeAfter submission={submission} onSaved={setSubmission} />

        {/* 모든 주장 해설 (해설 필수) */}
        <section className="mt-8" aria-label="주장별 해설">
          <h2 className="text-lead font-bold text-ink">주장별 해설</h2>
          {submission.falseAlarms > 0 && (
            <p className="mt-1 text-body text-ink-sub">맞는 주장을 맞다고 인정하는 것도 실력이에요. 오탐한 주장은 이유 점수가 0점이에요.</p>
          )}
          <ol className="mt-3 space-y-3">
            {submission.claimGrades.map((g, i) => {
              const claim = challenge.claims.find((c) => c.id === g.claimId);
              const answer = submission.answers.find((a) => a.claimId === g.claimId);
              const shown = i < revealed;
              return (
                <li
                  key={g.claimId}
                  className={`rounded-block border px-5 py-4 transition-all duration-300 ${
                    shown ? (g.judgmentCorrect ? 'border-correct-bg bg-correct-bg' : 'border-wrong-bg bg-wrong-bg') : 'border-line bg-page'
                  } ${shown ? 'opacity-100' : 'translate-y-1 opacity-40'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-body text-ink">
                      <span className="mr-2 font-semibold">{claim?.label}</span>
                      {claim?.text}
                    </p>
                    <span className={`shrink-0 text-body font-semibold ${g.judgmentCorrect ? 'text-correct' : 'text-wrong'}`}>
                      {g.judgmentCorrect ? '맞음' : '틀림'}
                    </span>
                  </div>
                  <p className="tabular mt-1 text-caption text-ink-sub">
                    내 판정 {answer?.judgment === 'wrong' ? '틀리다' : '맞다'} · 확신도 {answer?.confidence} · 실제 {g.isError ? '오류 주장' : '맞는 주장'}
                  </p>
                  <p className="mt-2 text-body text-ink">{g.explanation}</p>
                  <p className="mt-2 text-caption text-ink-sub">
                    내 이유 {pointText(g.reasoningScore)}
                    {g.scoredBy === 'keyword' && submission.grader === 'server' ? ' (키워드 규칙)' : ''}: “{answer?.reasoning}”
                  </p>
                  {g.feedback && <p className="mt-1 text-caption text-ink">{g.feedback}</p>}
                </li>
              );
            })}
          </ol>
        </section>

        {overconfident.length > 0 && (
          <section className="mt-6 rounded-block border border-challenge-border bg-challenge-bg px-5 py-4" aria-label="확신했지만 틀린 주장">
            <h2 className="text-body font-bold text-challenge">확신했지만 틀린 주장</h2>
            <p className="mt-1 text-body text-ink">
              주장 {overconfident.map(label).join(', ')}은(는) 확신도 80 이상이었지만 판정이 틀렸어요. 이 부분을 다시 정리해 보세요.
            </p>
          </section>
        )}

        <p className="mt-6 rounded-block bg-correct-bg px-5 py-3 text-body text-correct">
          1주 뒤 재인출 퀴즈 예약 · {monthDay(submission.retrievalScheduledAt)}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <SecondaryLink href={studentRoutes.challenges(courseId)}>챌린지 목록</SecondaryLink>
          <SecondaryLink href={studentRoutes.freeStudy(courseId)}>자유 학습으로 가기</SecondaryLink>
        </div>
      </div>
    </div>
  );
}

function BeforeAfter({ submission, onSaved }: { submission: ChallengeSubmission; onSaved: (s: ChallengeSubmission) => void }) {
  const [editing, setEditing] = useState(!submission.afterExplanation);
  const [text, setText] = useState(submission.afterExplanation ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const res = await saveAfterExplanation(submission, text);
    if (!res.ok) {
      setError(res.error.message);
      setSaving(false);
      return;
    }
    try {
      await studentStore.saveSubmission(res.submission);
      onSaved(res.submission);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  }, [saving, submission, text, onSaved]);

  return (
    <section className="mt-8 grid gap-6 border-t border-line pt-6 sm:grid-cols-2" aria-label="해설 전후 비교">
      <div>
        <h2 className="text-body font-bold text-ink">해설 전 생각 요약</h2>
        <p className="mt-2 text-body text-ink">“{submission.beforeSummary || '요약할 생각이 없어요.'}”</p>
      </div>
      <div>
        <h2 className="text-body font-bold text-ink">
          <label htmlFor="after-explanation">해설 후 내 설명</label>
        </h2>
        {editing ? (
          <>
            <textarea
              id="after-explanation"
              rows={3}
              maxLength={1000}
              value={text}
              disabled={saving}
              onChange={(e) => setText(e.target.value)}
              placeholder="해설을 읽고 이해한 내용을 내 말로 다시 설명해 보세요."
              className="mt-2 w-full resize-y rounded-control border border-line px-4 py-3 text-body text-ink"
            />
            <button
              type="button"
              onClick={save}
              disabled={saving || !text.trim()}
              className="mt-2 h-10 rounded-control bg-sejong px-4 text-body font-semibold text-(--color-page) disabled:opacity-40"
            >
              {saving ? '저장하고 있어요…' : '내 설명 저장하기'}
            </button>
            {error && <p role="alert" className="mt-2 text-body text-wrong">{error}</p>}
          </>
        ) : (
          <>
            <p className="mt-2 text-body text-ink">“{submission.afterExplanation}”</p>
            <button type="button" onClick={() => setEditing(true)} className="mt-2 text-caption text-ink-sub underline-offset-2 hover:underline">
              다시 쓰기
            </button>
          </>
        )}
      </div>
    </section>
  );
}
