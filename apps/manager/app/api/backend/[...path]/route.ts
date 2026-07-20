/**
 * Same-origin API proxy — the token-security boundary for the Manager portal.
 *
 * Before this existed the portal put its JWT in a js-cookie readable cookie
 * and mirrored it into zustand state, so any script running on the page could
 * read a live admin token. Now Django's token responses are intercepted here,
 * the access/refresh pair is stored in httpOnly cookies, and the tokens are
 * stripped from the body handed to the client.
 *
 * This proxy also owns the X-Country header. CountryMiddleware runs before
 * DRF's JWT authentication, so request.user is anonymous when routing is
 * decided and the header is what actually selects the country database on
 * admin traffic. Sending it from the browser therefore let the client choose
 * which country's data it read. It is now derived from the country claim in
 * the verified token, and any client-supplied value is dropped.
 *
 * Cookie names are portal-specific. Console and Manager are served from the
 * same site in production, and a shared cookie name would mean signing into
 * one portal silently replaced the other's session.
 */
import { NextRequest, NextResponse } from 'next/server'
import { ACCESS_COOKIE, REFRESH_COOKIE, PORTAL_ROLES, ALLOWED_COUNTRIES, readSession } from '@/lib/session'

const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:8000'
// Records that the session was minted with "Remember me" unchecked, so refresh
// rotation keeps writing session cookies instead of silently upgrading the
// session to the 7-day form on the first token refresh.
const SESSION_ONLY_COOKIE = 'orbi_manager_session_only'

// Admin sign-in and email verification both return { data: { user, access,
// refresh } }, so the tokens are nested rather than top level.
const NESTED_TOKEN_PATHS = new Set([
  'admin-portal/auth/login/',
  'admin-portal/auth/verify-email/',
])
const REFRESH_PATH = 'auth/token/refresh/'

const baseCookie = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

type PendingCookies = {
  access?: string
  refresh?: string
  clear?: boolean
  /**
   * Unchecked "Remember me" makes the refresh cookie a session cookie, so the
   * session dies with the browser instead of lasting 7 days. Preserved from
   * the old client-side implementation: it is a real behaviour, not a
   * decorative checkbox.
   */
  sessionOnly?: boolean
}

function applyCookies(response: NextResponse, pending: PendingCookies) {
  if (pending.clear) {
    response.cookies.set(ACCESS_COOKIE, '', { ...baseCookie, maxAge: 0 })
    response.cookies.set(REFRESH_COOKIE, '', { ...baseCookie, maxAge: 0 })
    response.cookies.set(SESSION_ONLY_COOKIE, '', { ...baseCookie, maxAge: 0 })
    return response
  }
  if (pending.access) {
    // Matches SIMPLE_JWT access lifetime (15 min) with slack.
    response.cookies.set(ACCESS_COOKIE, pending.access, { ...baseCookie, maxAge: 60 * 20 })
  }
  if (pending.refresh) {
    response.cookies.set(REFRESH_COOKIE, pending.refresh, {
      ...baseCookie,
      ...(pending.sessionOnly ? {} : { maxAge: 60 * 60 * 24 * 7 }),
    })
    if (pending.sessionOnly) response.cookies.set(SESSION_ONLY_COOKIE, '1', baseCookie)
  }
  return response
}

