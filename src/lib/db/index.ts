// 서버 전용 DB 계층 (Supabase). API 라우트(src/app/api/**)에서만 import한다.
// 클라이언트 컴포넌트에서 import하면 'server-only' 때문에 빌드가 실패한다.
// 테이블 구조·환경 변수·역할 분담: docs/DATABASE.md
//
// 라우트에서 오류 처리 예:
//   import { DbError, listErrorCards } from '@/lib/db';
//   try { return Response.json({ ok: true, cards: await listErrorCards({ courseId: 'phil' }) }); }
//   catch (e) {
//     if (e instanceof DbError) return Response.json({ ok: false, error: { code: e.code, message: e.message } }, { status: 500 });
//     throw e;
//   }
export { DbError, isDbConfigured } from './client';
export * from './errorCards';
export * from './challenges';
export * from './submissions';
export * from './students';
export { checkDbConnection } from './health';
export type * from './types';
