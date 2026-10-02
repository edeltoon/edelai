// 학생 서버 API(/api/student/*) 호출. 계약은 store.types.ts "서버 API 계약".
// server 모드(NEXT_PUBLIC_STORE_MODE=server)에서만 쓰인다. 실패는 ApiError로 돌려주고 local로 대체하지 않는다.
import type {
  ApiError,
  DemoResetRequest,
  DemoResetResponse,
  GetChallengeResponse,
  GetStudentRecordsResponse,
  RecordDirectAnswerAttemptRequest,
  RecordDirectAnswerAttemptResponse,
  SaveAfterExplanationRequest,
  SaveAfterExplanationResponse,
  SaveRetrievalRequest,
  SaveRetrievalResponse,
  SubmitChallengeRequest,
  SubmitChallengeResponse,
} from './store.types';
import { studentApi } from './store.types';

const NETWORK_ERROR = '서버에 연결하지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.';

function isApiResponse(value: unknown): value is { ok: boolean } {
  return typeof value === 'object' && value !== null && typeof (value as { ok?: unknown }).ok === 'boolean';
}

async function requestJson<T extends { ok: boolean }>(url: string, init?: RequestInit): Promise<T | ApiError> {
  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store', ...init });
  } catch {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: NETWORK_ERROR } };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (isApiResponse(body)) return body as T | ApiError;
  // JSON이 아니면(아직 없는 라우트의 404 페이지 등) 경로와 상태를 그대로 알린다
  const path = url.split('?')[0];
  return {
    ok: false,
    error: {
      code: response.status === 404 ? 'API_NOT_AVAILABLE' : 'INVALID_RESPONSE',
      message:
        response.status === 404
          ? `서버 API(${path})가 아직 준비되지 않았어요.`
          : `서버 응답을 읽지 못했어요 (HTTP ${response.status}).`,
    },
  };
}

const json = (method: 'POST' | 'PATCH', body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export function getChallengeFromServer(challengeId: string, userId: string) {
  return requestJson<GetChallengeResponse>(`${studentApi.challenge(challengeId)}?userId=${encodeURIComponent(userId)}`);
}

export function submitChallengeToServer(challengeId: string, req: SubmitChallengeRequest) {
  return requestJson<SubmitChallengeResponse>(studentApi.submissions(challengeId), json('POST', req));
}

export function saveAfterExplanationToServer(submissionId: string, req: SaveAfterExplanationRequest) {
  return requestJson<SaveAfterExplanationResponse>(studentApi.submission(submissionId), json('PATCH', req));
}

export function getStudentRecordsFromServer(userId: string) {
  return requestJson<GetStudentRecordsResponse>(`${studentApi.records()}?userId=${encodeURIComponent(userId)}`);
}

export function recordDirectAnswerAttemptToServer(req: RecordDirectAnswerAttemptRequest) {
  return requestJson<RecordDirectAnswerAttemptResponse>(studentApi.directAnswerAttempts(), json('POST', req));
}

export function saveRetrievalToServer(req: SaveRetrievalRequest) {
  return requestJson<SaveRetrievalResponse>(studentApi.retrievals(), json('POST', req));
}

export function demoResetOnServer(req: DemoResetRequest) {
  return requestJson<DemoResetResponse>(studentApi.demoReset(), json('POST', req));
}
