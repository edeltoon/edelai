// 자유 학습 AI 요청·응답 타입. POST /api/chat (docs/API.md, src/types/chat.ts) 형식을 그대로 쓴다.
// 검증 챌린지 조회·제출·채점 계약은 store.types.ts의 "서버 API 계약"에 있다.
import type { ChatMessage } from '@/types/chat';

export type {
  ApiError,
  ChallengeClaimPublic,
  ChallengePublic,
  EvidenceOption,
  GetChallengeResponse,
  SaveAfterExplanationRequest,
  SaveAfterExplanationResponse,
  SubmitChallengeRequest,
  SubmitChallengeResponse,
} from './store.types';

export interface AskTutorInput {
  courseId: 'phil';
  /** 이번 질문 (1~4,000자) */
  message: string;
  /** 이전 대화. user/model 순서의 완료된 쌍, 최근 5쌍까지 (ai.ts가 잘라서 보낸다) */
  history: ChatMessage[];
}

export type AskTutorResult =
  | { ok: true; reply: string; model: string }
  | { ok: false; status: number | null; code: string; message: string };
