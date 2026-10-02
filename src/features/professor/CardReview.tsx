'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { professorApi } from './api';
import { ProfessorShell } from './ProfessorShell';
import type { ReviewCard } from '@/types/professor-cards';
import { GenerateCardsForm } from './GenerateCardsForm';

type StoredCard = ReviewCard & { updatedAt: string };
type Status = ReviewCard['approvalStatus'];
const labels: Record<Status, string> = { pending: '검토 대기', approved: '승인', rejected: '반려' };
const badges: Record<Status, string> = {
  pending: 'bg-challenge-bg text-challenge', approved: 'bg-correct-bg text-correct', rejected: 'bg-wrong-bg text-wrong',
};
const secondary = 'rounded-control border border-line-strong bg-page px-4 py-2 text-body hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50';
const inputClass = 'w-full rounded-control border border-line-strong bg-page p-3 text-body leading-relaxed';

export function CardReview() {
  const [cards, setCards] = useState<StoredCard[]>([]);
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState('');
  const visible = cards.filter(card => filter === 'all' || card.approvalStatus === filter);
  const active = visible.find(card => card.id === selected) ?? visible[0];

  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const lock=useRef(false);
  const [pendingSave,setPendingSave]=useState<ReviewCard[]>([]);
  const refresh=useCallback(async()=>{
    if(lock.current)return;
    lock.current=true;setBusy(true);setError('');
    try{const r=await professorApi<{cards:StoredCard[]}>('cards');setCards(r.cards);}
    catch(e){setError(e instanceof Error?e.message:'카드 조회 실패');}
    finally{lock.current=false;setBusy(false);}
  },[]);
  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)void refresh();});return()=>{active=false;};},[refresh]);
  async function saveGenerated(generated:ReviewCard[]){
    if(lock.current)return;
    lock.current=true;setBusy(true);setError('');setPendingSave(generated);
    try{const r=await professorApi<{cards:StoredCard[]}>('cards','POST',{cards:generated});
      setCards(current=>[...r.cards,...current.filter(c=>!r.cards.some(n=>n.id===c.id))]);setPendingSave([]);setFilter('all');setSelected(r.cards[0]?.id??'');setNotice('생성 카드를 Supabase에 저장했습니다. 승인 전에 근거를 확인하세요.');
    }catch(e){setError(e instanceof Error?e.message:'저장 실패');}
    finally{lock.current=false;setBusy(false);}
  }
  async function update(card:ReviewCard):Promise<boolean>{
    if(lock.current)return false;
    const current=cards.find(c=>c.id===card.id);if(!current)return false;
    const edited=['wrongClaim','correctClaim','evidence'].some(k=>card[k as keyof ReviewCard]!==current[k as keyof ReviewCard]);
    const action=edited?'edit':card.approvalStatus==='approved'?'approve':card.approvalStatus==='rejected'?'reject':'reset';
    lock.current=true;setBusy(true);setError('');
    try{const r=await professorApi<{card:StoredCard}>('cards/'+encodeURIComponent(card.id),'PATCH',{action,updatedAt:current.updatedAt,reviewed:action==='approve',reason:card.rejectionReason,wrongClaim:card.wrongClaim,correctClaim:card.correctClaim,evidence:card.evidence});
      setCards(list=>list.map(c=>c.id===r.card.id?r.card:c));setNotice('변경 내용을 Supabase에 저장했습니다.');return true;
    }catch(e){setError(e instanceof Error?e.message:'저장 실패');return false;}
    finally{lock.current=false;setBusy(false);}
  }

  return (
    <ProfessorShell active="cards">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-(length:--text-page) font-bold">오류 카드 검토</h2>
            <p className="mt-2 text-body text-ink-sub">오류 주장과 정답 근거를 확인하고 챌린지에 사용할 카드를 검토하세요.</p>
          </div>
          <button disabled={busy} className={secondary} onClick={refresh}>카드 새로 읽기</button>
        </div>
        <p className="mt-5 rounded-block border border-line bg-subtle px-4 py-3 text-caption text-ink-sub">
          카드와 검토 결과를 Supabase에 저장합니다. 기존 챌린지에 연결된 카드가 승인되면 학생 서버 API에서 조회할 수 있습니다. 새 생성 카드의 챌린지 연결은 별도 작업입니다.
        </p>
        <fieldset disabled={busy || pendingSave.length>0}><GenerateCardsForm onGenerated={saveGenerated} /></fieldset>
        {pendingSave.length>0 && <div className="mt-4 rounded-block bg-caution-bg p-4"><p>생성 카드 {pendingSave.length}개가 아직 저장되지 않았습니다. 재생성 없이 저장을 재시도할 수 있습니다. 이 화면을 떠나면 미저장 내용이 사라집니다.</p><button disabled={busy} onClick={()=>saveGenerated(pendingSave)} className={secondary}>생성 카드 저장 재시도</button></div>}
        {error && <p role="alert" className="mt-4 rounded-control bg-wrong-bg p-3 text-wrong">{error}</p>}
        {busy && <p role="status" className="mt-3 text-body">서버에 반영 중…</p>}
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
              <p className="mt-2 text-caption text-ink-sub">위 입력창에서 강의 내용을 전달하고 카드의 원문 인용과 정답을 대조하세요.</p>
              <button disabled className={`${secondary} mt-4 w-full`}>PDF 업로드 준비 중</button>
              <div className="mt-4 border-t border-line-soft pt-3 text-caption text-ink-sub">{active?.source === 'claude' ? `입력 자료: ${active.sourceTitle}` : '샘플 근거: 설계안의 철학 예시 (실제 강의자료 아님)'}</div>
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
                      <p className="mt-3 text-body font-semibold">{card.title}</p><p className="mt-1 text-caption text-info">{card.source === 'claude' ? 'Claude 생성' : '샘플 카드'}</p>
                      <p className="mt-1 text-caption text-ink-sub">{card.errorType} · 난이도 {card.difficulty}</p>
                    </button>
                  </li>
                ))}
              </ul>
              {!visible.length && <p className="rounded-block border border-dashed border-line p-5 text-body text-ink-sub">{filter === 'all' ? '등록된' : labels[filter]} 카드가 없습니다. 전체 보기에서 다른 카드를 확인하세요.</p>}
            </section>
          </aside>
          {active ? <fieldset disabled={busy} className="min-w-0"><ReviewPanel key={`${active.id}-${active.updatedAt}`} card={active} onUpdate={update} /></fieldset> : (
            <section className="rounded-block border border-line px-6 py-16 text-center">
              <h3 className="text-title font-bold">검토할 카드를 선택하세요</h3>
              <p className="mt-3 text-body text-ink-sub">다른 상태를 선택하거나 전체 목록을 확인할 수 있습니다.</p>
              <button className={`${secondary} mt-5`} onClick={() => setFilter('all')}>전체 카드 보기</button>
            </section>
          )}
        </div>
      </div>
    </ProfessorShell>
  );
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`rounded-full px-2.5 py-1 text-caption font-semibold ${badges[status]}`}>{labels[status]}</span>;
}

