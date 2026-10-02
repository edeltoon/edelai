// 서버 API 실제 호출. 실패는 오류로 돌려주고 mock으로 대체하지 않는다.
import type { ChatRequest, ChatResponse } from '@/types/chat';
import type {
  ApiError,
  AskTutorInput,
  AskTutorResult,
  GetChallengeResponse,
  SaveAfterExplanationResponse,
  SubmitChallengeRequest,
  SubmitChallengeResponse,
} from './ai.types';

const NETWORK_ERROR = '서버에 연결하지 못했어요. 네트워크를 확인하고 다시 보내 주세요.';

/** POST /api/chat (docs/API.md). 스트리밍이 아니라 완성된 답을 한 번에 받는다 */
export async function askTutorLive(input: AskTutorInput, signal?: AbortSignal): Promise<AskTutorResult> {
  const body: ChatRequest = { courseId: input.courseId, message: input.message, history: input.history };
  let response: Response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    return { ok: false, status: null, code: 'NETWORK_ERROR', message: NETWORK_ERROR };
  }
  let data: ChatResponse;
  try {
    data = (await response.json()) as ChatResponse;
  } catch {
    return { ok: false, status: response.status, code: 'INVALID_RESPONSE', message: 'AI 응답을 읽지 못했어요. 다시 보내 주세요.' };
  }
  if (data.ok) return { ok: true, reply: data.reply, model: data.model };
  return { ok: false, status: response.status, code: data.error.code, message: data.error.message };
}

/* ── 아래는 계약 초안(ai.types.ts) 경로. 서버 API 담당이 구현하면 바로 동작한다 ── */

async function requestJson<T extends { ok: boolean }>(url: string, init?: RequestInit): Promise<T | ApiError> {
  try {
    const response = await fetch(url, init);
    return (await response.json()) as T | ApiError;
  } catch {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: NETWORK_ERROR } };
  }
}

export function getChallengeLive(challengeId: string, studentId: string): Promise<GetChallengeResponse> {
  return requestJson<GetChallengeResponse>(
    `/api/challenges/${encodeURIComponent(challengeId)}?studentId=${encodeURIComponent(studentId)}`,
    { cache: 'no-store' },
  );
}

export function submitChallengeLive(challengeId: string, req: SubmitChallengeRequest): Promise<SubmitChallengeResponse> {
  return requestJson<SubmitChallengeResponse>(`/api/challenges/${encodeURIComponent(challengeId)}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

export function saveAfterExplanationLive(submissionId: string, afterExplanation: string): Promise<SaveAfterExplanationResponse> {
  return requestJson<SaveAfterExplanationResponse>(`/api/submissions/${encodeURIComponent(submissionId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ afterExplanation }),
  });
}
