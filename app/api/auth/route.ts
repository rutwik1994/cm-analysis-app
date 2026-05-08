import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { password } = await request.json() as { password: string };
  const expected = process.env.APP_PASSWORD ?? 'hf-procurement-2024';

  if (password !== expected) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('sa-auth', expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}
