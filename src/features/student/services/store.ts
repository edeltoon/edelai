// 학생 기록 저장소: 구현 선택만 담당한다. 화면은 이 파일의 studentStore(StudentStore 인터페이스)만 쓴다.
//
// NEXT_PUBLIC_STORE_MODE=local|server (기본 local)
//   local : store.local.ts  브라우저 localStorage + 학생 화면 mock 채점. 서버 없이 노트북 한 대로 시연 가능
//   server: store.server.ts 서버 API 담당의 /api/student/* (Supabase). 실패는 오류로 보여주고 local로 대체하지 않음
// 인터페이스·서버 API 계약: store.types.ts / 키·전환 방법: docs/STUDENT_RECORDS.md
import { localStudentStore } from './store.local';
import { serverStudentStore } from './store.server';
import type { StudentStore } from './store.types';

export type StoreMode = 'local' | 'server';

export const STORE_MODE: StoreMode = process.env.NEXT_PUBLIC_STORE_MODE === 'server' ? 'server' : 'local';

export const studentStore: StudentStore = STORE_MODE === 'server' ? serverStudentStore : localStudentStore;

export { StoreError, type ChallengeDraft, type DraftAnswer, type StudentStore } from './store.types';
export { STORE_CHANGE_EVENT, STORE_PREFIX, storeKeys } from './store.local';
