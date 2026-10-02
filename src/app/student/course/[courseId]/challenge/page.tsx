import { CourseHeader } from '@/features/student/CourseHeader';
import { ChallengeListView } from '@/features/student/challenge/ChallengeListView';
import { generateCourseParams, requireCourseId } from '../course';

export const dynamicParams = false;
export const generateStaticParams = generateCourseParams;

/** 검증 챌린지 탭 */
export default async function ChallengeListPage({ params }: PageProps<'/student/course/[courseId]/challenge'>) {
  const courseId = requireCourseId((await params).courseId);
  return (
    <>
      <CourseHeader courseId={courseId} />
      <ChallengeListView courseId={courseId} />
    </>
  );
}
