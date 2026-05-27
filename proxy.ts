import { NextResponse, type NextRequest } from 'next/server';

const AUTH_COOKIE = 'sa-auth';
const PUBLIC = ['/login', '/api/auth', '/api/logout'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const expected = process.env.APP_PASSWORD ?? 'hf-procurement-2027';

  if (token !== expected) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|.*\\.woff2?$|.*\\.svg$).*)'],
};
