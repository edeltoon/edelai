'use client';
import { useRef, useState } from 'react';
import { Wordmark } from '@/components/shell';
import { SESSION_KEY, SESSION_CHANGE_EVENT } from '@/lib/session';

export function MemberLogin() {
  const [memberNo, setMemberNo] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberNo, password }), signal: AbortSignal.timeout(30_000) });
      const result = await response.json();
      if (!response.ok || !result.ok) { setError(result.message || '로그인하지 못했어요.'); return; }
      if (result.next !== '/professor' && result.next !== '/student') throw new Error();
      // Display compatibility only. Server authorization never uses localStorage.
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(result.session)); } catch { /* cookie session remains available */ }
      window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
      window.location.assign(result.next);
    } catch { setError('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    finally { setPassword(''); setBusy(false); inFlight.current = false; }
  }
  return <main className="flex min-h-dvh flex-col items-center justify-center bg-subtle px-4 py-10">
    <header className="mb-8 text-center"><h1 className="text-hero font-bold text-ink">SeTask</h1><p className="mt-2 text-body text-ink-sub">AI 학습·평가 공간</p></header>
    <section className="w-full max-w-md rounded-block border border-line bg-page p-6 sm:p-8">
      <Wordmark /><h2 className="mt-7 text-title font-bold">학번·교번으로 로그인</h2>
      <p className="mt-2 text-body text-ink-sub">등록된 계정으로 로그인하면 학생 또는 교수 공간으로 이동합니다.</p>
      <form onSubmit={login} className="mt-6 space-y-5">
        <label className="block text-body font-semibold">학번·교번<input required autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={30} value={memberNo} onChange={e => setMemberNo(e.target.value)} disabled={busy} className="mt-2 w-full rounded-control border border-line-strong p-3 font-normal" placeholder="학번 또는 교번을 입력하세요" /></label>
        <label className="block text-body font-semibold">비밀번호<input required autoComplete="current-password" type={show ? 'text' : 'password'} maxLength={256} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} className="mt-2 w-full rounded-control border border-line-strong p-3 font-normal" placeholder="비밀번호를 입력하세요" /></label>
        <label className="flex items-center gap-2 text-caption text-ink-sub"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} className="accent-sejong" />비밀번호 표시</label>
        {error && <p role="alert" className="rounded-control bg-wrong-bg p-3 text-body text-wrong">{error}</p>}
        <button disabled={busy} aria-busy={busy} className="w-full rounded-control bg-sejong px-4 py-3 text-body font-semibold text-(--color-page) disabled:opacity-50">{busy ? '로그인 중…' : '로그인'}</button>
      </form>
      <p className="mt-6 border-t border-line pt-4 text-caption text-ink-sub">학교 포털과 연동된 계정이 아닙니다. SeTask에 별도로 등록된 계정을 사용해 주세요. 계정 발급·비밀번호 변경은 프로젝트 관리자에게 문의해 주세요.</p>
    </section>
  </main>;
}
