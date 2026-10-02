// 학생 화면 경로. 화면 곳곳에서 문자열을 직접 쓰지 않고 여기서 만든다.

export const studentRoutes = {
  home: () => '/student',
  freeStudy: (courseId: string, conversationId?: string) =>
    conversationId
      ? `/student/course/${courseId}?c=${encodeURIComponent(conversationId)}`
      : `/student/course/${courseId}`,
  challenges: (courseId: string) => `/student/course/${courseId}/challenge`,
  challenge: (courseId: string, challengeId: string) => `/student/course/${courseId}/challenge/${challengeId}`,
  result: (courseId: string, challengeId: string) => `/student/course/${courseId}/result/${challengeId}`,
  records: (courseId: string) => `/student/course/${courseId}/records`,
};

export type CourseTabKey = 'free' | 'challenge' | 'records';

/** 현재 경로가 어느 과목 탭에 속하는지. 결과 화면은 검증 챌린지 탭에 속한다 */
export function courseTabOf(pathname: string): CourseTabKey {
  if (/\/(challenge|result)(\/|$)/.test(pathname)) return 'challenge';
  if (/\/records(\/|$)/.test(pathname)) return 'records';
  return 'free';
}

/** '/student/course/phil/...' → 'phil' */
export function courseIdOf(pathname: string): string | null {
  return /^\/student\/course\/([^/]+)/.exec(pathname)?.[1] ?? null;
}