function ReviewPanel({ card, onUpdate }: { card: ReviewCard; onUpdate: (card: ReviewCard) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card);
  const [reviewed, setReviewed] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const canSave = [draft.wrongClaim, draft.correctClaim, draft.evidence].every(value => value.trim().length > 0);
  return (
    <section aria-label="선택한 오류 카드 상세" className="min-w-0 rounded-block border border-line bg-page">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft p-5 sm:p-6">
        <div><p className="text-caption text-ink-sub">서양철학 · {card.source === 'claude' ? 'Claude 생성 초안' : '검토용 샘플'}</p><h3 className="mt-1 text-title font-bold">{card.title}</h3></div>
        <StatusBadge status={card.approvalStatus} />
      </div>
      <div className="space-y-6 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2 text-caption"><span className="rounded-control bg-subtle px-3 py-1">{card.errorType}</span><span className="rounded-control bg-subtle px-3 py-1">난이도 {card.difficulty}</span><span className="rounded-control bg-info-soft px-3 py-1 text-info">{card.approvalStatus === 'pending' ? '교수 검토 필요' : '교수 검토 완료'}</span></div>
        {card.sourceExcerpt && <ReadingBlock title={`입력 원문 · ${card.sourceTitle}`} text={card.sourceExcerpt} color="bg-subtle text-ink" />}
        {editing ? (
          <div className="space-y-4">
            {(['wrongClaim', 'correctClaim', 'evidence'] as const).map(field => (
              <label key={field} className="block text-body font-semibold">{{ wrongClaim: '오류 주장', correctClaim: '정답 설명', evidence: '검토 근거' }[field]}
                <textarea rows={4} maxLength={2000} value={draft[field]} onChange={event => setDraft({ ...draft, [field]: event.target.value })} className={`${inputClass} mt-2 font-normal`} />
              </label>
            ))}
            <p className="text-caption text-ink-sub">내용을 수정하면 기존 승인·반려 상태가 해제되어 다시 검토해야 합니다.</p>
            <div className="flex flex-wrap gap-2"><button disabled={!canSave} className={secondary} onClick={async () => {
              const saved = await onUpdate({ ...draft, wrongClaim: draft.wrongClaim.trim(), correctClaim: draft.correctClaim.trim(), evidence: draft.evidence.trim(), approvalStatus: 'pending', approvedBy: undefined, rejectionReason: undefined });
              if (saved) { setReviewed(false); setEditing(false); }
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
          <label className="flex items-start gap-3 text-body"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} className="mt-1 size-4 shrink-0 accent-sejong" /><span>오류 주장, 정답 설명, 검토 근거를 확인했습니다.</span></label>
          {rejecting && <label className="mt-4 block text-body font-semibold">반려 사유 <span className="text-caption font-normal text-ink-sub">필수</span><textarea autoFocus rows={3} maxLength={1000} className={`${inputClass} mt-2 font-normal`} value={reason} onChange={event => setReason(event.target.value)} placeholder="어떤 내용을 다시 검토해야 하는지 적어 주세요." /></label>}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {rejecting ? <><button className={secondary} onClick={() => setRejecting(false)}>반려 취소</button><button disabled={!reason.trim()} className={secondary} onClick={() => onUpdate({ ...card, approvalStatus: 'rejected', rejectionReason: reason.trim() })}>반려 사유 저장</button></> : <>
              <button className={secondary} onClick={() => setRejecting(true)}>반려하기</button>
              <button disabled={!reviewed} className="rounded-control bg-sejong px-5 py-2 text-body font-semibold text-(--color-page) disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onUpdate({ ...card, approvalStatus: 'approved', approvedBy: 'p1' })}>카드 승인하기</button>
            </>}
          </div>
        </> : <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-body text-ink-sub">{card.approvalStatus === 'approved' ? '승인 상태가 서버에 저장되었습니다. 이 카드에 연결된 챌린지의 공개 조건에 반영됩니다.' : '반려된 카드입니다. 내용을 수정하면 다시 검토할 수 있습니다.'}</p><button className={secondary} onClick={() => onUpdate({ ...card, approvalStatus: 'pending', approvedBy: undefined, rejectionReason: undefined })}>다시 검토하기</button></div>}
      </div>}
    </section>
  );
}

function ReadingBlock({ title, text, color }: { title: string; text: string; color: string }) {
  return <section><h4 className="mb-2 text-body font-semibold text-ink-sub">{title}</h4><p className={`max-w-[720px] whitespace-pre-wrap break-words rounded-block p-4 text-body leading-relaxed ${color}`}>{text}</p></section>;
}
