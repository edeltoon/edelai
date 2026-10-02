import 'server-only';
import { getDb, isDbConfigured } from './client';

/**
 * DB 연결 확인: 설정이 있고, challenges 테이블을 읽을 수 있으면 true.
 * 실패 원인(키, 테이블 없음 등)은 밖으로 내보내지 않는다.
 */
export async function checkDbConnection(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    const { error } = await getDb().from('challenges').select('id', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
}
