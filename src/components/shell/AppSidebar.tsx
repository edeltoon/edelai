import Link from 'next/link';
import { BookIcon, PlusIcon } from './icons';

export interface SidebarItem {
  key: string;
  label: string;
  href?: string;
  active?: boolean;
  /** 클릭 불가 (예: 데모에서 열리지 않는 과목, 퀴즈 중 잠긴 대화) */
  disabled?: boolean;
  /** disabled일 때 툴팁 문구. 예: "준비 중" */
  disabledHint?: string;
  /** 과목 항목이면 책 아이콘 */
  icon?: 'course';
}

export interface SidebarSection {
  key: string;
  title: string;
  items: SidebarItem[];
  /** 항목이 없을 때 안내 */
  emptyText?: string;
}

export interface SidebarAction {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledHint?: string;
}

export interface AppSidebarProps {
  primaryAction?: SidebarAction;
  sections: SidebarSection[];
  /** initial: 이니셜 원에 넣을 글자. 없으면 이름에서 고른다 (김동하 → 동) */
  user: { name: string; caption: string; initial?: string };
  /** 항목을 눌렀을 때 (모바일 드로어 닫기용) */
  onNavigate?: () => void;
}

function PrimaryAction({ action, onNavigate }: { action: SidebarAction; onNavigate?: () => void }) {
  const cls =
    'flex h-11 w-full items-center gap-2 rounded-control border border-line bg-page px-3 text-body text-ink';
  const inner = (
    <>
      <PlusIcon />
      {action.label}
    </>
  );
  if (action.disabled) {
    return (
      <span className={`${cls} cursor-not-allowed text-ink-sub opacity-60`} title={action.disabledHint} aria-disabled>
        {inner}
      </span>
    );
  }
  if (action.href) {
    return (
      <Link
        href={action.href}
        className={cls}
        onClick={() => {
          action.onClick?.();
          onNavigate?.();
        }}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      onClick={() => {
        action.onClick?.();
        onNavigate?.();
      }}
    >
      {inner}
    </button>
  );
}

function Item({ item, onNavigate }: { item: SidebarItem; onNavigate?: () => void }) {
  const base = 'flex w-full items-start gap-2 rounded-control px-3 py-2 text-left text-body leading-snug';
  const icon = item.icon === 'course' ? <BookIcon className="mt-1 size-4 shrink-0" /> : null;

  if (item.disabled || !item.href) {
    return (
      <span
        className={`${base} cursor-not-allowed text-ink-sub`}
        title={item.disabledHint}
        aria-disabled
      >
        {icon}
        <span className="min-w-0 break-keep">{item.label}</span>
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={item.active ? 'page' : undefined}
      className={`${base} ${item.active ? 'bg-sejong-muted font-semibold text-sejong' : 'text-ink hover:bg-subtle'}`}
    >
      {icon}
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  );
}

export function AppSidebar({ primaryAction, sections, user, onNavigate }: AppSidebarProps) {
  return (
    <nav aria-label="사이드 메뉴" className="flex h-full flex-col bg-sidebar px-3 py-4">
      {primaryAction && <PrimaryAction action={primaryAction} onNavigate={onNavigate} />}

      <div className="mt-5 flex-1 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <section key={section.key}>
            <h2 className="px-3 pb-1 text-caption text-ink-sub">{section.title}</h2>
            {section.items.length === 0 && section.emptyText ? (
              <p className="px-3 py-1 text-caption text-ink-sub">{section.emptyText}</p>
            ) : (
              <ul>
                {section.items.map((item) => (
                  <li key={item.key}>
                    <Item item={item} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-line px-2 pt-4">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bubble text-caption font-semibold text-ink"
        >
          {user.initial ?? (user.name.length >= 3 ? user.name.slice(1, 2) : user.name.slice(0, 1))}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-body text-ink">{user.name}</span>
          <span className="text-caption text-ink-sub">{user.caption}</span>
        </span>
      </div>
    </nav>
  );
}
