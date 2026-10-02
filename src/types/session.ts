// 세션 타입 (확정). 역할 선택 화면이 저장하고 학생·교수 화면이 읽는다.

export type Role = 'student' | 'professor';

/**
 * localStorage `edeltoon:session` (확정). 역할 선택 화면이 저장하고 학생·교수 화면이 읽는다.
 * 실제 인증 없음, 가상 정보만. 형태를 바꾸면 팀원(교수 화면·서버 API 담당)에게 공유한다.
 */
export interface Session {
  role: Role;
  /** 학생: s1~s5, 교수: p1 */
  userId: string;
  name: string;
  /** 학번·교번 (가상) */
  memberNo: string;
  major?: string;
  signedInAt: string; // ISO
}
