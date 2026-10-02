// 변경 요청(POST·PATCH 등)의 출처 확인. 배포 주소를 코드에 고정하지 않고, 요청을 받은 호스트와 Origin의 호스트를 비교한다.
// 호스트는 앞단 프록시(Vercel 등)가 넘긴 x-forwarded-host가 있으면 그것, 없으면 host 헤더.
// request.nextUrl.origin은 next start 뒤에서 서버 자신의 주소(http://localhost:포트)가 될 수 있어 쓰지 않는다.
// proxy와 node 테스트에서도 불러오도록 다른 모듈을 import하지 않는다.

/**
 * 예) Origin https://setask.vercel.app + x-forwarded-host setask.vercel.app → true
 *     Origin http://localhost:3000 + host localhost:3000 → true
 *     Origin https://evil.example + host setask.vercel.app → false, Origin 없음 → false, Origin 'null' → false
 */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get('origin');
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host = (headers.get('x-forwarded-host') ?? headers.get('host') ?? '').split(',')[0].trim();
  return host !== '' && originHost.toLowerCase() === host.toLowerCase();
}
