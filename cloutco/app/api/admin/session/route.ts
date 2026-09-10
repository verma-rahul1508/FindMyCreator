import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getAdminAuthorizationForAccessToken } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Authentication required.' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } },
  );
}

function authorizationResponse(status: 401 | 403, error: string) {
  return NextResponse.json(
    { error },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (!accessToken) {
    return unauthorizedResponse();
  }

  const authorizationResult = await getAdminAuthorizationForAccessToken(accessToken);

  if (authorizationResult.state === 'unauthenticated') {
    return unauthorizedResponse();
  }

  if (authorizationResult.state === 'forbidden') {
    return authorizationResponse(403, 'Administrator access is required.');
  }

  const response = NextResponse.json(
    { email: authorizationResult.email },
    { headers: { 'Cache-Control': 'no-store' } },
  );

  response.cookies.set(ADMIN_SESSION_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: 60 * 60,
  });

  return response;
}

export async function DELETE() {
  const response = new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: 0,
  });

  return response;
}
