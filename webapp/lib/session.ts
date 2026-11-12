import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Signed session cookies for `user_xpub` (customer dashboard) and `admin_session`.
 * Format: <xpub>.<expiresAtSeconds>.<hmac>. The HMAC covers the purpose, so a customer
 * cookie can never be replayed as an admin cookie. The identifier alone is not a credential.
 */
export type SessionPurpose = 'user' | 'admin'

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.COOKIE_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET (or COOKIE_SECRET) must be set in production')
    }
    return 'default-secret-change-in-production'
  }
  return secret
}

function mac(purpose: SessionPurpose, xpub: string, exp: number): string {
  return createHmac('sha256', getSecret()).update(`${purpose}:${xpub}:${exp}`).digest('hex')
}

export function signSession(purpose: SessionPurpose, xpub: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
  return `${xpub}.${exp}.${mac(purpose, xpub, exp)}`
}

/** Returns the xpub if the cookie value is authentic and unexpired; otherwise undefined. */
export function verifySession(purpose: SessionPurpose, value: string | undefined | null): string | undefined {
  if (!value) return undefined
  const parts = value.split('.')
  if (parts.length !== 3) return undefined
  const [xpub, expStr, sig] = parts
  const exp = Number(expStr)
  if (!xpub || !Number.isFinite(exp) || exp < Date.now() / 1000) return undefined
  const expected = Buffer.from(mac(purpose, xpub, exp))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return undefined
  return xpub
}

interface CookieReader {
  cookies: { get(name: string): { value: string } | undefined }
}

export function getUserSession(request: CookieReader): string | undefined {
  return verifySession('user', request.cookies.get('user_xpub')?.value)
}

export function getAdminSession(request: CookieReader): string | undefined {
  return verifySession('admin', request.cookies.get('admin_session')?.value)
}
