import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, verifyAccess } from './lib/server/auth';

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_ORIGIN', message: '요청 출처를 확인해 주세요.' } }, { status: 403 });
  }
  const session = await verifyAccess(request.cookies.get(AUTH_COOKIE)?.value);
  const path = request.nextUrl.pathname;
  const professor = path.startsWith('/professor') || path.startsWith('/api/professor');
  const student = path.startsWith('/student') || path.startsWith('/api/student');
  if (!session || (professor && session.role !== 'professor') || (student && session.role !== 'student')) {
    if (path.startsWith('/api/')) return NextResponse.json({ ok: false, error: { code: session ? 'FORBIDDEN' : 'UNAUTHORIZED', message: '로그인과 접근 권한을 확인해 주세요.' } }, { status: session ? 403 : 401, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.redirect(new URL('/', request.url));
  }
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/professor/:path*', '/student/:path*', '/api/professor/:path*', '/api/chat', '/api/student/:path*'] };
