'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell, type SidebarSection } from '@/components/shell';
import type { Session } from '@/types/session';
import { COURSES, PHIL_COURSE_ID } from './content/courses';
import { DemoResetButton } from './DemoResetButton';
import { LogoutButton } from '@/features/login/LogoutButton';
import { useStoreQuery } from './hooks/useStoreQuery';
import { courseIdOf, studentRoutes } from './routes';
import { studentStore } from './services/store';
import { StudentSessionProvider } from './StudentSession';

const RECENT_LIMIT = 8;

function StudentShell({ session, children }: { session: Session; children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCourseId = courseIdOf(pathname);
  const activeConversationId = searchParams.get('c');
  // 사이드바 "과목별 최근 대화"는 지금 보고 있는 과목(없으면 서양철학) 기준
  const recentCourseId = activeCourseId ?? PHIL_COURSE_ID;

  const { data: conversations = [] } = useStoreQuery(`conversations:${session.userId}:${recentCourseId}`, () =>
    studentStore.listConversations(session.userId, recentCourseId),
  );

  const sections: SidebarSection[] = [
    {
      key: 'courses',
      title: '나의 수강 과목',
      items: COURSES.map((course) => ({
        key: course.id,
        label: course.name,
        icon: 'course' as const,
        href: course.enabled ? studentRoutes.freeStudy(course.id) : undefined,
        active: course.id === activeCourseId,
        disabled: !course.enabled,
        disabledHint: '준비 중',
      })),
    },
    {
      key: 'recent',
      title: '과목별 최근 대화',
      emptyText: '아직 대화가 없어요. 질문을 보내면 여기에 저장돼요.',
      items: conversations.slice(0, RECENT_LIMIT).map((c) => ({
        key: c.id,
        label: c.title,
        href: studentRoutes.freeStudy(c.courseId, c.id),
        active: c.id === activeConversationId,
      })),
    },
  ];

  return (
    <AppShell
      header={{ spaceName: 'AI 학습 공간', role: 'student', userName: session.name, actions: <><DemoResetButton /><LogoutButton /></> }}
      sidebar={{
        primaryAction: { label: '새 대화', href: studentRoutes.freeStudy(recentCourseId) },
        sections,
        user: { name: session.name, caption: '학생' },
      }}
    >
      {children}
    </AppShell>
  );
}

/** 서버가 확인한 학생 계정으로 셸과 저장소 사용자 ID를 연결한다. */
export function StudentLayout({ session, children }: { session: Session; children: ReactNode }) {
  return (
    <StudentSessionProvider value={session}>
      <StudentShell session={session}>{children}</StudentShell>
    </StudentSessionProvider>
  );
}
