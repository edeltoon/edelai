'use client';

import { useState } from 'react';
import { AppShell, SpaceTitleBar } from '@/components/shell';
import { sampleCards, type ReviewCard } from './sample-cards';

type Status = ReviewCard['approvalStatus'];
const labels: Record<Status, string> = { pending: '검토 대기', approved: '승인', rejected: '반려' };
const badges: Record<Status, string> = {
  pending: 'bg-challenge-bg text-challenge', approved: 'bg-correct-bg text-correct', rejected: 'bg-wrong-bg text-wrong',
};
const secondary = 'rounded-control border border-line-strong bg-page px-4 py-2 text-body hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50';
const inputClass = 'w-full rounded-control border border-line-strong bg-page p-3 text-body leading-relaxed';

export function CardReview() {
  const [cards, setCards] = useState<ReviewCard[]>(sampleCards);
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [selected, setSelected] = useState(sampleCards[0].id);
  const [notice, setNotice] = useState('');
  const visible = cards.filter(card => filter === 'all' || card.approvalStatus === filter);
  const active = visible.find(card => card.id === selected) ?? visible[0];

  function update(card: ReviewCard) {
    setCards(current => current.map(item => item.id === card.id ? card : item));
    setNotice(card.approvalStatus === 'approved' ? '샘플 카드를 승인했습니다. 학생에게 배포되지는 않습니다.'
      : card.approvalStatus === 'rejected' ? '반려 사유를 기록했습니다.' : '수정 내용을 반영하고 검토 대기로 변경했습니다.');
  }

  return (
    <AppShell
      header={{ spaceName: 'AI 교수 공간', role: 'professor', userName: '담당 교수' }}
      sidebar={{
        sections: [
          { key: 'courses', title: '나의 담당 과목', items: [
            { key: 'phil', label: '서양철학:쟁점과토론', href: '/professor/course/phil/cards', active: true, icon: 'course' },
          ] },
          { key: 'tools', title: '과목 관리', items: [
            { key: 'cards', label: '오류 카드 검토', href: '/professor/course/phil/cards', active: true },
            { key: 'records', label: '학생 기록', disabled: true, disabledHint: '학생 제출 API 연결 후 제공' },
          ] },
        ],
        user: { name: '담당 교수', caption: '교수 · 화면 미리보기', initial: '교' },
      }}
    >
      <SpaceTitleBar title="서양철학:쟁점과토론">
        <nav aria-label="교수 과목 메뉴" className="flex flex-wrap gap-1 text-body">
          <span aria-disabled="true" className="px-3 py-2 text-ink-sub" title="준비 중">수업 분석</span>
          <span aria-current="page" className="rounded-control bg-sejong-soft px-3 py-2 font-semibold text-sejong">챌린지 관리</span>
          <span aria-disabled="true" className="px-3 py-2 text-ink-sub" title="준비 중">학생 기록</span>
        </nav>
      </SpaceTitleBar>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-(length:--text-page) font-bold">오류 카드 검토</h2>
            <p className="mt-2 text-body text-ink-sub">오류 주장과 정답 근거를 확인하고 챌린지에 사용할 카드를 검토하세요.</p>
          </div>
          <button className={secondary} onClick={() => {
            if (window.confirm('이 화면의 검토 내용을 지우고 샘플 카드로 되돌릴까요?')) {
              setCards(sampleCards); setFilter('all'); setSelected(sampleCards[0].id); setNotice('샘플 카드를 초기화했습니다.');
            }
          }}>샘플 초기화</button>
        </div>
        <p className="mt-5 rounded-block border border-line bg-subtle px-4 py-3 text-caption text-ink-sub">
          화면 미리보기입니다. 샘플 카드로 검토하며, 변경은 새로고침하면 초기화됩니다. 실제 강의자료 업로드·AI 카드 생성·학생 배포는 아직 연결되지 않았습니다.
        </p>
        <div role="status" aria-live="polite" className="mt-3 min-h-6 text-caption text-correct">{notice}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(['pending', 'approved', 'rejected'] as const).map(status => (
            <button key={status} onClick={() => { setFilter(status); setNotice(''); }} aria-pressed={filter === status}
              className={`flex items-center justify-between rounded-block border px-5 py-4 text-left ${filter === status ? 'border-sejong bg-sejong-soft' : 'border-line bg-page hover:bg-subtle'}`}>
              <span className="text-body text-ink-sub">{labels[status]}</span>
              <span className="tabular text-(length:--text-page) font-bold">{cards.filter(card => card.approvalStatus === status).length}<span className="ml-1 text-caption font-normal">건</span></span>
            </button>
          ))}
        </div>
        <div className="mt-8 grid items-start gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-6" aria-label="강의자료와 오류 카드 목록">
            <section className="rounded-block border border-line p-4">
              <h3 className="text-lead font-semibold">강의자료</h3>
              <p className="mt-2 text-caption text-ink-sub">실제 자료를 연결하면 원문 근거와 카드 내용을 대조할 수 있습니다.</p>
              <button disabled className={`${secondary} mt-4 w-full`}>강의자료 연결 준비 중</button>
              <div className="mt-4 border-t border-line-soft pt-3 text-caption text-ink-sub">현재 근거: 설계안의 철학 예시<br />실제 강의자료가 아닙니다.</div>
            </section>
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lead font-semibold">오류 카드 <span className="text-ink-sub">{visible.length}</span></h3>
                <button onClick={() => setFilter('all')} aria-pressed={filter === 'all'} className="rounded-control px-2 py-1 text-caption text-info underline underline-offset-4">전체 보기</button>
              </div>
              <ul className="space-y-3">
                {visible.map((card, index) => (
                  <li key={card.id}>
                    <button onClick={() => { setSelected(card.id); setNotice(''); }} aria-pressed={active?.id === card.id}
                      className={`w-full rounded-block border p-4 text-left ${active?.id === card.id ? 'border-sejong bg-sejong-soft' : 'border-line bg-page hover:bg-subtle'}`}>
                      <div className="flex items-center justify-between gap-2 text-caption"><span className="text-ink-sub">카드 {String(index + 1).padStart(2, '0')}</span><StatusBadge status={card.approvalStatus} /></div>
                      <p className="mt-3 text-body font-semibold">{card.title}</p>
                      <p className="mt-1 text-caption text-ink-sub">{card.errorType} · 난이도 {card.difficulty}</p>
                    </button>
                  </li>
                ))}
              </ul>
              {!visible.length && <p className="rounded-block border border-dashed border-line p-5 text-body text-ink-sub">{filter === 'all' ? '등록된' : labels[filter]} 카드가 없습니다. 전체 보기에서 다른 카드를 확인하세요.</p>}
            </section>
          </aside>
          {active ? <ReviewPanel key={`${active.id}-${active.approvalStatus}`} card={active} onUpdate={update} /> : (
            <section className="rounded-block border border-line px-6 py-16 text-center">
              <h3 className="text-title font-bold">검토할 카드를 선택하세요</h3>
              <p className="mt-3 text-body text-ink-sub">다른 상태를 선택하거나 전체 목록을 확인할 수 있습니다.</p>
              <button className={`${secondary} mt-5`} onClick={() => setFilter('all')}>전체 카드 보기</button>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`rounded-full px-2.5 py-1 text-caption font-semibold ${badges[status]}`}>{labels[status]}</span>;
}

function ReviewPanel({ card, onUpdate }: { card: ReviewCard; onUpdate: (card: ReviewCard) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card);
  const [reviewed, setReviewed] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const canSave = [draft.wrongClaim, draft.correctClaim, draft.evidence].every(value => value.trim().length > 0);
  return (
    <section aria-label="선택한 오류 카드 상세" className="min-w-0 rounded-block border border-line bg-page">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft p-5 sm:p-6">
        <div><p className="text-caption text-ink-sub">서양철학 · 검토용 샘플</p><h3 className="mt-1 text-title font-bold">{card.title}</h3></div>
        <StatusBadge status={card.approvalStatus} />
      </div>
      <div className="space-y-6 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2 text-caption"><span className="rounded-control bg-subtle px-3 py-1">{card.errorType}</span><span className="rounded-control bg-subtle px-3 py-1">난이도 {card.difficulty}</span><span className="rounded-control bg-info-soft px-3 py-1 text-info">{card.approvalStatus === 'pending' ? '교수 검토 필요' : '교수 검토 완료'}</span></div>
        {editing ? (
          <div className="space-y-4">
            {(['wrongClaim', 'correctClaim', 'evidence'] as const).map(field => (
              <label key={field} className="block text-body font-semibold">{{ wrongClaim: '오류 주장', correctClaim: '정답 설명', evidence: '검토 근거' }[field]}
                <textarea rows={4} maxLength={2000} value={draft[field]} onChange={event => setDraft({ ...draft, [field]: event.target.value })} className={`${inputClass} mt-2 font-normal`} />
              </label>
            ))}
            <p className="text-caption text-ink-sub">내용을 수정하면 기존 승인·반려 상태가 해제되어 다시 검토해야 합니다.</p>
            <div className="flex flex-wrap gap-2"><button disabled={!canSave} className={secondary} onClick={() => {
              onUpdate({ ...draft, wrongClaim: draft.wrongClaim.trim(), correctClaim: draft.correctClaim.trim(), evidence: draft.evidence.trim(), approvalStatus: 'pending', approvedBy: undefined, rejectionReason: undefined });
              setReviewed(false); setEditing(false);
            }}>수정 내용 저장</button><button className={secondary} onClick={() => setEditing(false)}>수정 취소</button></div>
          </div>
        ) : (
          <>
            <ReadingBlock title="오류 주장" text={card.wrongClaim} color="bg-sejong-soft text-sejong" />
            <ReadingBlock title="정답 설명" text={card.correctClaim} color="bg-correct-bg text-ink" />
            <ReadingBlock title="검토 근거" text={card.evidence} color="bg-info-soft text-info" />
            {card.rejectionReason && <ReadingBlock title="반려 사유" text={card.rejectionReason} color="bg-caution-bg text-caution" />}
            <p className="border-t border-line-soft pt-4 text-caption text-ink-sub">학생 화면에는 오류 개수와 주장만 공개합니다. 정답 설명과 근거는 학생이 판정·확신도·이유를 제출한 뒤 공개하는 구조로 연결할 예정입니다.</p>
            <button className={secondary} onClick={() => { setDraft(card); setEditing(true); setRejecting(false); }}>카드 내용 수정</button>
          </>
        )}
      </div>
      {!editing && <div className="border-t border-line bg-subtle p-5 sm:p-6">
        {card.approvalStatus === 'pending' ? <>
          <label className="flex items-start gap-3 text-body"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} className="mt-1 size-4 shrink-0 accent-sejong" /><span>샘플의 오류 주장, 정답 설명, 검토 근거를 확인했습니다.</span></label>
          {rejecting && <label className="mt-4 block text-body font-semibold">반려 사유 <span className="text-caption font-normal text-ink-sub">필수</span><textarea autoFocus rows={3} maxLength={1000} className={`${inputClass} mt-2 font-normal`} value={reason} onChange={event => setReason(event.target.value)} placeholder="어떤 내용을 다시 검토해야 하는지 적어 주세요." /></label>}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {rejecting ? <><button className={secondary} onClick={() => setRejecting(false)}>반려 취소</button><button disabled={!reason.trim()} className={secondary} onClick={() => onUpdate({ ...card, approvalStatus: 'rejected', rejectionReason: reason.trim() })}>반려 사유 저장</button></> : <>
              <button className={secondary} onClick={() => setRejecting(true)}>반려하기</button>
              <button disabled={!reviewed} className="rounded-control bg-sejong px-5 py-2 text-body font-semibold text-(--color-page) disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onUpdate({ ...card, approvalStatus: 'approved', approvedBy: 'preview-professor' })}>샘플 카드 승인하기</button>
            </>}
          </div>
        </> : <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-body text-ink-sub">{card.approvalStatus === 'approved' ? '검토를 마친 샘플 카드입니다. 아직 배포되지 않았습니다.' : '반려된 카드입니다. 내용을 수정하면 다시 검토할 수 있습니다.'}</p><button className={secondary} onClick={() => onUpdate({ ...card, approvalStatus: 'pending', approvedBy: undefined, rejectionReason: undefined })}>다시 검토하기</button></div>}
      </div>}
    </section>
  );
}

function ReadingBlock({ title, text, color }: { title: string; text: string; color: string }) {
  return <section><h4 className="mb-2 text-body font-semibold text-ink-sub">{title}</h4><p className={`max-w-[720px] whitespace-pre-wrap break-words rounded-block p-4 text-body leading-relaxed ${color}`}>{text}</p></section>;
}
