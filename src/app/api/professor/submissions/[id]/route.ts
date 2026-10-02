import {getSubmission} from '@/lib/db/submissions';
import {writeProfessorReview} from '@/lib/db/professor';
import {DbError} from '@/lib/db/client';
import {body,failure,gate,json} from '@/lib/server/professor-http';
import {reviewInput} from '@/lib/server/professor-validation';
export async function PATCH(request:Request,ctx:{params:Promise<{id:string}>}){const denied=gate(request);if(denied)return denied;try{
 const {id}=await ctx.params;const current=await getSubmission(id);
 if(!current||current.courseId!=='phil')throw new DbError('NOT_FOUND','제출 기록을 찾을 수 없습니다.');
 if(current.finalizedAt)throw new DbError('CONFLICT','이미 확정된 평가입니다.');
 const input=reviewInput(await body(request),current.score);
 return json({ok:true,submission:await writeProfessorReview(id,input.updatedAt,input.score,input.comment,input.action==='finalize')});
 }catch(e){return failure(e);}}
