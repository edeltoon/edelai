import 'server-only';
import { DbError } from '@/lib/db/client';
import { ProfessorInputError } from './professor-validation';
export function json(data: unknown, status=200) { return Response.json(data,{status,headers:{'Cache-Control':'no-store'}}); }
export function gate(request: Request) {
  const url=new URL(request.url);
  // 로그인 PR 통합 전에는 명시적으로 켠 로컬 서버에서만 허용한다.
  if (process.env.PROFESSOR_DB_ENABLED!=='true' || !['localhost','127.0.0.1','[::1]'].includes(url.hostname)) return json({ok:false,error:{message:'교수 DB 기능은 로컬 서버에서 PROFESSOR_DB_ENABLED=true 설정 후 사용할 수 있습니다.'}},403);
  if (request.method!=='GET' && request.headers.get('origin')!==url.origin) return json({ok:false,error:{message:'요청 출처를 확인해 주세요.'}},403);
}
export async function body(request:Request):Promise<unknown> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ProfessorInputError('JSON 요청이 필요합니다.');
  const reader=request.body?.getReader(); if (!reader) throw new ProfessorInputError('입력이 없습니다.');
  let raw='',size=0; const decoder=new TextDecoder();
  try { while(true) {const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>100000){await reader.cancel();throw new ProfessorInputError('요청이 너무 큽니다.');}raw+=decoder.decode(value,{stream:true});}return JSON.parse(raw+decoder.decode()); }
  catch(e){if(e instanceof ProfessorInputError)throw e;throw new ProfessorInputError('입력 형식을 확인해 주세요.');}finally{reader.releaseLock();}
}
export function failure(e:unknown) {
  const message=e instanceof ProfessorInputError || e instanceof DbError ? e.message : '서버 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  const status=e instanceof ProfessorInputError?400:e instanceof DbError && e.code==='CONFLICT'?409:e instanceof DbError && e.code==='NOT_FOUND'?404:503;
  return json({ok:false,error:{message}},status);
}
