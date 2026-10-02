// 서양철학 핵심 개념 5개와 키워드. 키워드는 본인 생각 점수(키워드 규칙)에 쓰인다.
// TODO(검수 필요): 개념 이름과 키워드는 철학 내용 담당 검수 전 초안
import type { Concept } from '@/types/content';
import { PHIL_COURSE_ID } from './courses';

export const CONCEPTS: Concept[] = [
  {
    id: 'idea',
    courseId: PHIL_COURSE_ID,
    name: '이데아론',
    keywords: ['이데아', '실재', '모방', '감각 세계', '본질', '참된', '불완전', '현상'],
  },
  {
    id: 'cave',
    courseId: PHIL_COURSE_ID,
    name: '동굴의 비유',
    keywords: ['동굴', '그림자', '비유', '인식', '동굴 밖', '태양', '죄수', '단계'],
  },
  {
    id: 'socratic',
    courseId: PHIL_COURSE_ID,
    name: '소크라테스 문답법',
    keywords: ['문답', '산파술', '무지', '질문', '반박', '대화', '정의'],
  },
  {
    id: 'hylomorphism',
    courseId: PHIL_COURSE_ID,
    name: '아리스토텔레스 형상과 질료',
    keywords: ['형상', '질료', '아리스토텔레스', '실체', '개별', '가능태', '현실태'],
  },
  {
    id: 'virtue',
    courseId: PHIL_COURSE_ID,
    name: '덕 윤리',
    keywords: ['덕', '중용', '습관', '행복', '에우다이모니아', '성품', '실천'],
  },
];

export function getConcept(conceptId: string): Concept | undefined {
  return CONCEPTS.find((c) => c.id === conceptId);
}
