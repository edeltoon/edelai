import { CourseHeader, TabPlaceholder } from '@/features/student/CourseHeader';
import { generateCourseParams, requireCourseId } from '../course';

export const dynamicParams = false;
export const generateStaticParams = generateCourseParams;

/** 검증 챌린지 탭 */
export default async function ChallengeListPage({ params }: PageProps<'/student/course/[courseId]/challenge'>) {
  const courseId = requireCourseId((await params).courseId);
  return (
    <>
      <CourseHeader courseId={courseId} />
      <TabPlaceholder title="검증 챌린지" body="챌린지 목록과 풀이 화면은 다음 단계에서 연결해요." />
    </>
  );
}
