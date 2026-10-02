import { Suspense } from 'react';
import { StudentLayout } from '@/features/student/StudentLayout';

export default function Layout({ children }: LayoutProps<'/student'>) {
  // StudentLayout이 useSearchParams(최근 대화 선택 표시)를 써서 Suspense로 감싼다
  return (
    <Suspense fallback={<div className="min-h-dvh bg-page" aria-busy="true" />}>
      <StudentLayout>{children}</StudentLayout>
    </Suspense>
  );
}
