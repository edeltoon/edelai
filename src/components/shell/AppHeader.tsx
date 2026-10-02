import type { ReactNode } from 'react';
import type { Role } from '@/types/session';
import { RoleBadge } from './RoleBadge';
import { MenuIcon } from './icons';
import { Wordmark } from './Wordmark';

export interface AppHeaderProps {
  /** 예: "AI 학습 공간", "AI 교수 공간" */
  spaceName: string;
  role: Role;
  userName: string;
  /** 오른쪽 배지 앞에 놓을 보조 동작 (시연 리셋 등) */
  actions?: ReactNode;
  /** 모바일에서 사이드바 드로어를 여는 버튼 */
  onOpenMenu?: () => void;
}

export function AppHeader({ spaceName, role, userName, actions, onOpenMenu }: AppHeaderProps) {
  return (
    <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-line-soft bg-page px-4 lg:px-6">
      {onOpenMenu && (
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="메뉴 열기"
          className="-ml-1 rounded-control p-1.5 text-ink lg:hidden"
        >
          <MenuIcon />
        </button>
      )}
      <Wordmark />
      <span aria-hidden className="hidden h-8 w-px bg-line sm:block" />
      <p className="hidden text-title font-bold text-ink sm:block">{spaceName}</p>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        {actions}
        <RoleBadge role={role} />
        <span className="hidden whitespace-nowrap text-body text-ink sm:inline">{userName}</span>
      </div>
    </header>
  );
}
