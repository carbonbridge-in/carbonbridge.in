import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from './lib/auth';

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes — no auth needed
  const publicPaths = ['/', '/landing.html', '/login', '/api/auth/login', '/api/auth/change-password', '/_next', '/favicon.ico'];
  if (publicPaths.some(p => pathname === p || pathname.startsWith(p) && p !== '/')) return NextResponse.next();

  const session = await getSessionFromRequest(req);

  // Not logged in → redirect to login
  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Force password reset
  if (session.isTempPassword && !pathname.startsWith('/change-password') && !pathname.startsWith('/api/auth')) {
    return NextResponse.redirect(new URL('/change-password', req.url));
  }

  // Admin-only routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (session.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Client routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/client')) {
    if (session.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth/login).*)',
  ],
};
