import { NextRequest, NextResponse } from 'next/server';
import { isSameOrigin } from '@/lib/server/origin';
import { AUTH_COOKIE, authenticateMember } from '@/lib/server/auth';

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers)) return NextResponse.json({ ok: false, message: '요청 출처를 확인해 주세요.' }, { status: 403 });
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return NextResponse.json({ ok: false, message: 'JSON 요청이 필요해요.' }, { status: 415 });
  let input: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error();
    let size = 0, raw = '';
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) { await reader.cancel(); return NextResponse.json({ ok: false, message: '입력이 너무 길어요.' }, { status: 413 }); }
        raw += decoder.decode(value, { stream: true });
      }
      input = JSON.parse(raw + decoder.decode());
    } finally { reader.releaseLock(); }
  } catch { return NextResponse.json({ ok: false, message: '입력 형식을 확인해 주세요.' }, { status: 400 }); }
  const result = await authenticateMember(input);
  if (!result.ok) return NextResponse.json({ ok: false, message: result.message }, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
  const response = NextResponse.json({ ok: true, session: result.session, next: result.session.role === 'professor' ? '/professor' : '/student' }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(AUTH_COOKIE, result.token, { httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'lax', path: '/', maxAge: result.expiresIn });
  return response;
}
