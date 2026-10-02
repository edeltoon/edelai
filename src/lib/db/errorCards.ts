import 'server-only';
import type { ReviewCard } from '@/types/professor-cards';
import { DbError, dbFail, getDb } from './client';
import { fromReviewCard, toErrorCard } from './mappers';
import type { ErrorCardRecord, ErrorCardRow } from './types';

// 오류 카드 (교수 담당 API가 주로 사용).
// 사용 예 (교수 API 라우트, 서버에서만):
//   import { listErrorCards, saveErrorCards, approveErrorCard } from '@/lib/db';
//   const pending = await listErrorCards({ courseId: 'phil', status: 'pending' });
//   await saveErrorCards(result.cards, 'phil');            // 카드 생성 API 결과 저장 (pending)
//   await approveErrorCard(cardId, session.userId);         // 승인
//   await rejectErrorCard(cardId, session.userId, '근거 부족'); // 반려
// 실패하면 DbError를 던진다. 라우트에서 { ok:false, error:{ code, message } }로 바꿔 응답한다.

export async function listErrorCards(filter: {
  courseId: string;
  status?: ErrorCardRecord['approvalStatus'];
}): Promise<ErrorCardRecord[]> {
  let query = getDb().from('error_cards').select('*').eq('course_id', filter.courseId);
  if (filter.status) query = query.eq('approval_status', filter.status);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) dbFail('오류 카드 목록 조회', error);
  return (data as ErrorCardRow[]).map(toErrorCard);
}

export async function getErrorCard(id: string): Promise<ErrorCardRecord | null> {
  const { data, error } = await getDb().from('error_cards').select('*').eq('id', id).maybeSingle();
  if (error) dbFail('오류 카드 조회', error);
  return data ? toErrorCard(data as ErrorCardRow) : null;
}

/** 카드 저장(같은 id면 덮어씀). 승인 상태도 카드 값 그대로 저장한다 */
export async function saveErrorCards(cards: ReviewCard[], courseId: string): Promise<ErrorCardRecord[]> {
  if (cards.length === 0) return [];
  const rows = cards.map((c) => fromReviewCard(c, courseId));
  const { data, error } = await getDb().from('error_cards').upsert(rows, { onConflict: 'id' }).select('*');
  if (error) dbFail('오류 카드 저장', error);
  return (data as ErrorCardRow[]).map(toErrorCard);
}

async function setStatus(
  id: string,
  patch: Partial<Pick<ErrorCardRow, 'approval_status' | 'approved_by' | 'approved_at' | 'rejection_reason'>>,
  action: string,
): Promise<ErrorCardRecord> {
  const { data, error } = await getDb().from('error_cards').update(patch).eq('id', id).select('*').maybeSingle();
  if (error) dbFail(action, error);
  if (!data) throw new DbError('CARD_NOT_FOUND', '오류 카드를 찾을 수 없어요.');
  return toErrorCard(data as ErrorCardRow);
}

/** 승인: 승인된 카드만 학생 챌린지에 출제·채점된다 */
export function approveErrorCard(id: string, approvedBy: string): Promise<ErrorCardRecord> {
  return setStatus(
    id,
    { approval_status: 'approved', approved_by: approvedBy, approved_at: new Date().toISOString(), rejection_reason: null },
    '오류 카드 승인',
  );
}

export function rejectErrorCard(id: string, rejectedBy: string, reason: string): Promise<ErrorCardRecord> {
  return setStatus(
    id,
    { approval_status: 'rejected', approved_by: rejectedBy, approved_at: null, rejection_reason: reason },
    '오류 카드 반려',
  );
}

/** 승인 대기로 되돌리기 (수정 후 재검토) */
export function resetErrorCardToPending(id: string): Promise<ErrorCardRecord> {
  return setStatus(
    id,
    { approval_status: 'pending', approved_by: null, approved_at: null, rejection_reason: null },
    '오류 카드 상태 변경',
  );
}
