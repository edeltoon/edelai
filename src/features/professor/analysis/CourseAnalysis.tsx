'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ProfessorShell } from '../ProfessorShell';
import { useRecords } from '../records/useRecords';
import { analysisSamples } from './sample';
import { summarize } from './summarize';

const panel = 'rounded-block border border-line bg-page p-5 sm:p-6';
const button = 'rounded-control border border-line-strong bg-page px-4 py-2 text-body hover:bg-subtle';
const value = (n: number | null, suffix = '') => n === null ? '—' : `${n.toFixed(1)}${suffix}`;

export function CourseAnalysis() {
  const { snapshot, loaded, refresh } = useRecords();
  const [sample, setSample] = useState(false);
  const [selection, setSelection] = useState('');
  const students = sample ? analysisSamples : snapshot.students;
  const challenges = [...new Set(students.flatMap(student => student.submissions.map(s => s.challengeId)))].sort();
  const selected = challenges.includes(selection) ? selection : '';
  const report = summarize(students, selected);
  return <ProfessorShell active="analysis"><div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-(length:--text-page) font-bold">수업 분석</h2><p className="mt-2 text-body text-ink-sub">제출 현황과 판단 결과를 살펴보고, 학생 기록에서 이유를 확인하세요.</p></div><button className={button} onClick={refresh}>기록 새로 읽기</button></div>
    <p className="mt-5 rounded-block bg-info-soft p-4 text-body text-info">현재 같은 브라우저의 임시 기록을 집계합니다. Supabase 연결 전이며, 로컬 기록은 공식 평가 자료가 아닙니다. AI가 새로 분석하거나 채점하는 화면은 아닙니다.</p>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><label className="text-body font-semibold">챌린지<select className="mt-2 block max-w-full rounded-control border border-line-strong bg-page p-2 font-normal" value={selected} onChange={e => setSelection(e.target.value)}><option value="">전체 챌린지</option>{challenges.map(id => <option key={id} value={id}>{id}</option>)}</select></label><button className={button} aria-pressed={sample} onClick={() => { setSample(!sample); setSelection(''); }}>{sample ? '저장된 기록으로 돌아가기' : '분석 예시 보기'}</button></div>
    <p role="status" className="mt-3 text-caption text-ink-sub">{sample ? '가상 학생 3명의 예시입니다. 저장된 기록과 섞거나 저장소에 쓰지 않습니다.' : loaded ? '학생·챌린지별 최신 제출만 집계합니다. 수강생 명부가 없어 전체 수강생 대비 제출률은 계산하지 않습니다.' : '기록을 읽는 중입니다…'}</p>
    {!sample && snapshot.warnings.length > 0 && <div role="alert" className="mt-4 rounded-block bg-caution-bg p-4 text-body text-caution"><p>일부 기록이 제외되어 집계가 불완전할 수 있습니다.</p><ul className="mt-2 list-inside list-disc">{snapshot.warnings.map(w => <li key={w}>{w}</li>)}</ul></div>}
    <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ['제출 학생', `${report.studentCount}명`], ['집계 제출', `${report.rows.length}건`], ['채점 완료 평균', value(report.averageScore, ' / 7')], ['평균 확신도 보정', value(report.averageCalibration, '%')],
    ].map(([label, text]) => <div className={panel} key={label}><dt className="text-body text-ink-sub">{label}</dt><dd className="mt-3 text-(length:--text-page) font-bold tabular">{text}</dd></div>)}</dl>
    <p role="status" className="mt-3 text-body text-challenge">채점 대기 {report.pendingCount}건 · 채점 완료 {report.completedCount}건. 점수 평균과 분포는 완료 기록만 포함합니다.</p>
    <p className="mt-3 text-caption text-ink-sub">채점 출처: 예시 {report.sources.mock}건 · 서버로 표시 {report.sources.server}건 · 미확인 {report.sources.unknown}건. 혼합 기록이면 완료 점수 평균에도 출처 구분 없이 포함됩니다. 서버 표시는 로컬 데이터의 진위를 보증하지 않습니다.</p>
    {!report.rows.length ? <section className={`${panel} mt-6`}><h3 className="text-title font-bold">분석할 제출 기록이 없습니다</h3><p className="mt-3 text-body text-ink-sub">학생 제출이 저장되면 여기에 표시됩니다. ‘분석 예시 보기’로 화면 구성을 확인할 수 있습니다.</p></section> : <>
      <div className="mt-6 grid gap-6 lg:grid-cols-2"><section className={panel}><h3 className="text-title font-bold">점수 분포</h3><p className="mt-2 text-caption text-ink-sub">채점 완료 {report.completedCount}건 기준 · 구간별 건수</p><ul className="mt-5 space-y-4">{report.distribution.map(bucket => <li key={bucket.label}><div className="mb-2 flex justify-between gap-2 text-body"><span>{bucket.label}</span><span>{bucket.count}건</span></div><div className="h-3 overflow-hidden rounded-full bg-subtle" aria-hidden="true"><div className="h-full rounded-full bg-sejong" style={{ width: `${(report.completedCount ? bucket.count / report.completedCount * 100 : 0)}%` }} /></div></li>)}</ul></section>
      <section className={panel}><h3 className="text-title font-bold">해설 후 설명 작성</h3><p className="mt-5 text-(length:--text-page) font-bold">{report.explained} / {report.rows.length}건</p><p className="mt-3 text-body text-ink-sub">{report.rows.length - report.explained}건에 해설 후 설명이 아직 없습니다. 작성 여부만 집계하며 설명의 정확성을 평가하지 않습니다.</p><Link href="/professor/course/phil/records" className="mt-6 inline-block text-body font-semibold text-sejong underline underline-offset-4">학생 기록에서 원문 확인 →</Link></section></div>
      <section className={`${panel} mt-6`}><h3 className="text-title font-bold">주장별 오답 현황</h3><p className="mt-2 text-caption text-ink-sub">저장된 정오답 기록이 있는 항목만 집계합니다. 학생이 ‘틀리다’를 선택했다는 이유만으로 오답 처리하지 않습니다. 주장 ID는 챌린지별로 구분합니다.</p>
        {report.claims.length ? <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-body"><caption className="sr-only">챌린지별 주장 판단 오답률</caption><thead className="bg-subtle text-ink-sub"><tr>{['챌린지', '주장', '오답 / 확인 기록', '오답률'].map(label => <th key={label} scope="col" className="p-3 font-semibold">{label}</th>)}</tr></thead><tbody>{report.claims.map(claim => <tr key={JSON.stringify([claim.challengeId, claim.claimId])} className="border-b border-line-soft"><td className="p-3">{claim.challengeId}</td><td className="p-3">{claim.claimId}</td><td className="p-3 tabular">{claim.wrong} / {claim.total}</td><td className="p-3 font-semibold tabular">{Math.round(claim.wrong / claim.total * 100)}%</td></tr>)}</tbody></table></div> : <p className="mt-4 text-body text-ink-sub">정오답 기록이 없어 오답률을 계산할 수 없습니다.</p>}
      </section>
    </>}
  </div></ProfessorShell>;
}
