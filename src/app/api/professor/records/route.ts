import {listStudents} from '@/lib/db/students';
import {listSubmissions} from '@/lib/db/submissions';
import {failure,gate,json} from '@/lib/server/professor-http';
export async function GET(request:Request){const denied=await gate(request);if(denied)return denied;try{
 const [students,submissions]=await Promise.all([listStudents(),listSubmissions({courseId:'phil'})]);
 return json({ok:true,snapshot:{students:students.map(s=>({id:s.id,name:s.name,memberNo:s.memberNo,conversations:[],submissions:submissions.filter(r=>r.studentId===s.id).map(r=>({id:r.id,challengeId:r.challengeId,submittedAt:r.submittedAt,score:r.professorScore??r.score,originalScore:r.score,professorComment:r.professorComment,finalizedAt:r.finalizedAt,updatedAt:r.updatedAt,calibration:r.calibration,answers:r.answers,beforeSummary:r.beforeSummary,afterExplanation:r.afterExplanation,claimResults:r.claimGrades.map(c=>({claimId:c.claimId,judgmentCorrect:c.judgmentCorrect})),grader:r.grader}))})),warnings:[]}});
 }catch(e){return failure(e);}}
