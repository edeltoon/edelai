import { notFound } from 'next/navigation';
import { ChallengeView } from '@/features/student/challenge/ChallengeView';
import { CHALLENGES } from '@/features/student/content/challenges';
import { requireCourseId } from '../../course';

/** 검증 챌린지 풀이. 주장·정답은 여기서 넘기지 않고 화면이 API로 불러온다(정답은 제출 후에만) */
export default async function ChallengePage({ params }: PageProps<'/student/course/[courseId]/challenge/[challengeId]'>) {
  const { courseId, challengeId } = await params;
  requireCourseId(courseId);
  if (!CHALLENGES.some((c) => c.id === challengeId && c.courseId === courseId)) notFound();
  return <ChallengeView courseId={courseId} challengeId={challengeId} />;
}
