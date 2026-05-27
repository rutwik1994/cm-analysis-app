import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL('/login', request.url));
  res.cookies.set('sa-auth', '', { maxAge: 0, path: '/' });
  return res;
}

// Also support GET so a direct link / router.push works
export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL('/login', request.url));
  res.cookies.set('sa-auth', '', { maxAge: 0, path: '/' });
  return res;
}
