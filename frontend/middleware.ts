import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side route protection — possible now that the session lives in an
 * httpOnly cookie set by the /api/backend proxy. Client-side guards in the
 * dashboard layout remain as UX (instant redirects, role-aware nav); this is
 * the enforcement layer that doesn't depend on JavaScript.
 */
const PROTECTED_PREFIXES = ['/dashboard']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  if (!isProtected) return NextResponse.next()

  const hasSession = request.cookies.has('orbi_access') || request.cookies.has('orbi_refresh')
  if (hasSession) return NextResponse.next()

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
