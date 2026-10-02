// 학생 사이드바 "나의 수강 과목". 서양철학만 열린다. 과목 코드·학기는 가상 값.
import type { Course } from '@/types/content';

export const PHIL_COURSE_ID = 'phil';

export const COURSES: Course[] = [
  { id: 'eng-math1', code: '000101-001', name: '공업수학1', term: '2026-2', professorName: '담당 교수', enabled: false },
  { id: 'calculus2', code: '000102-002', name: '미적분학2', term: '2026-2', professorName: '담당 교수', enabled: false },
  { id: 'linear-algebra', code: '000103-003', name: '선형대수', term: '2026-2', professorName: '담당 교수', enabled: false },
  { id: 'physics1', code: '000104-004', name: '일반물리학1', term: '2026-2', professorName: '담당 교수', enabled: false },
  { id: PHIL_COURSE_ID, code: '009068-045', name: '서양철학:쟁점과토론', term: '2026-2', professorName: '담당 교수', enabled: true },
  { id: 'adv-c', code: '000106-006', name: '고급C프로그래밍및실습', term: '2026-2', professorName: '담당 교수', enabled: false },
  { id: 'college-english', code: '000107-007', name: '대학영어', term: '2026-2', professorName: '담당 교수', enabled: false },
];

export function getCourse(courseId: string): Course | undefined {
  return COURSES.find((c) => c.id === courseId);
}

/** 정적 라우트 생성용: 열리는 과목 id만 */
export function enabledCourseIds(): string[] {
  return COURSES.filter((c) => c.enabled).map((c) => c.id);
}
