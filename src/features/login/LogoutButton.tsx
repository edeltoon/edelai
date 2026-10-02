'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession } from '@/lib/session';
export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <div><button disabled={busy} className="rounded-control border border-line px-3 py-1 text-caption" onClick={async () => {
    setBusy(true); setError('');
    try {
      const result = await fetch('/api/auth/logout', { method: 'POST' });
      if (!result.ok) throw new Error();
      clearSession(); router.replace('/'); router.refresh();
    } catch { setError('로그아웃하지 못했어요. 다시 시도해 주세요.'); setBusy(false); }
  }}>{busy ? '처리 중…' : '로그아웃'}</button>{error && <p role="alert" className="text-caption text-wrong">{error}</p>}</div>;
}
