import { CourseHeader, TabPlaceholder } from '@/features/student/CourseHeader';
import { generateCourseParams, requireCourseId } from './course';

export const dynamicParams = false;
export const generateStaticParams = generateCourseParams;

/** 자유 학습 탭 */
export default async function FreeStudyPage({ params }: PageProps<'/student/course/[courseId]'>) {
  const courseId = requireCourseId((await params).courseId);
  return (
    <>
      <CourseHeader courseId={courseId} />
      <TabPlaceholder title="자유 학습" body="과목 AI와의 대화 화면은 다음 단계에서 연결해요." />
    </>
  );
}
