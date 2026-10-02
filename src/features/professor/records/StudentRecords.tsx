'use client';

import { useState } from 'react';
import { ProfessorShell } from '../ProfessorShell';
import type { SubmissionView } from './reader';
import { useRecords } from './useRecords';
import { sampleStudents } from './sample';

const button = 'rounded-control border border-line-strong bg-page px-4 py-2 text-body hover:bg-subtle';
const panel = 'rounded-block border border-line bg-page p-5 sm:p-6';
const paragraph = 'whitespace-pre-wrap break-words text-body leading-relaxed';
const scoreLabels = { judgment: '판정', reasoning: '이유', concept: '개념', evidence: '근거', penalty: '과정 감점' } as const;

export function StudentRecords() {
  const { snapshot, loaded, refresh } = useRecords();
  const [sample, setSample] = useState(false);
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');

  const students = sample ? sampleStudents : snapshot.students;
  const filtered = students.filter(student => student.id.toLowerCase().includes(query.trim().toLowerCase()));
  const current = filtered.find(student => student.id === selected) ?? filtered[0];

  return <ProfessorShell active="records"><div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div>
      <h2 className="text-(length:--text-page) font-bold">학생 학습 기록</h2>
      <p className="mt-2 text-body text-ink-sub">제출한 판단과 설명, 대화 원문을 함께 확인하세요.</p>
    </div><button onClick={refresh} className={button}>기록 새로 읽기</button></div>
    <div className="mt-5 rounded-block border border-line bg-info-soft p-4 text-body text-info">
      같은 브라우저·같은 주소에 저장된 서양철학 기록만 표시합니다. 다른 컴퓨터의 기록은 공유되지 않습니다. 로컬 기록은 수정 가능하며 공식 평가 자료가 아닙니다.
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-4"><button aria-pressed={sample} className={button} onClick={() => { setSample(!sample); setSelected(''); setQuery(''); }}>{sample ? '저장된 기록으로 돌아가기' : '화면 예시 보기'}</button>
      <p role="status" className="text-caption text-ink-sub">{sample ? '직접 작성한 가상 기록입니다. 저장된 학생 데이터를 변경하지 않습니다.' : loaded ? `기록이 있는 학생 ${students.length}명` : '기록을 읽는 중입니다…'}</p>
    </div>
    {!sample && snapshot.warnings.length > 0 && <div role="alert" className="mt-4 rounded-block bg-caution-bg p-4 text-body text-caution"><p>일부 기록을 읽지 못했습니다. 원본은 변경하지 않았습니다.</p><ul className="mt-2 list-inside list-disc">{snapshot.warnings.map(message => <li key={message}>{message}</li>)}</ul></div>}
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className={panel} aria-label="학생 목록"><label className="block text-body font-semibold">학생 ID 검색<input value={query} onChange={e => setQuery(e.target.value)} className="mt-2 w-full rounded-control border border-line-strong p-2 font-normal" placeholder="예: s1" /></label>
        <ul className="mt-4 space-y-2">{filtered.map(student => <li key={student.id}><button onClick={() => setSelected(student.id)} aria-pressed={current?.id === student.id} className={`w-full break-words rounded-control border p-3 text-left ${current?.id === student.id ? 'border-sejong bg-sejong-soft' : 'border-line hover:bg-subtle'}`}><p className="text-body font-semibold">{student.id}</p><p className="mt-1 text-caption text-ink-sub">제출 {student.submissions.length}건 · 대화 {student.conversations.length}건</p></button></li>)}</ul>
        {loaded && !filtered.length && <p className="mt-4 text-body text-ink-sub">{query ? '검색 결과가 없습니다.' : '저장된 학생 기록이 없습니다.'}</p>}
      </aside>
      {current ? <div className="min-w-0 space-y-6">
        <section className={panel}><h3 className="break-words text-title font-bold">{current.id} · 학습 기록</h3><p className="mt-2 text-caption text-ink-sub">{sample ? '가상 예시' : '브라우저 임시 기록'} · 제출 전 작성 중인 답안은 표시하지 않습니다.</p></section>
        <section aria-label="챌린지 제출 기록"><h3 className="mb-3 text-title font-semibold">챌린지 제출 기록</h3>
          {current.submissions.length ? <div className="space-y-4">{current.submissions.map((submission, index) => <Submission key={`${submission.id}-${index}`} submission={submission} />)}</div>
            : <div className={panel}><p className="text-body text-ink-sub">제출한 챌린지가 없습니다.</p></div>}
        </section>
        <section className={panel}><h3 className="text-title font-semibold">대화 원문</h3><p className="mt-2 text-caption text-ink-sub">저장된 질문과 응답입니다. AI 요약을 새로 생성하지 않습니다.</p>
          {current.conversations.length ? current.conversations.map((conversation, index) => <details key={`${conversation.id}-${index}`} className="mt-4 rounded-control border border-line p-4"><summary className="cursor-pointer break-words text-body font-semibold">{conversation.title} · {conversation.messages.length}개 메시지</summary><ol className="mt-4 space-y-4">{conversation.messages.map((message, i) => <li key={`${message.id}-${i}`} className={`rounded-block p-4 ${message.role === 'user' ? 'bg-bubble' : 'bg-subtle'}`}><p className="mb-2 text-caption font-semibold text-ink-sub">{{ user: '학생', ai: 'AI', notice: '안내' }[message.role]}</p><p className={paragraph}>{message.text}</p></li>)}</ol></details>)
            : <p className="mt-4 text-body text-ink-sub">저장된 대화가 없습니다.</p>}
        </section>
        <p className="text-caption text-ink-sub">평가 확정과 학생 피드백 저장은 서버 저장소 연결 후 제공할 예정입니다.</p>
      </div> : <section className={panel}><h3 className="text-title font-semibold">{query ? '다른 학생 ID로 검색해 보세요' : '학생이 학습 기록을 남기면 여기에 표시돼요'}</h3><p className="mt-3 text-body text-ink-sub">학생 화면 연결 전에는 ‘화면 예시 보기’로 제출 기록과 대화 원문 배치를 확인할 수 있습니다. 실제 기록이 없을 때 예시로 자동 대체하지 않습니다.</p></section>}
    </div>
  </div></ProfessorShell>;
}

