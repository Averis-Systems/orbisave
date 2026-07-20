/**
 * Server-side session claims for the Country Manager portal.
 *
 * Runs in the Edge runtime (middleware), so it uses jose rather than any Node
 * crypto API. The backend signs with RS256 in production and falls back to
 * HS256 in development, and this mirrors both.
 *
 * Why verify the signature at all, when the cookie is httpOnly and only our
 * own proxy ever sets it: Console, Manager and the member app share a
 * registrable domain in production, so a compromised sibling subdomain can set
 * a domain-scoped cookie this app will receive (cookie tossing). Reading an
 * unverified claim would let that forged cookie choose its own role, and here
 * also its own country, which is the database-routing signal.
 */
import { jwtVerify, importSPKI, type JWTPayload } from 'jose'

export const ACCESS_COOKIE = 'orbi_manager_access'
export const REFRESH_COOKIE = 'orbi_manager_refresh'

/** Roles permitted to hold a Manager session. */
export const PORTAL_ROLES = ['platform_admin'] as const

export const ALLOWED_COUNTRIES = ['kenya', 'rwanda', 'ghana']

export type SessionClaims = JWTPayload & {
  role?: string
  country?: string | null
}

// Server-only. Never prefixed NEXT_PUBLIC, so neither key reaches the browser.
const PUBLIC_KEY = process.env.JWT_PUBLIC_KEY
const HS_SECRET = process.env.JWT_HS_SECRET

let cachedSpki: Promise<CryptoKey> | null = null

function verificationKey() {
  if (PUBLIC_KEY) {
    // Env vars cannot hold real newlines in most deployment targets, so the
    // PEM is stored with literal \n and restored here.
    if (!cachedSpki) cachedSpki = importSPKI(PUBLIC_KEY.replace(/\\n/g, '\n'), 'RS256')
    return { key: cachedSpki, algorithms: ['RS256'] }
  }
  if (HS_SECRET) {
    return { key: Promise.resolve(new TextEncoder().encode(HS_SECRET)), algorithms: ['HS256'] }
  }
  return null
}

export type SessionResult =
  | { status: 'valid'; claims: SessionClaims }
  | { status: 'absent' }
  | { status: 'invalid' }
  /** No verification key configured, and not in production. */
  | { status: 'unverifiable'; claims: SessionClaims | null }

/**
 * Resolve the claims carried by the access cookie.
 *
 * Fails closed in production: with no key configured there is no way to trust
 * a role claim, so the caller must treat the request as unauthenticated rather
 * than guess. In development it degrades to 'unverifiable' so a local checkout
 * with no key still runs, with the backend as the only authorisation boundary.
 */
export async function readSession(token: string | undefined): Promise<SessionResult> {
  if (!token) return { status: 'absent' }

  const material = verificationKey()
  if (!material) {
    if (process.env.NODE_ENV === 'production') return { status: 'invalid' }
    return { status: 'unverifiable', claims: decodeUnverified(token) }
  }

  try {
    const { payload } = await jwtVerify(token, await material.key, {
      algorithms: material.algorithms,
      audience: 'orbisave_api',
    })
    return { status: 'valid', claims: payload as SessionClaims }
  } catch {
    return { status: 'invalid' }
  }
}

/**
 * Read claims without checking the signature. Only ever used on the
 * development path above, where there is no key to check against.
 */
function decodeUnverified(token: string): SessionClaims | null {
  try {
    const segment = token.split('.')[1]
    if (!segment) return null
    const json = atob(segment.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as SessionClaims
  } catch {
    return null
  }
}
