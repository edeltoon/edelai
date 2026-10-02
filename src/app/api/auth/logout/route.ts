import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/server/auth';
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ ok: false }, { status: 403 });
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(AUTH_COOKIE, '', { httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}
