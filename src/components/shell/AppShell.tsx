'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AppHeader, type AppHeaderProps } from './AppHeader';
import { AppSidebar, type AppSidebarProps } from './AppSidebar';
import { CloseIcon } from './icons';

export interface AppShellProps {
  header: Omit<AppHeaderProps, 'onOpenMenu'>;
  sidebar: Omit<AppSidebarProps, 'onNavigate'>;
  children: ReactNode;
}

/**
 * 학생·교수 공통 셸: 헤더 + 왼쪽 사이드바 + 본문.
 * 1024px 이상은 사이드바 고정, 그 아래는 메뉴 버튼으로 여는 드로어.
 */
export function AppShell({ header, sidebar, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="flex h-dvh flex-col bg-page">
      <AppHeader {...header} onOpenMenu={() => setDrawerOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-line lg:block">
          <AppSidebar {...sidebar} />
        </aside>

        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="사이드 메뉴">
            <button
              type="button"
              aria-label="메뉴 닫기"
              className="absolute inset-0 bg-ink/30"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-sidebar shadow-lg">
              <button
                type="button"
                aria-label="메뉴 닫기"
                onClick={() => setDrawerOpen(false)}
                className="absolute right-2 top-3 rounded-control p-1.5 text-ink-sub"
              >
                <CloseIcon />
              </button>
              <div className="h-full pt-8">
                <AppSidebar {...sidebar} onNavigate={() => setDrawerOpen(false)} />
              </div>
            </div>
          </div>
        )}

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
