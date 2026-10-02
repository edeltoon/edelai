import Link from 'next/link';
import type { ReactNode } from 'react';

/** 챌린지·결과 화면의 안내 상태 (승인 전, 로그인 만료, 오류, 제출 완료 등) */
export function StateNotice({
  title,
  body,
  tone = 'plain',
  actions,
}: {
  title: string;
  body: string;
  tone?: 'plain' | 'challenge' | 'wrong';
  actions?: ReactNode;
}) {
  const box =
    tone === 'challenge'
      ? 'border-challenge-border bg-challenge-bg'
      : tone === 'wrong'
        ? 'border-wrong-bg bg-wrong-bg'
        : 'border-line bg-subtle';
  return (
    <section role={tone === 'wrong' ? 'alert' : 'status'} className={`mx-auto mt-10 w-full max-w-[720px] rounded-block border px-6 py-6 ${box}`}>
      <h2 className={`text-title font-bold ${tone === 'challenge' ? 'text-challenge' : tone === 'wrong' ? 'text-wrong' : 'text-ink'}`}>{title}</h2>
      <p className="mt-2 text-body text-ink">{body}</p>
      {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-10 items-center rounded-control bg-sejong px-4 text-body font-semibold text-(--color-page)">
      {children}
    </Link>
  );
}

export function SecondaryButton({ onClick, children, disabled }: { onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 items-center rounded-control border border-line-strong bg-page px-4 text-body text-ink disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-10 items-center rounded-control border border-line-strong bg-page px-4 text-body text-ink">
      {children}
    </Link>
  );
}
