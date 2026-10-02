import 'server-only';
import { DbError, dbFail, getDb } from './client';
import { fromReviewCard, toErrorCard, toSubmission } from './mappers';
import type { ReviewCard } from '@/types/professor-cards';
import type { ErrorCardRow, SubmissionRow, ChallengeKeyRow } from './types';
import type { ScoreBreakdown } from '@/types/student-records';

/** 새 카드만 추가. 중복 ID는 덮어쓰지 않고 저장 재시도 시 기존 카드를 반환. */
export async function insertProfessorCards(cards: ReviewCard[]) {
  const {data,error}=await getDb().from('error_cards').upsert(cards.map(c=>({...fromReviewCard(c,'phil'),approved_at:null})),{onConflict:'id',ignoreDuplicates:true}).select('*');
  if(error)dbFail('카드 저장',error);
  if(data.length===cards.length)return (data as ErrorCardRow[]).map(toErrorCard);
  const existing=await getDb().from('error_cards').select('*').eq('course_id','phil').in('id',cards.map(c=>c.id));
  if(existing.error)dbFail('저장 결과 확인',existing.error);
  return (existing.data as ErrorCardRow[]).map(toErrorCard);
}
export async function editProfessorCard(id:string, updatedAt:string, patch: Partial<ErrorCardRow>) {
  if(patch.wrong_claim!==undefined) {
    const {data,error}=await getDb().from('challenge_keys').select('*');
    if(error)dbFail('챌린지 연결 확인',error);
    if((data as ChallengeKeyRow[]).some(row=>row.answer_key.claims.some(c=>c.errorCardId===id))) throw new DbError('CONFLICT','챌린지에 연결된 카드 내용은 잠겨 있습니다. 승인·반려는 가능하며 내용 수정은 학생 출제·채점 기준과 함께 변경해야 합니다.');
  }
  const {data,error}=await getDb().from('error_cards').update(patch).eq('id',id).eq('course_id','phil').eq('updated_at',updatedAt).select('*').maybeSingle();
  if(error)dbFail('카드 변경',error);
  if(!data)throw new DbError('CONFLICT','다른 화면에서 카드가 변경되었습니다. 목록을 새로 읽어 주세요.');
  return toErrorCard(data as ErrorCardRow);
}
/** 점수·피드백·확정을 한 번의 UPDATE로 저장. 확정 후 수정 및 오래된 화면의 덮어쓰기를 차단. */
export async function writeProfessorReview(id:string, updatedAt:string, score:ScoreBreakdown, comment:string, finalize:boolean) {
  const {data,error}=await getDb().from('submissions').update({professor_score:score,professor_comment:comment,total:score.total,pending_review:[],...(finalize?{finalized_by:'p1',finalized_at:new Date().toISOString()}:{})}).eq('id',id).eq('course_id','phil').eq('updated_at',updatedAt).is('finalized_at',null).select('*').maybeSingle();
  if(error)dbFail('교수 평가 저장',error);
  if(!data)throw new DbError('CONFLICT','이미 확정되었거나 다른 화면에서 변경된 기록입니다. 기록을 새로 읽어 주세요.');
  return toSubmission(data as SubmissionRow);
}
