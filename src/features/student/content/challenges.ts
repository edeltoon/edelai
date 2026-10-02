// 검증 챌린지 공개 데이터 (학생 화면 임시). 어떤 주장이 오류인지는 여기에 절대 넣지 않는다.
// 정답·해설은 services/mock/answerKey.ts에만 있고, 제출 시점에 mock 채점 안에서만 불러온다.
//
// 교수 승인 오류 카드 → 학생 챌린지 연결은 통합 단계에서 처리한다.
// 그 전까지는 이 파일의 챌린지를 쓴다. (docs/STUDENT_RECORDS.md)
// TODO(검수 필요): 주장 문장은 설계안 문구 그대로, 철학 내용 담당 검수 전
import type { ChallengePublic } from '../services/ai.types';
import { getEvidence } from './lecture';

function evidenceOption(id: string) {
  const ev = getEvidence(id);
  if (!ev) throw new Error(`근거 ${id}가 lecture.ts에 없어요`);
  return { id: ev.id, label: ev.label, topic: ev.topic };
}

export const CHALLENGES: ChallengePublic[] = [
  {
    id: 'ch1',
    courseId: 'phil',
    conceptId: 'idea',
    conceptName: '이데아론',
    title: '이데아론',
    question: '플라톤의 이데아론과 우리가 보는 현실 세계의 관계를 설명해줘.',
    errorCount: 1,
    claims: [
      { id: 'ch1-a', label: 'A', text: '감각 세계는 우리가 감각으로 경험하는 세계다.' },
      { id: 'ch1-b', label: 'B', text: '플라톤은 감각 세계를 진정한 실재, 이데아를 그 모방으로 보았다.' },
      { id: 'ch1-c', label: 'C', text: '동굴의 비유는 인식의 단계와 실재에 대한 이해를 설명한다.' },
    ],
    evidenceOptions: ['ev-w3-p12', 'ev-w3-p10', 'ev-w3-p14', 'ev-w4-p05'].map(evidenceOption),
  },
];

export function getChallengePublic(challengeId: string): ChallengePublic | undefined {
  return CHALLENGES.find((c) => c.id === challengeId);
}

/** 정적 라우트 생성용 */
export function challengeIds(courseId: string): string[] {
  return CHALLENGES.filter((c) => c.courseId === courseId).map((c) => c.id);
}
