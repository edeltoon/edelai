import 'server-only';
import type { ChallengePublic } from '@/types/challenge';
import { dbFail, getDb } from './client';
import { toChallengePublic, toErrorCard } from './mappers';
import type { ChallengeAnswerKey, ChallengeKeyRow, ChallengeRow, ErrorCardRecord, ErrorCardRow } from './types';

// 챌린지. 학생 공개 정보(challenges)와 서버 전용 정답(challenge_keys)을 나눠 읽는다.
// - 학생 API 응답에는 getPublicChallenge 결과만 쓴다. 정답·오류 카드는 절대 내보내지 않는다.
// - 교수 승인 확인: 정답 키가 가리키는 오류 카드가 전부 approved일 때만 공개·채점한다.

async function loadKey(challengeId: string): Promise<ChallengeAnswerKey | null> {
  const { data, error } = await getDb()
    .from('challenge_keys')
    .select('challenge_id, answer_key')
    .eq('challenge_id', challengeId)
    .maybeSingle();
  if (error) dbFail('챌린지 채점 기준 조회', error);
  return data ? (data as ChallengeKeyRow).answer_key : null;
}

async function loadErrorCards(ids: string[]): Promise<ErrorCardRecord[]> {
  if (ids.length === 0) return [];
  const { data, error } = await getDb().from('error_cards').select('*').in('id', ids);
  if (error) dbFail('챌린지 오류 카드 조회', error);
  return (data as ErrorCardRow[]).map(toErrorCard);
}

function errorCardIds(key: ChallengeAnswerKey): string[] {
  return key.claims.flatMap((c) => (c.isError && c.errorCardId ? [c.errorCardId] : []));
}

/** 정답 키의 오류 카드가 모두 존재하고 승인됐는지 */
function allApproved(key: ChallengeAnswerKey, cards: ErrorCardRecord[]): boolean {
  const ids = errorCardIds(key);
  return ids.length > 0 && ids.every((id) => cards.find((c) => c.id === id)?.approvalStatus === 'approved');
}

export type PublicChallengeResult =
  | { status: 'ok'; challenge: ChallengePublic }
  | { status: 'not_found' }
  | { status: 'not_approved' };

/**
 * 학생에게 보낼 챌린지 (공개 정보만).
 * 사용 예 (학생 API): const r = await getPublicChallenge('ch1');
 *   if (r.status === 'not_found') → 404, 'not_approved' → 409, 'ok' → { ok:true, challenge: r.challenge }
 */
export async function getPublicChallenge(challengeId: string): Promise<PublicChallengeResult> {
  const { data, error } = await getDb().from('challenges').select('*').eq('id', challengeId).maybeSingle();
  if (error) dbFail('챌린지 조회', error);
  if (!data) return { status: 'not_found' };
  const key = await loadKey(challengeId);
  if (!key) return { status: 'not_approved' };
  const cards = await loadErrorCards(errorCardIds(key));
  if (!allApproved(key, cards)) return { status: 'not_approved' };
  return { status: 'ok', challenge: toChallengePublic(data as ChallengeRow) };
}

/** 과목의 챌린지 공개 목록 (승인 여부는 getPublicChallenge로 하나씩 확인) */
export async function listChallenges(courseId: string): Promise<ChallengePublic[]> {
  const { data, error } = await getDb()
    .from('challenges')
    .select('*')
    .eq('course_id', courseId)
    .order('id');
  if (error) dbFail('챌린지 목록 조회', error);
  return (data as ChallengeRow[]).map(toChallengePublic);
}

export type GradingChallengeResult =
  | { status: 'ok'; challenge: ChallengePublic; key: ChallengeAnswerKey; errorCards: ErrorCardRecord[] }
  | { status: 'not_found' }
  | { status: 'not_approved' };

/**
 * 채점용 전체 정보 (서버 채점 전용). 공개 정보 + 정답 키 + 오류 카드.
 * 승인되지 않은 카드가 섞여 있으면 'not_approved' (학생 API는 409).
 */
export async function getChallengeForGrading(challengeId: string): Promise<GradingChallengeResult> {
  const result = await getPublicChallenge(challengeId);
  if (result.status !== 'ok') return result;
  const key = await loadKey(challengeId);
  if (!key) return { status: 'not_approved' };
  const errorCards = await loadErrorCards(errorCardIds(key));
  return { status: 'ok', challenge: result.challenge, key, errorCards };
}
