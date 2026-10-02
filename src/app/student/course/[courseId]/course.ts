import { notFound } from 'next/navigation';
import { enabledCourseIds, getCourse } from '@/features/student/content/courses';

/** 동적 라우트 공통: 열리는 과목만 만든다 */
export function generateCourseParams() {
  return enabledCourseIds().map((courseId) => ({ courseId }));
}

/** 열리지 않은 과목이면 404 */
export function requireCourseId(courseId: string): string {
  if (!getCourse(courseId)?.enabled) notFound();
  return courseId;
}
