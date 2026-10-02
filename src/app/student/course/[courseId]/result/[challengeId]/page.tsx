import { notFound } from 'next/navigation';
import { CHALLENGES } from '@/features/student/content/challenges';
import { ResultView } from '@/features/student/result/ResultView';
import { requireCourseId } from '../../course';

/** 검증 챌린지 결과·해설 (제출한 학생만) */
export default async function ResultPage({ params }: PageProps<'/student/course/[courseId]/result/[challengeId]'>) {
  const { courseId, challengeId } = await params;
  requireCourseId(courseId);
  if (!CHALLENGES.some((c) => c.id === challengeId && c.courseId === courseId)) notFound();
  return <ResultView courseId={courseId} challengeId={challengeId} />;
}
