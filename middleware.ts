import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from './lib/jwt';

// Paths that don't require a logged-in session. Everything else is admin-only.
const PUBLIC_PATHS = ['/', '/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isLoginPage = pathname === '/login';

  if (!session && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // A logged-in admin visiting the login page gets sent to their dashboard.
  // (They can still visit "/" on purpose to see the public homepage.)
  if (session && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
