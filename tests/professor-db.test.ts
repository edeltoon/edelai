import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newCards,reviewInput,version} from '../src/lib/server/professor-validation.ts';
const original={judgment:1,reasoning:null,concept:null,evidence:2,penalty:0,total:3};
const input={action:'finalize',reviewed:true,updatedAt:'2026-10-03T00:00:00.123456+00:00',score:{judgment:1,reasoning:2,concept:1,evidence:2,penalty:0,total:999},reason:'원문에서 개념을 일부 보완',feedback:'근거를 연결했어요.'};
test('평가 합계는 서버 계산, 변경 사유 필수, 미채점 확정 차단',()=>{
 const parsed=reviewInput(input,original);assert.equal(parsed.score.total,6);assert.match(parsed.comment,/원문/);
 for(const modified of [{...input,reason:''},{...input,reviewed:false},{...input,score:{...input.score,reasoning:null}},{...input,score:{...input.score,judgment:2}},{...input,score:{...input.score,penalty:-1}},{...input,action:'delete'}])assert.throws(()=>reviewInput(modified,original));
 assert.throws(()=>version(''));assert.equal(version(input.updatedAt),input.updatedAt);
});
test('새 카드에서 클라이언트 승인 권한 제거, 입력 제한',()=>{
 const card={id:'generated-1',conceptId:'idea',title:'예시',wrongClaim:'오류',correctClaim:'정답',evidence:'근거',correctKeywords:['이데아'],errorType:'개념 반전',difficulty:'중',approvalStatus:'approved',approvedBy:'fake'};
 const result=newCards({cards:[card]})[0];assert.equal(result.approvalStatus,'pending');assert.equal(result.approvedBy,undefined);
 assert.throws(()=>newCards({cards:Array(6).fill(card)}));assert.throws(()=>newCards({cards:[{...card,wrongClaim:''}]}));
});
