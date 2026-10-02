'use client';
import {useRef,useState} from 'react';
import type {SubmissionView} from '../records/reader';
import {professorApi} from '../api';
const fields={judgment:['판정',1],reasoning:['이유',2],concept:['개념',2],evidence:['근거',2]} as const;
export function ServerEvaluation({submission:s,onSaved}:{submission:SubmissionView;onSaved:()=>void}){
 const [parts,setParts]=useState({...s.score});
 const [reason,setReason]=useState('');const [feedback,setFeedback]=useState('');
 const [reviewed,setReviewed]=useState(false);const [busy,setBusy]=useState(false);const lock=useRef(false);
 const [error,setError]=useState('');
 const total=Math.round(Math.max(0,Math.min(7,parts.judgment+(parts.reasoning??0)+(parts.concept??0)+parts.evidence+parts.penalty))*10)/10;
 if(s.finalizedAt)return <section className="mt-6 rounded-block bg-correct-bg p-5"><h4 className="text-title font-bold">평가 확정 완료 · {s.score.total} / 7점</h4><p className="mt-2 text-caption">{new Date(s.finalizedAt).toLocaleString('ko-KR')} · 담당 교수</p><p className="mt-3 whitespace-pre-wrap text-body">{s.professorComment}</p></section>;
 async function save(action:'draft'|'finalize'){
  if(lock.current)return;
  if(!reviewed||parts.reasoning===null||parts.concept===null||!feedback.trim()){setError('모든 점수 항목과 피드백을 입력하고 원문 검토를 확인해 주세요.');return;}
  if(action==='finalize'&&!window.confirm(`${total} / 7점으로 평가를 확정할까요? 확정 후에는 이 화면에서 수정할 수 없습니다.`))return;
  lock.current=true;setBusy(true);setError('');
  try{await professorApi('submissions/'+encodeURIComponent(s.id),'PATCH',{action,score:parts,reason,feedback,reviewed,updatedAt:s.updatedAt});onSaved();}
  catch(e){setError(e instanceof Error?e.message:'저장하지 못했습니다.');}
  finally{lock.current=false;setBusy(false);}
 }
 return <section className="mt-6 rounded-block border border-line bg-subtle p-5" aria-label="교수 평가 저장">
 <h4 className="text-title font-bold">교수 평가 · {total} / 7점</h4><p className="mt-2 text-caption text-ink-sub">원본 채점은 보존됩니다. 항목별 점수와 피드백을 Supabase에 저장합니다. 점수 변경 시 사유가 필요합니다.</p>
 {s.professorComment&&<details className="mt-3"><summary>이전 검토 메모 보기</summary><p className="whitespace-pre-wrap text-body">{s.professorComment}</p></details>}
 <fieldset disabled={busy} className="mt-4 space-y-4 disabled:opacity-60"><div className="grid grid-cols-2 gap-3">{(Object.keys(fields) as (keyof typeof fields)[]).map(k=><label key={k} className="text-body">{fields[k][0]} (0~{fields[k][1]})<input type="number" min={0} max={fields[k][1]} step={0.1} value={parts[k]??''} onChange={e=>{setParts({...parts,[k]:e.target.value===''?null:Number(e.target.value)});setReviewed(false);}} className="mt-1 block w-full rounded-control border border-line-strong bg-page p-2" /></label>)}</div>
 <label className="block text-body">과정 감점<select value={parts.penalty} onChange={e=>{setParts({...parts,penalty:Number(e.target.value)});setReviewed(false);}} className="ml-3 rounded-control border border-line p-2"><option value={0}>0점</option><option value={-2}>-2점</option></select></label>
 <label className="block text-body">변경 사유<textarea maxLength={1000} value={reason} onChange={e=>{setReason(e.target.value);setReviewed(false);}} className="mt-2 block w-full rounded-control border border-line p-3" /></label>
 <label className="block text-body">학생 피드백<textarea maxLength={2000} value={feedback} onChange={e=>{setFeedback(e.target.value);setReviewed(false);}} className="mt-2 block w-full rounded-control border border-line p-3" /></label>
 <label className="flex gap-2 text-body"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>제출 원문과 점수 근거를 확인했습니다.</label>
 <div className="flex flex-wrap gap-3"><button type="button" onClick={()=>save('draft')} className="rounded-control border border-line-strong bg-page px-4 py-2">검토 저장</button><button type="button" onClick={()=>save('finalize')} className="rounded-control bg-sejong px-4 py-2 text-(--color-page)">{busy?'저장 중…':'평가 확정'}</button></div></fieldset>
 {error&&<p role="alert" className="mt-3 text-body text-wrong">{error}</p>}
 </section>;
}
