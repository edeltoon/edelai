import Link from 'next/link';

export interface SpaceTab {
  key: string;
  label: string;
  href: string;
}

export interface SpaceTabsProps {
  tabs: SpaceTab[];
  activeKey: string;
  /** 스크린리더용 이름. 예: "과목 메뉴" */
  label?: string;
}

/** 과목 제목 행 오른쪽 탭. 활성 탭은 연분홍 채움 + 크림슨 글자 */
export function SpaceTabs({ tabs, activeKey, label = '과목 메뉴' }: SpaceTabsProps) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-control px-4 py-2 text-body ${
              active ? 'bg-sejong-soft font-semibold text-sejong' : 'text-ink-sub hover:text-ink'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** 과목 제목 + 탭 한 줄. 본문 영역 맨 위에 놓는다 */
export function SpaceTitleBar({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-8">
      <h1 className="text-title font-bold text-ink">{title}</h1>
      {children}
    </div>
  );
}
