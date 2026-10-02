export async function professorApi<T>(path:string, method='GET', body?:unknown):Promise<T> {
 const response=await fetch('/api/professor/'+path,{method,cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
 const result=await response.json();
 if(!response.ok||!result.ok)throw new Error(result.error?.message||'요청을 완료하지 못했습니다.');
 return result as T;
}
