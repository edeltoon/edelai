'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ChallengeSubmission } from '@/types/student-records';
import { CHALLENGES } from '../content/challenges';
import { getChallenge } from '../services/ai';
import { studentStore } from '../services/store';
import { studentRoutes } from '../routes';
import { useStudent } from '../StudentSession';
import { problemOf } from './display';

type RowState =
  | { status: 'loading' }
  | { status: 'open' }
  | { status: 'not_approved' }
  | { status: 'submitted'; submission: ChallengeSubmission }
  | { status: 'error'; message: string };

/** 검증 챌린지 탭: 과목의 챌린지 목록과 내 상태 (승인 전 / 풀기 / 제출 완료) */
export function ChallengeListView({ courseId }: { courseId: string }) {
  const student = useStudent();
  const challenges = CHALLENGES.filter((c) => c.courseId === courseId);
  const [rows, setRows] = useState<Record<string, RowState>>({});

  useEffect(() => {
    let alive = true;
    for (const c of challenges) {
      (async () => {
        let state: RowState;
        try {
          const latest = await studentStore.getLatestSubmission(student.userId, c.id);
          if (latest) state = { status: 'submitted', submission: latest };
          else {
            const res = await getChallenge(c.id);
            if (res.ok) state = { status: 'open' };
            else {
              const p = problemOf(res.error);
              state = p.kind === 'not_approved' ? { status: 'not_approved' } : { status: 'error', message: p.message };
            }
          }
        } catch (e) {
          state = { status: 'error', message: e instanceof Error ? e.message : '상태를 불러오지 못했어요.' };
        }
        if (alive) setRows((r) => ({ ...r, [c.id]: state }));
      })();
    }
    return () => {
      alive = false;
    };
    // 챌린지 목록은 정적 데이터라 학생·과목이 바뀔 때만 다시 읽는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, student.userId]);

  return (
    <section className="mx-auto w-full max-w-[880px] px-4 py-6 sm:px-8">
      <p className="text-body text-ink-sub">AI 답변에 숨은 오류를 찾아 판정·확신도·이유를 적어요. 오류 개수만 알려 주고 위치는 알려 주지 않아요.</p>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {challenges.map((c) => {
          const row = rows[c.id] ?? { status: 'loading' };
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-5">
              <div className="min-w-0 flex-1">
                <p className="text-title font-bold text-ink">검증 챌린지 · {c.title}</p>
                <p className="mt-1 text-body text-ink-sub">{c.question}</p>
                <p className="mt-1 text-caption text-challenge">교수님이 승인한 오류 {c.errorCount}개 포함 · 주장 {c.claims.length}개</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {row.status === 'loading' && <span className="text-caption text-ink-sub">상태 확인 중…</span>}
                {row.status === 'not_approved' && (
                  <span className="rounded-full bg-challenge-bg px-3 py-1 text-caption font-semibold text-challenge">교수 승인 전</span>
                )}
                {row.status === 'error' && <span className="text-caption text-wrong">{row.message}</span>}
                {row.status === 'open' && (
                  <Link href={studentRoutes.challenge(courseId, c.id)} className="inline-flex h-10 items-center rounded-control bg-sejong px-4 text-body font-semibold text-(--color-page)">
                    챌린지 풀기
                  </Link>
                )}
                {row.status === 'submitted' && (
                  <>
                    <span className="tabular text-body text-ink">제출 완료 · {row.submission.score.total}점</span>
                    <Link href={studentRoutes.result(courseId, c.id)} className="inline-flex h-10 items-center rounded-control border border-line-strong px-4 text-body text-ink">
                      해설 보기
                    </Link>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