function Submission({ submission: s }: { submission: SubmissionView }) {
  return <details className={panel} open><summary className="cursor-pointer text-body"><span className="font-semibold">{s.challengeId}</span><span className="ml-3 text-ink-sub">{new Date(s.submittedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (한국 시간)</span></summary>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4"><p className="rounded-control bg-challenge-bg px-3 py-1 text-caption text-challenge">{s.grader === 'mock' ? '시연용 예시 채점' : s.grader === 'server' ? '서버 채점으로 표시된 로컬 기록' : '채점 출처 미확인'} · 교수 확정 전</p><p className="text-title font-bold">{s.score.total} / 7점</p></div>
    <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{Object.entries(scoreLabels).map(([key, label]) => <div key={key} className="rounded-control bg-subtle p-3"><dt className="text-caption text-ink-sub">{label}</dt><dd className="text-lead font-semibold">{s.score[key as keyof typeof scoreLabels]}</dd></div>)}<div className="rounded-control bg-subtle p-3"><dt className="text-caption text-ink-sub">확신도 보정 정확도</dt><dd className="text-lead font-semibold">{s.calibration}%</dd></div></dl>
    <div className="mt-5 grid gap-4 md:grid-cols-2"><div><h4 className="mb-2 text-body font-semibold">해설 전 생각 요약 · 저장 기록</h4><p className={paragraph}>{s.beforeSummary || '기록 없음'}</p></div><div><h4 className="mb-2 text-body font-semibold">해설 후 내 설명</h4><p className={paragraph}>{s.afterExplanation || '아직 작성하지 않았습니다.'}</p></div></div>
    <h4 className="mt-6 text-body font-semibold">주장별 제출 원문</h4><div className="mt-3 space-y-3">{s.answers.map((answer, index) => <section key={`${answer.claimId}-${index}`} className="rounded-block border border-line p-4"><h5 className="text-body font-semibold">주장 {answer.claimId} · {answer.judgment === 'correct' ? '맞다' : '틀리다'} · 확신도 {answer.confidence}%</h5><p className={`${paragraph} mt-2`}>{answer.reasoning}</p>{answer.correction && <p className={`${paragraph} mt-3`}><strong>올바른 개념: </strong>{answer.correction}</p>}<p className="mt-3 break-words text-caption text-ink-sub">선택 근거: {answer.evidenceId || '선택 없음'}</p></section>)}</div>
  </details>;
}
