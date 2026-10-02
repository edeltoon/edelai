'use client';

import { useState } from 'react';
import { validateDraft, type EvaluationDraft } from './draft';

export function EvaluationReview({ originalScore }: { originalScore: number }) {
  const [score, setScore] = useState(String(originalScore));
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [preview, setPreview] = useState<EvaluationDraft | null>(null);
  const [error, setError] = useState('');
  const inputClass = 'mt-2 block w-full rounded-control border border-line-strong bg-page p-3 font-normal';
  const secondary = 'rounded-control border border-line-strong bg-page px-4 py-2 text-body hover:bg-subtle';
  function changed() { setReviewed(false); setError(''); }
  return <section className="mt-6 rounded-block border border-line-strong bg-subtle p-4 sm:p-5" aria-label="교수 평가 검토">
    <h4 className="text-title font-bold">교수 평가 검토</h4>
    <p className="mt-2 text-caption text-ink-sub">검토 초안은 이 화면에서만 유지됩니다. 학생 전환·검색으로 이 기록이 사라지거나 페이지를 이동·새로고침하면 지워질 수 있습니다. 학생에게 전달되지 않습니다.</p>
    {preview ? <div className="mt-4 space-y-4">
      <div role="status" className="rounded-control bg-info-soft p-3 text-body text-info">검토 초안 미리보기 · 서버 미저장 · 평가 미확정</div>
      <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-caption text-ink-sub">기존 기록 점수</dt><dd className="text-title font-semibold">{originalScore} / 7점</dd></div><div><dt className="text-caption text-ink-sub">교수 검토 점수</dt><dd className="text-title font-bold text-sejong">{preview.score} / 7점</dd></div></dl>
      {preview.reason && <div><h5 className="text-body font-semibold">수정 사유</h5><p className="mt-2 whitespace-pre-wrap break-words text-body">{preview.reason}</p></div>}
      <div><h5 className="text-body font-semibold">학생 피드백 초안</h5><p className="mt-2 whitespace-pre-wrap break-words text-body">{preview.feedback}</p></div>
      <div className="flex flex-wrap gap-3"><button className={secondary} onClick={() => { setPreview(null); setReviewed(false); }}>초안 다시 수정</button><button disabled className="rounded-control bg-sejong px-4 py-2 text-body text-(--color-page) opacity-40">평가 확정 · 서버 연결 후 제공</button></div>
    </div> : <form className="mt-4 space-y-4" noValidate onSubmit={event => {
      event.preventDefault(); const result = validateDraft({ score, reason, feedback, reviewed }, originalScore);
      if (!result.ok) { setError(result.message); return; }
      setError(''); setPreview(result.draft);
    }}>
      <p className="text-body text-ink-sub">기존 기록 점수: {originalScore} / 7점 · 원본 점수는 변경하지 않습니다.</p>
      <label className="block text-body font-semibold">교수 검토 점수 (0~7점)<input type="number" min={0} max={7} step={0.1} required value={score} onChange={event => { setScore(event.target.value); changed(); }} className={`${inputClass} max-w-40`} /></label>
      <label className="block text-body font-semibold">수정 사유 <span className="text-caption font-normal text-ink-sub">점수 변경 시 필수</span><textarea value={reason} onChange={event => { setReason(event.target.value); changed(); }} rows={3} maxLength={1000} className={inputClass} placeholder="제출 원문 중 어떤 근거로 점수를 조정했는지 적어 주세요." /></label>
      <label className="block text-body font-semibold">학생 피드백 초안 <span className="text-caption font-normal text-ink-sub">필수 · 최대 2,000자</span><textarea required value={feedback} onChange={event => { setFeedback(event.target.value); changed(); }} rows={4} maxLength={2000} className={inputClass} placeholder="잘 설명한 부분과 다시 생각해 볼 내용을 적어 주세요." /></label>
      <label className="flex items-start gap-3 text-body"><input type="checkbox" checked={reviewed} onChange={event => { setReviewed(event.target.checked); setError(''); }} className="mt-1 size-4 shrink-0 accent-sejong" /><span>학생 제출 원문과 점수 근거를 직접 확인했습니다.</span></label>
      {error && <p role="alert" className="text-body text-wrong">{error}</p>}
      <button type="submit" className="rounded-control bg-sejong px-4 py-2 text-body font-semibold text-(--color-page)">검토 초안 미리보기</button>
    </form>}
  </section>;
}
