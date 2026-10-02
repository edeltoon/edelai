// 학생 화면의 유일한 AI·서버 API 진입점. 컴포넌트는 fetch를 직접 쓰지 않고 이 파일만 부른다.
//
// - 자유 학습: 항상 실제 POST /api/chat (mock 없음, 실패는 오류로 표시)
// - 검증 챌린지: NEXT_PUBLIC_CHALLENGE_API=mock|live (기본 mock)
//     mock: services/ai.mock.ts (시연용 예시 채점, grader 'mock')
//     live: ai.types.ts 계약 경로 (/api/challenges/..., /api/submissions/...)
import { detectDirectAnswer, type DirectAnswerMatch } from '@/lib/directAnswer';
import type { ChatMessage } from '@/types/chat';
import type { ChallengeSubmission, ConversationMessage } from '@/types/student-records';
import { askTutorLive, getChallengeLive, saveAfterExplanationLive, submitChallengeLive } from './ai.live';
import type {
  AskTutorResult,
  GetChallengeResponse,
  SaveAfterExplanationResponse,
  SubmitChallengeRequest,
  SubmitChallengeResponse,
} from './ai.types';

export type ChallengeApiMode = 'mock' | 'live';
export const CHALLENGE_API_MODE: ChallengeApiMode =
  process.env.NEXT_PUBLIC_CHALLENGE_API === 'live' ? 'live' : 'mock';
/** 화면에 "시연용 예시 채점" 표시가 필요한지 */
export const IS_MOCK_GRADING = CHALLENGE_API_MODE === 'mock';

/* ───────────── 자유 학습 ───────────── */

/** /api/chat 제한 (docs/API.md) */
const MAX_TEXT = 4000;
const MAX_PAIRS = 5;
const MAX_BODY_BYTES = 30_000; // 서버 한도 32 KiB보다 여유 있게

/**
 * 저장된 대화에서 /api/chat history를 만든다.
 * user 바로 다음에 ai 답이 있는 "완료된 쌍"만, 최근 5쌍까지. 안내(notice)·실패 메시지는 뺀다.
 * 본문이 32 KiB에 가까우면 오래된 쌍부터 버린다.
 */
export function buildChatHistory(messages: readonly ConversationMessage[], nextMessage: string): ChatMessage[] {
  const pairs: [ChatMessage, ChatMessage][] = [];
  for (let i = 0; i < messages.length - 1; i += 1) {
    const q = messages[i];
    const a = messages[i + 1];
    if (q.role === 'user' && a.role === 'ai' && q.text.trim() && a.text.trim()) {
      if (q.text.length <= MAX_TEXT && a.text.length <= MAX_TEXT) {
        pairs.push([
          { role: 'user', text: q.text },
          { role: 'model', text: a.text },
        ]);
      }
      i += 1;
    }
  }
  let recent = pairs.slice(-MAX_PAIRS);
  const size = (h: [ChatMessage, ChatMessage][]) =>
    new TextEncoder().encode(JSON.stringify({ courseId: 'phil', message: nextMessage, history: h.flat() })).length;
  while (recent.length > 0 && size(recent) > MAX_BODY_BYTES) recent = recent.slice(1);
  return recent.flat();
}

/**
 * 과목 AI에게 질문. 스트리밍이 아니므로 화면은 "생성 중"을 보여 주다가 결과를 한 번에 표시한다.
 * 호출 전에 checkDirectAnswer로 정답 직행 요청을 먼저 걸러야 한다.
 */
export function askTutor(
  params: { courseId: 'phil'; message: string; previous: readonly ConversationMessage[] },
  signal?: AbortSignal,
): Promise<AskTutorResult> {
  const message = params.message.trim();
  if (!message) {
    return Promise.resolve({ ok: false, status: null, code: 'EMPTY_MESSAGE', message: '질문을 입력해 주세요.' });
  }
  if (message.length > MAX_TEXT) {
    return Promise.resolve({
      ok: false,
      status: null,
      code: 'MESSAGE_TOO_LONG',
      message: `질문은 ${MAX_TEXT.toLocaleString()}자까지 보낼 수 있어요.`,
    });
  }
  return askTutorLive(
    { courseId: params.courseId, message, history: buildChatHistory(params.previous, message) },
    signal,
  );
}

/** 정답 직행 요청인지 (서비스 안의 입력만 본다). 걸리면 /api/chat을 부르지 않고 안내를 보여 준다 */
export function checkDirectAnswer(text: string): DirectAnswerMatch {
  return detectDirectAnswer(text);
}

/* ───────────── 검증 챌린지 ───────────── */

export async function getChallenge(challengeId: string, studentId: string): Promise<GetChallengeResponse> {
  if (CHALLENGE_API_MODE === 'live') return getChallengeLive(challengeId, studentId);
  const { getChallengeMock } = await import('./ai.mock');
  return getChallengeMock(challengeId);
}

export async function submitChallenge(challengeId: string, req: SubmitChallengeRequest): Promise<SubmitChallengeResponse> {
  if (CHALLENGE_API_MODE === 'live') return submitChallengeLive(challengeId, req);
  const { submitChallengeMock } = await import('./ai.mock');
  return submitChallengeMock(challengeId, req);
}

/** 해설 후 내 설명 저장. mock 모드는 서버가 없으므로 받은 제출 기록에 붙여 돌려준다 */
export async function saveAfterExplanation(
  submission: ChallengeSubmission,
  afterExplanation: string,
): Promise<SaveAfterExplanationResponse> {
  const text = afterExplanation.trim();
  if (!text || text.length > 1000) {
    return { ok: false, error: { code: 'INVALID_INPUT', message: '해설 후 내 설명을 1~1,000자로 적어 주세요.' } };
  }
  if (CHALLENGE_API_MODE === 'live') return saveAfterExplanationLive(submission.id, text);
  return { ok: true, submission: { ...submission, afterExplanation: text, afterExplainedAt: new Date().toISOString() } };
}
