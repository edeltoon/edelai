import { redirect } from 'next/navigation';
import { PHIL_COURSE_ID } from '@/features/student/content/courses';
import { studentRoutes } from '@/features/student/routes';

/** 학생 첫 화면: 설계안에 나의강좌 목록이 없어 서양철학 자유 학습으로 바로 보낸다 */
export default function StudentHome() {
  redirect(studentRoutes.freeStudy(PHIL_COURSE_ID));
}
