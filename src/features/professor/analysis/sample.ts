import type { StudentView } from '../records/reader';
import { sampleStudents } from '../records/sample';

export const analysisSamples: StudentView[] = [7, 4, 2].map((score, index) => ({
  id: `example-${index + 1}`, conversations: [], submissions: [{
    ...sampleStudents[0].submissions[0], id: `analysis-example-${index}`, challengeId: '이데아론 예시',
    score: { judgment: index === 0 ? 1 : 0, reasoning: index === 2 ? 0 : 2, concept: index === 0 ? 2 : 1, evidence: index === 0 ? 2 : 1, penalty: 0, total: score },
    calibration: [98, 72, 48][index], afterExplanation: index === 2 ? undefined : '직접 작성한 설명 예시입니다.',
    claimResults: [{ claimId: 'A', judgmentCorrect: index !== 2 }, { claimId: 'B', judgmentCorrect: index === 0 }],
  }],
}));
