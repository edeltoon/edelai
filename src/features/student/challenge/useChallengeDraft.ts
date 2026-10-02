'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RECORD_SCHEMA_VERSION } from '@/types/student-records';
import { studentStore, type ChallengeDraft, type DraftAnswer } from '../services/store';

const emptyAnswer = (): DraftAnswer => ({ reasoning: '', correction: '', pastedChars: 0 });

/**
 * 제출 전 입력(판정·확신도·이유·개념·근거)을 브라우저에 자동 저장한다. 새로고침해도 이어서 쓸 수 있다.
 * 두 저장 모드 모두 draft는 브라우저에만 있다(서버로 보내지 않음).
 */
export function useChallengeDraft(studentId: string, challengeId: string, claimIds: readonly string[] | null) {
  const [draft, setDraft] = useState<ChallengeDraft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const claimKey = claimIds?.join(',') ?? null;

  useEffect(() => {
    if (!claimKey) return;
    const ids = claimKey.split(',');
    let alive = true;
    studentStore.getDraft(studentId, challengeId).then((saved) => {
      if (!alive) return;
      const now = new Date().toISOString();
      const base: ChallengeDraft = saved ?? {
        schemaVersion: RECORD_SCHEMA_VERSION,
        studentId,
        challengeId,
        startedAt: now,
        updatedAt: now,
        selectedClaimId: ids[0] ?? null,
        answers: {},
      };
      // 챌린지 주장이 바뀌었으면 모르는 주장은 버리고 빈 입력을 채운다
      const answers: Record<string, DraftAnswer> = {};
      for (const id of ids) answers[id] = { ...emptyAnswer(), ...base.answers[id] };
      setDraft({ ...base, answers, selectedClaimId: ids.includes(base.selectedClaimId ?? '') ? base.selectedClaimId : (ids[0] ?? null) });
    });
    return () => {
      alive = false;
    };
  }, [studentId, challengeId, claimKey]);

  // 저장은 입력이 멈춘 뒤 0.3초에 한 번
  useEffect(() => {
    if (!draft) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void studentStore.saveDraft(draft);
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft]);

  const updateAnswer = useCallback((claimId: string, patch: Partial<DraftAnswer>) => {
    setDraft((d) => {
      if (!d) return d;
      const next = { ...emptyAnswer(), ...d.answers[claimId], ...patch };
      // 붙여넣은 글자 수는 지금 이유 길이를 넘지 않게
      next.pastedChars = Math.min(next.pastedChars, next.reasoning.length);
      return { ...d, answers: { ...d.answers, [claimId]: next }, updatedAt: new Date().toISOString() };
    });
  }, []);

  const select = useCallback((claimId: string) => {
    setDraft((d) => (d && d.selectedClaimId !== claimId ? { ...d, selectedClaimId: claimId } : d));
  }, []);

  const clear = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await studentStore.clearDraft(studentId, challengeId);
  }, [studentId, challengeId]);

  return { draft, updateAnswer, select, clear };
}
