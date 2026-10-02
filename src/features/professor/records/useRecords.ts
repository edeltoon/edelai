'use client';
import { useEffect, useState } from 'react';
import { loadRecords, type RecordsSnapshot } from './reader';

export function useRecords() {
  const [snapshot, setSnapshot] = useState<RecordsSnapshot>({ students: [], warnings: [] });
  const [loaded, setLoaded] = useState(false);
  function refresh() {
    try { setSnapshot(loadRecords(window.localStorage)); }
    catch { setSnapshot({ students: [], warnings: ['브라우저 저장소 접근이 차단되어 기록을 읽을 수 없습니다.'] }); }
    setLoaded(true);
  }
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => { if (mounted) refresh(); });
    const onStorage = (event: StorageEvent) => { if (event.key === null || event.key.startsWith('edeltoon:')) refresh(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('edeltoon:store-change', refresh);
    return () => { mounted = false; window.removeEventListener('storage', onStorage); window.removeEventListener('edeltoon:store-change', refresh); };
  }, []);
  return { snapshot, loaded, refresh };
}
