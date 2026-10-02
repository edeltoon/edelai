import {listErrorCards} from '@/lib/db/errorCards';
import {insertProfessorCards} from '@/lib/db/professor';
import {body,failure,gate,json} from '@/lib/server/professor-http';
import {newCards} from '@/lib/server/professor-validation';
export async function GET(request:Request){const denied=gate(request);if(denied)return denied;try{return json({ok:true,cards:await listErrorCards({courseId:'phil'})});}catch(e){return failure(e);}}
export async function POST(request:Request){const denied=gate(request);if(denied)return denied;try{return json({ok:true,cards:await insertProfessorCards(newCards(await body(request)))});}catch(e){return failure(e);}}
