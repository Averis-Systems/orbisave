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

  // Buffer the body once so a refresh-retry can resend it (streams are
  // single-use). KYC uploads are a few MB — well within buffering range.
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer()

  let upstream = await backendFetch(req, path, search, body, isTokenPath || isRefreshPath ? undefined : accessToken)

  // Transparent single-retry refresh for expired access tokens.
  if (upstream.status === 401 && !isTokenPath && !isRefreshPath) {
    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value
    if (refreshToken) {
      const refreshResponse = await fetch(`${BACKEND_ORIGIN}/api/v1/${REFRESH_PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
        cache: 'no-store',
      })
      if (refreshResponse.ok) {
        const tokens = await refreshResponse.json()
        pending.access = tokens.access
        if (tokens.refresh) pending.refresh = tokens.refresh
        upstream = await backendFetch(req, path, search, body, tokens.access)
      } else {
        // Refresh chain is dead — clear cookies so the client re-authenticates.
        return applyCookies(await passThrough(upstream, {}), { clear: true })
      }
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
