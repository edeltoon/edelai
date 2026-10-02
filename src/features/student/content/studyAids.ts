// 자유 학습 답변 아래에 붙이는 학습 보조 (개념 카드, 강의자료 근거 칩, 검증 챌린지 유도).
// /api/chat 응답은 본문 텍스트만 주므로, 학생 질문 키워드로 이 표를 찾아 붙인다.
// 매칭이 없으면 아무것도 붙이지 않는다 (근거를 지어내지 않는다).
// API가 근거·개념을 직접 주면 이 표를 API 응답으로 교체한다. (docs/STUDENT_RECORDS.md)
// TODO(검수 필요): 개념 카드 뜻풀이 초안
import type { CitationView, ConceptCardView } from '@/types/student-records';
import { getEvidence } from './lecture';

interface StudyAid {
  conceptId: string;
  /** 질문에 이 표현 중 하나가 들어 있으면 매칭 (공백 무시) */
  triggers: string[];
  concepts: ConceptCardView[];
  evidenceIds: string[];
  /** 같은 개념의 검증 챌린지 */
  challengeId?: string;
}

const STUDY_AIDS: StudyAid[] = [
  {
    conceptId: 'idea',
    triggers: ['이데아', '현실세계', '감각세계', '실재'],
    concepts: [
      { term: '이데아', gloss: '완전하고 변하지 않는 본질' },
      { term: '감각 세계', gloss: '우리가 경험하는 불완전한 모방' },
    ],
    evidenceIds: ['ev-w3-p12'],
    challengeId: 'ch1',
  },
  {
    conceptId: 'cave',
    triggers: ['동굴', '그림자'],
    concepts: [
      { term: '동굴 속 그림자', gloss: '감각으로 경험하는 세계' },
      { term: '동굴 밖 세계', gloss: '이데아의 세계, 참된 실재' },
    ],
    evidenceIds: ['ev-w3-p12', 'ev-w3-p14'],
    challengeId: 'ch1',
  },
  {
    conceptId: 'socratic',
    triggers: ['소크라테스', '문답', '산파술'],
    concepts: [
      { term: '산파술', gloss: '질문으로 상대가 스스로 답을 낳게 돕는 방법' },
      { term: '무지의 자각', gloss: '모른다는 것을 아는 데서 출발하는 탐구' },
    ],
    evidenceIds: ['ev-w2-p08'],
  },
  {
    conceptId: 'hylomorphism',
    triggers: ['아리스토텔레스', '형상', '질료'],
    concepts: [
      { term: '형상', gloss: '사물을 그 사물이게 하는 원리, 사물 안에 있음' },
      { term: '질료', gloss: '형상을 받아들이는 재료' },
    ],
    evidenceIds: ['ev-w4-p05'],
  },
  {
    conceptId: 'virtue',
    triggers: ['덕윤리', '중용', '에우다이모니아'],
    concepts: [
      { term: '덕', gloss: '반복된 실천으로 형성되는 좋은 성품' },
      { term: '중용', gloss: '지나침과 모자람 사이를 고르는 판단' },
    ],
    evidenceIds: ['ev-w5-p09'],
  },
];

export interface StudyAidView {
  conceptId: string;
  concepts: ConceptCardView[];
  citations: CitationView[];
  challengeId?: string;
}

/**
 * 질문에 맞는 학습 보조. 여러 개가 걸리면 가장 먼저 나온 표현의 항목.
 * 예) '플라톤의 이데아론과 현실 세계의 관계' → idea, '오늘 날씨' → null
 */
export function findStudyAid(question: string): StudyAidView | null {
  const text = question.replace(/\s+/g, '');
  let best: { aid: StudyAid; at: number } | null = null;
  for (const aid of STUDY_AIDS) {
    for (const t of aid.triggers) {
      const at = text.indexOf(t);
      if (at >= 0 && (best === null || at < best.at)) best = { aid, at };
    }
  }
  if (!best) return null;
  const { aid } = best;
  return {
    conceptId: aid.conceptId,
    concepts: aid.concepts,
    citations: aid.evidenceIds.flatMap((id) => {
      const ev = getEvidence(id);
      return ev ? [{ evidenceId: ev.id, label: ev.label }] : [];
    }),
    challengeId: aid.challengeId,
  };
}
