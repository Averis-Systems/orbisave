import { NextRequest, NextResponse } from 'next/server'
import { ACCESS_COOKIE, REFRESH_COOKIE, PORTAL_ROLES, readSession } from '@/lib/session'

/**
 * Server-side route protection for the Country Manager portal.
 *
 * The dashboard used to be guarded only by a useEffect reading a role out of
 * persisted client state, which meant protected markup painted before the
 * redirect fired, and the role came from storage the user can edit. This runs
 * before anything paints and reads the role from the signed token. The
 * client-side guard stays as UX; the backend permission classes remain the
 * actual authorisation boundary.
 */
const PROTECTED_PREFIX = '/dashboard'

function redirectToLogin(request: NextRequest, reason: 'auth' | 'role') {
  const loginUrl = new URL('/login', request.url)
  if (reason === 'auth') loginUrl.searchParams.set('next', request.nextUrl.pathname)
  const response = NextResponse.redirect(loginUrl)
  if (reason === 'role') {
    response.cookies.set(ACCESS_COOKIE, '', { path: '/', maxAge: 0 })
    response.cookies.set(REFRESH_COOKIE, '', { path: '/', maxAge: 0 })
  }
  return response
}

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next()
  }

  const access = request.cookies.get(ACCESS_COOKIE)?.value
  const hasRefresh = request.cookies.has(REFRESH_COOKIE)

  const session = await readSession(access)

  switch (session.status) {
    case 'valid':
      if (!PORTAL_ROLES.includes(session.claims.role as (typeof PORTAL_ROLES)[number])) {
        return redirectToLogin(request, 'role')
      }
      return NextResponse.next()

    case 'absent':
    case 'invalid':
      // An expired access cookie with a live refresh cookie is an ordinary
      // idle session, not a rejection. Let it through so the proxy can mint a
      // new access token on the page's first data call; if the refresh chain
      // is dead the proxy returns 401 and the client logs out.
      if (hasRefresh) return NextResponse.next()
      return redirectToLogin(request, 'auth')

    case 'unverifiable':
      // Development only. Enforce the role on a best-effort basis so local
      // behaviour still matches production, but never treat it as a boundary.
      if (session.claims && !PORTAL_ROLES.includes(session.claims.role as (typeof PORTAL_ROLES)[number])) {
        return redirectToLogin(request, 'role')
      }
      return NextResponse.next()
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
