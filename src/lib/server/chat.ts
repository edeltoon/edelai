import "server-only";
import type { ChatMessage, ChatResponse } from "../../types/chat.ts";

const MAX_BODY_BYTES = 32_768;
const MAX_TEXT = 4_000;
const SYSTEM_INSTRUCTION = `당신은 대학 서양철학 학습을 돕는 튜터입니다.
한국어로 정확하고 이해하기 쉽게 설명하고 학생의 사고를 돕는 질문을 덧붙이세요.
일반 학습 대화이므로 의도적인 오류를 넣지 마세요.
현재 강의자료는 제공되지 않았습니다. 일반 지식과 강의자료 근거를 구분하고,
강의자료를 읽었다고 주장하거나 존재하지 않는 페이지·인용을 만들지 마세요.
오류 검증 챌린지의 비공개 정답, 채점, 교수 승인 상태는 이 대화에서 제공하지 않습니다.
학생이 정답 번호만 요구하면 자신의 판단과 근거를 먼저 생각하도록 안내하세요.`;

type Dependencies = {
  fetcher?: typeof fetch;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
};

function json(body: ChatResponse, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function fail(status: number, code: string, message: string) {
  return json({ ok: false, error: { code, message } }, status);
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_TEXT;
}

async function readBody(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let result = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      result += decoder.decode(value, { stream: true });
    }
    return result + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function handleChat(request: Request, dependencies: Dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const fetcher = dependencies.fetcher ?? fetch;
  // Authentication and per-user quotas are not implemented yet. Keep deployment closed.
  if (env.NODE_ENV === "production" && env.AI_CHAT_ENABLED !== "true") {
    return fail(503, "CHAT_DISABLED", "현재 환경에서는 AI 대화가 활성화되지 않았어요.");
  }
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return fail(415, "INVALID_CONTENT_TYPE", "JSON 형식으로 질문을 보내 주세요.");
  }

  let input: unknown;
  try {
    const body = await readBody(request);
    if (body === null) return fail(413, "REQUEST_TOO_LARGE", "대화가 너무 길어요. 새 대화를 시작해 주세요.");
    input = JSON.parse(body);
  } catch {
    return fail(400, "INVALID_JSON", "요청 형식을 확인해 주세요.");
  }
  if (!object(input) || !validText(input.message) || input.courseId !== "phil") {
    return fail(400, "INVALID_INPUT", "서양철학 과목과 1~4,000자의 질문을 보내 주세요.");
  }
  const history = input.history ?? [];
  if (!Array.isArray(history) || history.length > 10 || history.length % 2 !== 0 ||
    !history.every((item, index) => object(item) &&
      item.role === (index % 2 === 0 ? "user" : "model") && validText(item.text))) {
    return fail(400, "INVALID_HISTORY", "이전 대화는 질문·답변 순서로 최대 5쌍까지 보낼 수 있어요.");
  }

  const key = env.ANTHROPIC_API_KEY?.trim();
  const model = env.ANTHROPIC_MODEL?.trim();
  const workspace = env.ANTHROPIC_WORKSPACE_ID?.trim();
  if (!key || !model || !/^claude-[a-zA-Z0-9._-]+$/.test(model)) {
    return fail(503, "AI_NOT_CONFIGURED", "서버의 Claude API 키와 모델 설정이 필요해요.");
  }
  const signal = AbortSignal.timeout(dependencies.timeoutMs ?? 30_000);
  try {
    const response = await fetcher(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        cache: "no-store",
        signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          ...(workspace ? { "anthropic-workspace-id": workspace } : {}),
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system: SYSTEM_INSTRUCTION,
          messages: [
            ...(history as ChatMessage[]).map(({ role, text }) => ({
              role: role === "model" ? "assistant" : "user", content: text,
            })),
            { role: "user", content: input.message.trim() },
          ],
        }),
      },
    );
    if (response.status === 429) return fail(429, "AI_RATE_LIMITED", "AI 사용량 한도에 도달했어요. 잠시 후 다시 시도해 주세요.");
    if (!response.ok) return fail(502, "AI_UPSTREAM_ERROR", "AI 연결에 실패했어요. 서버의 키·모델·이용 권한을 확인해 주세요.");

    const data: unknown = await response.json();
    if (!object(data)) throw new Error("Invalid response");
    if (data.stop_reason === "refusal") {
      return fail(422, "AI_BLOCKED", "이 질문에는 답변을 제공할 수 없어요. 질문을 바꿔 주세요.");
    }
    if (data.stop_reason !== "end_turn") {
      return fail(502, "AI_INCOMPLETE_RESPONSE", "AI 답변이 완료되지 않았어요. 질문을 짧게 바꿔 다시 시도해 주세요.");
    }
    const parts = Array.isArray(data.content) ? data.content : [];
    const reply = parts.filter((part) => object(part) && part.type === "text" && typeof part.text === "string")
      .map((part) => part.text).join("").trim();
    if (!reply) return fail(502, "AI_EMPTY_RESPONSE", "AI 답변이 비어 있어요. 다시 시도해 주세요.");
    return json({ ok: true, reply, source: "claude", model });
  } catch {
    // Do not return or log upstream bodies, prompts, credentials, or raw exceptions.
    return signal.aborted
      ? fail(504, "AI_TIMEOUT", "AI 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.")
      : fail(502, "AI_CONNECTION_ERROR", "AI 연결에 실패했어요. 잠시 후 다시 시도해 주세요.");
  }
}
