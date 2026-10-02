import { CourseHeader, TabPlaceholder } from '@/features/student/CourseHeader';
import { generateCourseParams, requireCourseId } from '../course';

export const dynamicParams = false;
export const generateStaticParams = generateCourseParams;

/** 학습 기록 탭 (첫 목표 이후 구현) */
export default async function RecordsPage({ params }: PageProps<'/student/course/[courseId]/records'>) {
  const courseId = requireCourseId((await params).courseId);
  return (
    <>
      <CourseHeader courseId={courseId} />
      <TabPlaceholder
        title="학습 기록"
        body="내 제출, 점수, 재인출 기록을 모아 보는 화면은 준비 중이에요. 제출한 챌린지의 해설은 검증 챌린지 탭에서 다시 볼 수 있어요."
      />
    </>
  );
}
