import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppShell, SpaceTitleBar } from '@/components/shell';

export function ProfessorShell({ active, children }: { active: 'cards' | 'records'; children: ReactNode }) {
  const menus = [{ key: 'cards', label: '챌린지 관리', href: '/professor/course/phil/cards' },
    { key: 'records', label: '학생 기록', href: '/professor/course/phil/records' }];
  return <AppShell header={{ spaceName: 'AI 교수 공간', role: 'professor', userName: '담당 교수' }} sidebar={{
    sections: [
      { key: 'courses', title: '나의 담당 과목', items: [{ key: 'phil', label: '서양철학:쟁점과토론', href: menus[0].href, active: true, icon: 'course' }] },
      { key: 'tools', title: '과목 관리', items: menus.map(item => ({ ...item, active: item.key === active })) },
    ], user: { name: '담당 교수', caption: '교수 · 데모 공간', initial: '교' },
  }}>
    <SpaceTitleBar title="서양철학:쟁점과토론"><nav aria-label="교수 과목 메뉴" className="flex flex-wrap gap-1 text-body">
      <span aria-disabled="true" className="px-3 py-2 text-ink-sub" title="준비 중">수업 분석</span>
      {menus.map(item => <Link key={item.key} href={item.href} aria-current={active === item.key ? 'page' : undefined}
        className={`rounded-control px-3 py-2 ${active === item.key ? 'bg-sejong-soft font-semibold text-sejong' : 'text-ink-sub hover:bg-subtle'}`}>{item.label}</Link>)}
    </nav></SpaceTitleBar>
    {children}
  </AppShell>;
}
