import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE, verifyAccess } from '@/lib/server/auth';
import { StudentLayout } from '@/features/student/StudentLayout';

export default async function Layout({ children }: LayoutProps<'/student'>) {
  const session = await verifyAccess((await cookies()).get(AUTH_COOKIE)?.value);
  if (!session || session.role !== 'student') redirect('/');
  // StudentLayout이 useSearchParams(최근 대화 선택 표시)를 써서 Suspense로 감싼다
  return (
    <Suspense fallback={<div className="min-h-dvh bg-page" aria-busy="true" />}>
      <StudentLayout session={session}>{children}</StudentLayout>
    </Suspense>
  );
}