function forwardHeaders(req: NextRequest, accessToken?: string, country?: string) {
  const headers = new Headers()
  // Allowlist: anything the client sends that is not named here is dropped,
  // which is how a browser-supplied X-Country stops reaching Django.
  for (const name of ['content-type', 'accept', 'accept-language']) {
    const value = req.headers.get(name)
    if (value) headers.set(name, value)
  }
  // Preserve the caller's IP for backend audit logs and throttles.
  const forwardedFor = req.headers.get('x-forwarded-for')
  headers.set('x-forwarded-for', forwardedFor || '127.0.0.1')
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`)
  if (country) headers.set('x-country', country)
  return headers
}

async function backendFetch(
  req: NextRequest,
  path: string,
  search: string,
  body: ArrayBuffer | undefined,
  accessToken?: string,
  country?: string,
) {
  return fetch(`${BACKEND_ORIGIN}/api/v1/${path}${search}`, {
    method: req.method,
    headers: forwardHeaders(req, accessToken, country),
    body: body && body.byteLength > 0 ? body : undefined,
    redirect: 'manual',
    cache: 'no-store',
  })
}

/**
 * The country this request may read, taken from the token rather than the
 * browser. Returns undefined when the token cannot be trusted, in which case
 * no header is sent and the backend falls back to 'default'.
 */
async function countryFromToken(accessToken: string | undefined) {
  if (!accessToken) return undefined
  const session = await readSession(accessToken)
  const claims = session.status === 'valid' ? session.claims
    : session.status === 'unverifiable' ? session.claims
    : null
  const country = (claims?.country || '').toString().toLowerCase()
  return ALLOWED_COUNTRIES.includes(country) ? country : undefined
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
      { success: false, data: null, message: 'Session expired. Please sign in again.' },
      { status: 401 },
    ),
    { clear: true },
  )
}

async function handler(req: NextRequest, context: { params: { path: string[] } }) {
  const path = `${context.params.path.join('/')}/`.replace(/\/+$/, '/')
  const search = req.nextUrl.search || ''
  const pending: PendingCookies = {}

  // Synthetic logout: no backend round-trip needed — killing the cookies kills
  // the session (refresh rotation blacklists on next use).
  if (path === 'auth/logout/') {
    return applyCookies(NextResponse.json({ success: true }), { clear: true })
  }

  const isNestedTokenPath = NESTED_TOKEN_PATHS.has(path)
  const isRefreshPath = path === REFRESH_PATH
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value

  // On sign-in the client states the preference; afterwards it is remembered
  // server-side, so a rotation cannot quietly extend a browser-lifetime
  // session into a 7-day one. The header is consumed here, never forwarded.
  pending.sessionOnly = isNestedTokenPath
    ? req.headers.get('x-remember') === '0'
    : req.cookies.has(SESSION_ONLY_COOKIE)

  // Buffer the body once so a refresh-retry can resend it (streams are
  // single-use).
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer()

  // The access cookie expires out of the browser (20 min) long before the
  // 7-day refresh cookie. Without pre-minting, every request after that window
  // goes upstream unauthenticated and hard-fails, killing sessions mid-use.
  let effectiveAccess = accessToken
  let refreshExhausted = false
  if (!effectiveAccess && refreshToken && !isNestedTokenPath && !isRefreshPath) {
    const minted = await mintAccess(refreshToken)
    if (minted) {
      effectiveAccess = minted.access
      pending.access = minted.access
      if (minted.refresh) pending.refresh = minted.refresh
    } else {
      pending.clear = true
      refreshExhausted = true
    }
  }

  const authed = !isNestedTokenPath && !isRefreshPath
  const country = authed ? await countryFromToken(effectiveAccess) : undefined

  let upstream = await backendFetch(
    req,
    path,
    search,
    body,
    authed ? effectiveAccess : undefined,
    country,
  )

  // Mid-window expiry (token present but rejected upstream): refresh once and
  // retry. 403 counts too, since auth failures can surface as 403, and the
  // retry costs at most one extra round-trip on genuine permission denials.
  if (
    (upstream.status === 401 || upstream.status === 403) &&
    authed && refreshToken && !refreshExhausted && !pending.access
  ) {
    const minted = await mintAccess(refreshToken)
    if (minted) {
      pending.access = minted.access
      if (minted.refresh) pending.refresh = minted.refresh
      upstream = await backendFetch(
        req, path, search, body, minted.access, await countryFromToken(minted.access),
      )
    } else if (upstream.status === 401) {
      return sessionExpired()
    } else {
      // Genuine 403 alongside a dead refresh chain: pass the denial through
      // but drop the dead cookies.
      pending.clear = true
    }
  }

  // Refresh endpoint: tokens sit at the top level.
  if (isRefreshPath && upstream.ok) {
    const data = await upstream.json()
    const { access, refresh, ...rest } = data
    pending.access = access
    if (refresh) pending.refresh = refresh
    return applyCookies(
      NextResponse.json({ ...rest, authenticated: Boolean(access) }, { status: upstream.status }),
      pending,
    )
  }

  // Sign-in and email verification: capture the nested pair into httpOnly
  // cookies, keep data.user so the client can render a name and country, and
  // drop the tokens so browser JavaScript never sees a JWT.
  if (isNestedTokenPath && upstream.ok) {
    const payload = await upstream.json()
    const { access, refresh, user, ...restData } = (payload && payload.data) || {}

    if (user && !PORTAL_ROLES.includes(user.role)) {
      // Correct credentials, wrong portal. No cookie is set, so no session
      // exists to escalate from. The message stays generic so the response
      // does not confirm which portal the account does belong to.
      return NextResponse.json(
        { success: false, data: null, message: 'This account cannot sign in here.' },
        { status: 403 },
      )
    }

    if (access) pending.access = access
    if (refresh) pending.refresh = refresh
    return applyCookies(
      NextResponse.json(
        {
          ...payload,
          data: { ...restData, user: user ?? null },
          authenticated: Boolean(access),
        },
        { status: upstream.status },
      ),
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
