// 셸에서 쓰는 작은 선형 아이콘. 장식용이라 aria-hidden.
type IconProps = { className?: string };

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function PlusIcon({ className = 'size-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} {...base}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

export function BookIcon({ className = 'size-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} {...base}>
      <rect x="3" y="2.5" width="10" height="11" rx="1" />
      <path d="M3 10.5h10" />
    </svg>
  );
}

export function MenuIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...base}>
      <path d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  );
}

export function CloseIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" className={className} {...base}>
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}
