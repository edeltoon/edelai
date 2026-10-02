import {getErrorCard} from '@/lib/db/errorCards';
import {DbError} from '@/lib/db/client';
import {editProfessorCard} from '@/lib/db/professor';
import {body,failure,gate,json} from '@/lib/server/professor-http';
import {object,ProfessorInputError,textField,version} from '@/lib/server/professor-validation';
import type {ErrorCardRow} from '@/lib/db/types';
export async function PATCH(request:Request,ctx:{params:Promise<{id:string}>}) {
 const denied=gate(request);if(denied)return denied;
 try{
 const {id}=await ctx.params;const input=await body(request);
 if(!object(input))throw new ProfessorInputError('입력이 올바르지 않습니다.');
 const current=await getErrorCard(id);if(!current||current.courseId!=='phil')throw new DbError('NOT_FOUND','카드를 찾을 수 없습니다.');
 const updatedAt=version(input.updatedAt);let patch:Partial<ErrorCardRow>;
 switch(input.action){
 case 'approve': if(input.reviewed!==true)throw new ProfessorInputError('근거 검토를 확인해 주세요.');patch={approval_status:'approved',approved_by:'p1',approved_at:new Date().toISOString(),rejection_reason:null};break;
 case 'reject':patch={approval_status:'rejected',approved_by:'p1',approved_at:null,rejection_reason:textField(input.reason,1000,'반려 사유')};break;
 case 'reset':patch={approval_status:'pending',approved_by:null,approved_at:null,rejection_reason:null};break;
 case 'edit':patch={wrong_claim:textField(input.wrongClaim,2000,'오류 주장'),correct_claim:textField(input.correctClaim,2000,'정답 설명'),evidence:textField(input.evidence,2000,'근거'),approval_status:'pending',approved_by:null,approved_at:null,rejection_reason:null};break;
 default:throw new ProfessorInputError('지원하지 않는 동작입니다.');
 }
 return json({ok:true,card:await editProfessorCard(id,updatedAt,patch)});
 }catch(e){return failure(e);}
}
