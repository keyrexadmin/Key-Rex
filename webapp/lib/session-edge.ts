/** Edge-runtime verifier for the signed user_xpub cookie (see lib/session.ts for the format). */
export async function verifyUserSessionEdge(value: string | undefined): Promise<string | undefined> {
  if (!value) return undefined
  const parts = value.split('.')
  if (parts.length !== 3) return undefined
  const [xpub, expStr, sig] = parts
  const exp = Number(expStr)
  if (!xpub || !Number.isFinite(exp) || exp < Date.now() / 1000) return undefined
  const secret = process.env.SESSION_SECRET || process.env.COOKIE_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'default-secret-change-in-production')
  if (!secret) return undefined
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const raw = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`user:${xpub}:${exp}`)))
  const expected = Array.from(raw).map(b => b.toString(16).padStart(2, '0')).join('')
  if (expected.length !== sig.length) return undefined
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  return diff === 0 ? xpub : undefined
}
