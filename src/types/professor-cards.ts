import type { ErrorCard } from './content';

/** 교수 검토 전용. 정답이 포함되므로 학생 응답으로 사용하지 않는다. */
export type ReviewCard = ErrorCard & {
  title: string;
  evidence: string;
  rejectionReason?: string;
  source?: 'claude';
  sourceTitle?: string;
  sourceExcerpt?: string;
};

export type GenerateCardsResponse =
  | { ok: true; cards: ReviewCard[]; source: 'claude'; model: string }
  | { ok: false; error: { code: string; message: string } };
