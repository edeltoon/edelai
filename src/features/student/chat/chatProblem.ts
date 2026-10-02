// 자유 학습 /api/chat 실패 → 화면 안내 (순수 함수). 실패는 목데이터로 대체하지 않고 이유와 다음 행동을 보여 준다.
// 오류 코드: src/lib/server/chat.ts, 로그인·출처 확인: src/proxy.ts

export type ChatProblemAction = 'retry' | 'login' | 'newChat' | 'challenge' | 'none';

export interface ChatProblem {
  title: string;
  body: string;
  action: ChatProblemAction;
}

/**
 * 예) (401, 'UNAUTHORIZED') → 로그인 만료, (503, 'CHAT_DISABLED') → AI 대화 꺼짐 + 검증 챌린지 안내,
 *     (504, 'AI_TIMEOUT') → 시간 초과 + 다시 보내기, (413, 'REQUEST_TOO_LARGE') → 새 대화 안내,
 *     (null, 'NETWORK_ERROR') → 다시 보내기
 */
export function chatProblemOf(status: number | null, code: string, message: string): ChatProblem {
  if (status === 401 || code === 'UNAUTHORIZED') {
    return { title: '로그인이 만료됐어요', body: '다시 로그인한 뒤 질문을 보내 주세요. 지금까지의 대화는 이 브라우저에 남아 있어요.', action: 'login' };
  }
  if (code === 'FORBIDDEN' || code === 'INVALID_ORIGIN') {
    return { title: '질문을 보낼 수 없어요', body: message, action: 'login' };
  }
  if (code === 'CHAT_DISABLED') {
    return {
      title: '지금은 과목 AI 대화가 꺼져 있어요',
      body: '이 환경에서는 AI 대화가 열려 있지 않아요. 검증 챌린지와 학습 기록은 그대로 이용할 수 있어요.',
      action: 'challenge',
    };
  }
  if (code === 'AI_NOT_CONFIGURED') {
    return { title: '과목 AI를 준비하고 있어요', body: message, action: 'challenge' };
  }
  if (status === 504 || code === 'AI_TIMEOUT') {
    return { title: 'AI 응답이 늦어지고 있어요', body: message, action: 'retry' };
  }
  if (status === 413 || code === 'REQUEST_TOO_LARGE' || code === 'INVALID_HISTORY') {
    return { title: '대화가 너무 길어요', body: '새 대화를 시작해 질문을 이어 가 주세요.', action: 'newChat' };
  }
  if (code === 'MESSAGE_TOO_LONG' || code === 'EMPTY_MESSAGE' || code === 'INVALID_INPUT' || code === 'AI_BLOCKED') {
    return { title: '질문을 바꿔 주세요', body: message, action: 'none' };
  }
  return { title: 'AI 답변을 받지 못했어요', body: message, action: 'retry' };
}

/** 대화 제목: 첫 질문 앞부분. 예) '플라톤의 이데아론과 현실 세계의 관계를 쉽게 설명해줘' → '플라톤의 이데아론과 현실 세계의 관…' */
export function conversationTitle(question: string, max = 20): string {
  const oneLine = question.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}
