// 강의자료 근거 (학생 화면 임시 데이터).
// 현재 /api/chat은 근거를 주지 않으므로, 자유 학습의 근거 칩과 챌린지 근거 선택지는 이 파일을 쓴다.
// API가 근거(강의자료 검색 결과)를 주면 이 파일 대신 API 응답으로 교체한다. (docs/STUDENT_RECORDS.md)
// TODO(검수 필요): 쪽수·발췌문은 실제 강의자료가 없어 PLAN.md와 설계안 문구로 만든 초안
import type { Evidence } from '@/types/content';

export interface LectureEvidence extends Evidence {
  conceptId: string;
  /** 근거 선택지에 붙는 주제. 예: "동굴의 비유" */
  topic: string;
  excerpt: string;
}

export const LECTURE_EVIDENCE: LectureEvidence[] = [
  {
    id: 'ev-w3-p10',
    conceptId: 'idea',
    label: '3주차 강의자료 · p.10',
    topic: '이데아론의 실재관',
    excerpt:
      '플라톤에게 참된 실재는 변하지 않는 이데아이다. 우리가 감각으로 경험하는 개별 사물은 이데아를 불완전하게 닮은 모방이며, 생성하고 소멸한다.',
  },
  {
    id: 'ev-w3-p12',
    conceptId: 'cave',
    label: '3주차 강의자료 · p.12',
    topic: '동굴의 비유',
    excerpt:
      '동굴 속 사람들은 벽에 비친 그림자를 실재로 여긴다. 동굴 밖으로 나온 사람은 사물과 태양을 보고 그림자가 모방이었음을 깨닫는다. 동굴 밖의 세계는 이데아의 세계에, 태양은 선의 이데아에 대응한다.',
  },
  {
    id: 'ev-w3-p14',
    conceptId: 'cave',
    label: '3주차 강의자료 · p.14',
    topic: '인식의 단계',
    excerpt:
      '선분의 비유는 인식을 상상, 믿음, 추론적 사고, 지성의 네 단계로 나눈다. 동굴에서 밖으로 나가는 과정은 낮은 인식에서 높은 인식으로 올라가는 과정에 대응한다.',
  },
  {
    id: 'ev-w4-p05',
    conceptId: 'hylomorphism',
    label: '4주차 강의자료 · p.5',
    topic: '형상과 질료',
    excerpt:
      '아리스토텔레스는 형상을 개별 사물 밖의 이데아가 아니라 사물 안에 있는 원리로 본다. 모든 개별 실체는 질료와 형상의 결합이다.',
  },
  {
    id: 'ev-w2-p08',
    conceptId: 'socratic',
    label: '2주차 강의자료 · p.8',
    topic: '소크라테스 문답법',
    excerpt:
      '소크라테스는 질문과 반박을 이어 가며 상대가 스스로 무지를 깨닫게 하고, 개념의 정의에 다가가도록 돕는다. 이를 산파술이라고도 부른다.',
  },
  {
    id: 'ev-w5-p09',
    conceptId: 'virtue',
    label: '5주차 강의자료 · p.9',
    topic: '덕 윤리',
    excerpt:
      '아리스토텔레스에게 덕은 반복된 실천으로 형성되는 성품이며, 지나침과 모자람 사이의 중용을 고르는 능력이다. 덕 있는 삶은 행복(에우다이모니아)으로 이어진다.',
  },
];

export function getEvidence(evidenceId: string): LectureEvidence | undefined {
  return LECTURE_EVIDENCE.find((e) => e.id === evidenceId);
}
