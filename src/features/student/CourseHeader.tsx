'use client';

import { usePathname } from 'next/navigation';
import { SpaceTabs, SpaceTitleBar } from '@/components/shell';
import { getCourse } from './content/courses';
import { courseTabOf, studentRoutes } from './routes';

/** 과목 제목 + 탭 (자유 학습 / 검증 챌린지 / 학습 기록) */
export function CourseHeader({ courseId }: { courseId: string }) {
  const pathname = usePathname();
  const course = getCourse(courseId);
  return (
    <SpaceTitleBar title={course?.name ?? '과목'}>
      <SpaceTabs
        activeKey={courseTabOf(pathname)}
        tabs={[
          { key: 'free', label: '자유 학습', href: studentRoutes.freeStudy(courseId) },
          { key: 'challenge', label: '검증 챌린지', href: studentRoutes.challenges(courseId) },
          { key: 'records', label: '학습 기록', href: studentRoutes.records(courseId) },
        ]}
      />
    </SpaceTitleBar>
  );
}

/** 아직 만들지 않은 탭 본문 자리 */
export function TabPlaceholder({ title, body }: { title: string; body: string }) {
  return (
    <section className="mx-auto w-full max-w-[720px] px-4 py-12 sm:px-8">
      <h2 className="text-lead font-bold text-ink">{title}</h2>
      <p className="mt-2 text-body text-ink-sub">{body}</p>
    </section>
  );
}
