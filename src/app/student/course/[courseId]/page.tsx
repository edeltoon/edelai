import { Suspense } from 'react';
import { CourseHeader, TabPlaceholder } from '@/features/student/CourseHeader';
import { FreeStudyView } from '@/features/student/chat/FreeStudyView';
import { generateCourseParams, requireCourseId } from './course';

export const dynamicParams = false;
export const generateStaticParams = generateCourseParams;

/** 자유 학습 탭: 과목 AI와 대화 (?c=대화id) */
export default async function FreeStudyPage({ params }: PageProps<'/student/course/[courseId]'>) {
  const courseId = requireCourseId((await params).courseId);
  return (
    <>
      <CourseHeader courseId={courseId} />
      {courseId === 'phil' ? (
        <Suspense fallback={<p className="px-8 py-10 text-body text-ink-sub">대화를 불러오고 있어요…</p>}>
          <FreeStudyView courseId="phil" />
        </Suspense>
      ) : (
        <TabPlaceholder title="자유 학습" body="이 과목의 과목 AI는 준비 중이에요." />
      )}
    </>
  );
}
