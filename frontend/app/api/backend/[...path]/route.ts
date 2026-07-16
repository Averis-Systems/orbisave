/**
 * Same-origin API proxy — the token-security boundary for the member app.
 *
 * JWTs never reach browser JavaScript: Django's token responses are
 * intercepted here, the access/refresh pair is stored in httpOnly cookies,
 * and the tokens are stripped from the body handed to the client. Every
 * subsequent call rides the cookie; expired access tokens are refreshed
 * transparently (single retry) server-side.
 *
 * Routes:
 *   /api/backend/<path>       → ${BACKEND_ORIGIN}/api/v1/<path>
 *   /api/backend/auth/logout/ → synthetic: clears the auth cookies
 */
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:8000'
const ACCESS_COOKIE = 'orbi_access'
const REFRESH_COOKIE = 'orbi_refresh'

// Endpoints whose responses carry tokens to capture.
const TOKEN_PATHS = new Set(['auth/token/', 'admin-portal/auth/login/'])
const REFRESH_PATH = 'auth/token/refresh/'

const baseCookie = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

type PendingCookies = { access?: string; refresh?: string; clear?: boolean }

function applyCookies(response: NextResponse, pending: PendingCookies) {
  if (pending.clear) {
    response.cookies.set(ACCESS_COOKIE, '', { ...baseCookie, maxAge: 0 })
    response.cookies.set(REFRESH_COOKIE, '', { ...baseCookie, maxAge: 0 })
    return response
  }
  if (pending.access) {
    // Matches SIMPLE_JWT access lifetime (15 min) with slack.
    response.cookies.set(ACCESS_COOKIE, pending.access, { ...baseCookie, maxAge: 60 * 20 })
  }
  if (pending.refresh) {
    response.cookies.set(REFRESH_COOKIE, pending.refresh, { ...baseCookie, maxAge: 60 * 60 * 24 * 7 })
  }
  return response
}

function forwardHeaders(req: NextRequest, accessToken?: string) {
  const headers = new Headers()
  for (const name of ['content-type', 'accept', 'x-country', 'accept-language']) {
    const value = req.headers.get(name)
    if (value) headers.set(name, value)
  }
  // Preserve the caller's IP for backend audit logs and throttles.
  const forwardedFor = req.headers.get('x-forwarded-for')
  headers.set('x-forwarded-for', forwardedFor || '127.0.0.1')
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`)
  return headers
}

async function backendFetch(
  req: NextRequest,
  path: string,
  search: string,
  body: ArrayBuffer | undefined,
  accessToken?: string,
) {
  return fetch(`${BACKEND_ORIGIN}/api/v1/${path}${search}`, {
    method: req.method,
    headers: forwardHeaders(req, accessToken),
    body: body && body.byteLength > 0 ? body : undefined,
    redirect: 'manual',
    cache: 'no-store',
  })
}

async function passThrough(upstream: Response, pending: PendingCookies) {
  const headers = new Headers()
  const contentType = upstream.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  const response = new NextResponse(upstream.body, { status: upstream.status, headers })
  return applyCookies(response, pending)
}

type MintedTokens = { access: string; refresh?: string }

// Refresh rotation blacklists the old token on first use, so two parallel
// requests refreshing with the same cookie would kill the session the first
// one just renewed. Dedup: concurrent callers share one in-flight refresh.
const refreshesInFlight = new Map<string, Promise<MintedTokens | null>>()

function mintAccess(refreshToken: string): Promise<MintedTokens | null> {
  const existing = refreshesInFlight.get(refreshToken)
  if (existing) return existing

  const attempt = (async () => {
    try {
      const response = await fetch(`${BACKEND_ORIGIN}/api/v1/${REFRESH_PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
        cache: 'no-store',
      })
      if (!response.ok) return null
      const tokens = await response.json()
      if (!tokens.access) return null
      return { access: tokens.access, refresh: tokens.refresh } as MintedTokens
    } catch {
      return null
    }
  })()

  refreshesInFlight.set(refreshToken, attempt)
  attempt.finally(() => refreshesInFlight.delete(refreshToken))
  return attempt
}

// The session is over: 401 is the signal the client interceptors log out on.
function sessionExpired() {
  return applyCookies(
    NextResponse.json(
      { success: false, data: null, message: 'Session expired. Please sign in again.', errors: null, meta: null },
      { status: 401 },
    ),
    { clear: true },
  )
}

async function handler(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params
  const path = `${segments.join('/')}/`.replace(/\/+$/, '/')
  const search = req.nextUrl.search || ''
  const pending: PendingCookies = {}

  // Synthetic logout: no backend round-trip needed — killing the cookies
  // kills the session (refresh rotation blacklists on next use).
  if (path === 'auth/logout/') {
    return applyCookies(NextResponse.json({ success: true }), { clear: true })
  }

  const isTokenPath = TOKEN_PATHS.has(path)
  const isRefreshPath = path === REFRESH_PATH
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value

  // Buffer the body once so a refresh-retry can resend it (streams are
  // single-use). KYC uploads are a few MB — well within buffering range.
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer()

  // The access cookie expires out of the browser (20 min) long before the
  // 7-day refresh cookie. Without pre-minting, every request after that
  // window went upstream unauthenticated and hard-failed — sessions died
  // silently mid-use (e.g. the onboarding FINISH doing nothing). Mint a
  // fresh access token first, then call upstream once, authenticated.
  let effectiveAccess = accessToken
  let refreshExhausted = false
  if (!effectiveAccess && refreshToken && !isTokenPath && !isRefreshPath) {
    const minted = await mintAccess(refreshToken)
    if (minted) {
      effectiveAccess = minted.access
      pending.access = minted.access
      if (minted.refresh) pending.refresh = minted.refresh
    } else {
      // Dead refresh chain: drop the cookies and forward unauthenticated —
      // public endpoints still work, protected ones return the 401 the
      // client interceptors log out on.
      pending.clear = true
      refreshExhausted = true
    }
  }

  let upstream = await backendFetch(req, path, search, body, isTokenPath || isRefreshPath ? undefined : effectiveAccess)

  // Mid-window expiry (token present but rejected upstream): refresh once
  // and retry. 403 counts too — auth failures surfaced as 403 before the
  // backend's authenticate_header fix, and the belt-and-braces retry costs
  // at most one extra round-trip on genuine permission denials.
  if (
    (upstream.status === 401 || upstream.status === 403) &&
    !isTokenPath && !isRefreshPath &&
    refreshToken && !refreshExhausted && !pending.access
  ) {
    const minted = await mintAccess(refreshToken)
    if (minted) {
      pending.access = minted.access
      if (minted.refresh) pending.refresh = minted.refresh
      upstream = await backendFetch(req, path, search, body, minted.access)
    } else if (upstream.status === 401) {
      // Unauthenticated upstream + dead refresh: the session is over.
      return sessionExpired()
    } else {
      // Genuine 403 (e.g. role denial) alongside a dead refresh chain —
      // pass the denial through but drop the dead cookies.
      pending.clear = true
    }
  }

  // Token endpoints: capture the pair into httpOnly cookies and strip it
  // from the body — browser JavaScript never sees a JWT.
  if ((isTokenPath || isRefreshPath) && upstream.ok) {
    const data = await upstream.json()
    const { access, refresh, access_token, refresh_token, ...rest } = data
    pending.access = access || access_token
    if (refresh || refresh_token) pending.refresh = refresh || refresh_token
    return applyCookies(
      NextResponse.json({ ...rest, authenticated: true }, { status: upstream.status }),
      pending,
    )
  }

  return passThrough(upstream, pending)
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
}
