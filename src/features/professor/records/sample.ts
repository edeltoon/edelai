import type { StudentView } from './reader';

// 명시적으로 예시를 선택할 때만 표시한다. 실제 학생 기록이나 평가 결과가 아니다.
export const sampleStudents: StudentView[] = [{
  id: 'example-student',
  submissions: [{ id: 'example-submission', challengeId: '이데아론 검증 예시', submittedAt: '2026-10-02T06:00:00Z',
    score: { judgment: 1, reasoning: 2, concept: 2, evidence: 2, penalty: 0, total: 7 }, calibration: 98,
    grader: 'mock', beforeSummary: '이데아와 감각 세계 중 무엇이 원본인지 헷갈렸지만 근거를 보고 관계를 구분했습니다.',
    afterExplanation: '이데아는 참된 실재이고, 감각 세계의 사물은 이데아의 불완전한 모방입니다.',
    answers: [{ claimId: 'B', judgment: 'wrong', confidence: 85, reasoning: '실재와 모방의 관계가 강의 설명과 반대로 적혀 있습니다.',
      correction: '이데아가 참된 실재입니다.', evidenceId: '예시 근거 · 이데아론', pastedChars: 0 }],
  }],
  conversations: [{ id: 'example-conversation', title: '이데아와 감각 세계', messages: [
    { id: 'example-question', role: 'user', text: '이데아와 감각 세계의 관계를 설명해 주세요.' },
    { id: 'example-answer', role: 'ai', text: '플라톤은 이데아를 참된 실재로, 감각 세계를 그 불완전한 모방으로 설명합니다. 어떤 쪽이 변하지 않는다고 생각하나요?' },
  ] }],
}];
