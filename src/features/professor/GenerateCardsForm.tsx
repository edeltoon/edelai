'use client';

import { useRef, useState } from 'react';
import type { GenerateCardsResponse, ReviewCard } from '@/types/professor-cards';

export function GenerateCardsForm({ onGenerated }: { onGenerated: (cards: ReviewCard[]) => void }) {
  const [title, setTitle] = useState('');
  const [lectureText, setLectureText] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const ready = title.trim().length > 0 && lectureText.trim().length >= 100;
  const inputClass = 'mt-2 w-full rounded-control border border-line-strong bg-page p-3 text-body font-normal';

  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !ready) return;
    inFlight.current = true; setBusy(true); setFailed(false); setMessage('강의 내용을 바탕으로 오류 카드를 만들고 있어요. 최대 60초 정도 걸릴 수 있어요.');
    try {
      const response = await fetch('/api/professor/cards/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: 'phil', title, lectureText }), signal: AbortSignal.timeout(70_000),
      });
      const result: GenerateCardsResponse = await response.json();
      if (!result.ok) throw new Error(result.error.message);
      if (!response.ok || !Array.isArray(result.cards) || !result.cards.length) throw new Error('카드 응답을 확인하지 못했어요. 다시 시도해 주세요.');
      onGenerated(result.cards);
      setMessage(`Claude가 카드 ${result.cards.length}개를 생성했어요. 목록에서 원문과 정답을 검토해 주세요.`);
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error && error.name === 'Error' ? error.message : '서버 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally { inFlight.current = false; setBusy(false); }
  }

  return <form onSubmit={generate} aria-busy={busy} className="mt-6 rounded-block border border-line bg-page p-5 sm:p-6">
    <h3 className="text-title font-bold">강의자료로 오류 카드 만들기</h3>
    <p className="mt-2 text-body text-ink-sub">강의 텍스트를 붙여넣으면 Claude가 검토용 카드를 생성합니다. 입력한 내용은 Claude API로 전송됩니다.</p>
    <fieldset disabled={busy} className="mt-4 space-y-4 disabled:opacity-70">
      <label className="block text-body font-semibold">강의 제목<input required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder="예: 3주차 · 플라톤의 이데아론" className={inputClass} /></label>
      <label className="block text-body font-semibold">강의 텍스트<textarea required minLength={100} maxLength={12000} rows={6} value={lectureText} onChange={event => setLectureText(event.target.value)} placeholder="개념 설명이 포함된 강의 내용을 100자 이상 붙여넣어 주세요." className={inputClass} /></label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-caption text-ink-sub">{lectureText.trim().length.toLocaleString()} / 12,000자 · PDF 업로드는 추후 제공</span>
        <button disabled={!ready} className="rounded-control bg-sejong px-5 py-2 text-body font-semibold text-(--color-page) disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Claude 생성 중…' : 'Claude로 카드 생성'}</button>
      </div>
    </fieldset>
    <p role={failed ? 'alert' : 'status'} aria-live="polite" className={`mt-3 text-body ${failed ? 'text-wrong' : 'text-ink-sub'}`}>{message}</p>
  </form>;
}
