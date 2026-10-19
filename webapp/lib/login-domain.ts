import { createHash, randomBytes } from 'crypto'
import { promises as dns } from 'dns'
import { prisma } from '@/lib/db'
import { getVerifiedDomains } from '@/lib/storage'

/**
 * Private login mode. A site may serve its LNURL-auth callback from its own login domain
 * (auth.<site-domain>, CNAME to Key-Rex). Wallets derive a different linking key per callback
 * domain (LUD-05), so the key a site sees cannot be joined with the same wallet's key on any
 * other site, not even by Key-Rex. Standard mode (shared keyrex.co callback) is unchanged.
 */

export type LoginMode = 'standard' | 'private'

export interface LoginDomainInfo {
  siteId: string
  host: string
  status: 'pending' | 'active'
}

const HOST_PATTERN = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

/** Dev/test hosts (e.g. auth.localhost) skip DNS and ownership checks outside production. */
export function isLocalTestHost(host: string): boolean {
  return process.env.NODE_ENV !== 'production' && (host === 'localhost' || host.endsWith('.localhost'))
}

export function getRequestHost(request: { headers: { get(name: string): string | null } }): string {
  return (request.headers.get('host') || '').toLowerCase().replace(/:\d+$/, '')
}

export function getCnameTarget(): string {
  if (process.env.KEYREX_LOGIN_CNAME_TARGET) return process.env.KEYREX_LOGIN_CNAME_TARGET.toLowerCase()
  try {
    return new URL(process.env.NEXT_PUBLIC_BASE_URL || '').hostname.toLowerCase()
  } catch {
    return 'keyrex.co'
  }
}

export function normalizeLoginHost(input: string): string | null {
  const host = (input || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/:].*$/, '')
  if (isLocalTestHost(host) && host !== 'localhost') return host
  return HOST_PATTERN.test(host) ? host : null
}

/** The active login domain served at this Host header, if any. */
export async function resolveLoginDomain(host: string): Promise<LoginDomainInfo | null> {
  if (!host) return null
  const row = await prisma.loginDomain.findUnique({ where: { host } })
  if (!row || row.status !== 'active') return null
  return { siteId: row.siteId, host: row.host, status: 'active' }
}

export async function getLoginConfig(siteId: string) {
  const [domain, user] = await Promise.all([
    prisma.loginDomain.findUnique({ where: { siteId } }),
    prisma.user.findUnique({ where: { siteId }, select: { loginMode: true } }),
  ])
  const mode: LoginMode = user?.loginMode === 'private' ? 'private' : 'standard'
  return {
    mode,
    host: domain?.host ?? null,
    status: (domain?.status as 'pending' | 'active' | undefined) ?? null,
    // Private login is only in effect with an active login domain
    privateActive: mode === 'private' && domain?.status === 'active',
  }
}

export async function getActivePrivateHost(siteId: string): Promise<string | null> {
  const cfg = await getLoginConfig(siteId)
  return cfg.privateActive ? cfg.host : null
}

function primaryHosts(): string[] {
  const hosts = new Set<string>([getCnameTarget()])
  for (const h of (process.env.KEYREX_PRIMARY_HOSTS || '').split(',')) {
    if (h.trim()) hosts.add(h.trim().toLowerCase())
  }
  return Array.from(hosts)
}

export async function setLoginDomain(siteId: string, ownerXpub: string, rawHost: string): Promise<{ ok: true; domain: LoginDomainInfo } | { ok: false; error: string }> {
  const host = normalizeLoginHost(rawHost)
  if (!host) return { ok: false, error: 'Enter a valid hostname such as auth.example.com' }
  if (primaryHosts().includes(host)) return { ok: false, error: 'That hostname is reserved' }

  if (!isLocalTestHost(host)) {
    // Must be a subdomain of a domain the owner has already verified
    const verified = await getVerifiedDomains(ownerXpub)
    const parent = verified.find(d => host.endsWith('.' + d))
    if (!parent) {
      return { ok: false, error: 'The login domain must be a subdomain of a domain you have verified (for example auth.' + (verified[0] || 'example.com') + ')' }
    }
  }

  const existing = await prisma.loginDomain.findUnique({ where: { host } })
  if (existing && existing.siteId !== siteId) {
    return { ok: false, error: 'That hostname is already in use' }
  }

  const now = BigInt(Date.now())
  const local = isLocalTestHost(host)
  const row = await prisma.loginDomain.upsert({
    where: { siteId },
    create: { siteId, host, status: local ? 'active' : 'pending', createdAt: now, verifiedAt: local ? now : null },
    // Changing the host invalidates earlier verification
    update: { host, status: local ? 'active' : 'pending', verifiedAt: local ? now : null },
  })
  if (!local) await provisionVercelDomain(host)
  return { ok: true, domain: { siteId, host: row.host, status: row.status as 'pending' | 'active' } }
}

/** Check the CNAME and activate the login domain. */
export async function verifyLoginDomain(siteId: string): Promise<{ ok: boolean; status: 'pending' | 'active' | null; error?: string }> {
  const row = await prisma.loginDomain.findUnique({ where: { siteId } })
  if (!row) return { ok: false, status: null, error: 'No login domain configured' }
  if (row.status === 'active') return { ok: true, status: 'active' }

  let records: string[] = []
  try {
    records = (await dns.resolveCname(row.host)).map(r => r.toLowerCase().replace(/\.$/, ''))
  } catch {
    return { ok: false, status: 'pending', error: 'No CNAME record found yet. DNS changes can take a few minutes.' }
  }
  const target = getCnameTarget()
  if (!records.some(r => r === target || r.endsWith('.' + target))) {
    return { ok: false, status: 'pending', error: `CNAME points to ${records[0]}, expected ${target}` }
  }
  await prisma.loginDomain.update({ where: { siteId }, data: { status: 'active', verifiedAt: BigInt(Date.now()) } })
  return { ok: true, status: 'active' }
}

export async function removeLoginDomain(siteId: string): Promise<void> {
  await prisma.user.updateMany({ where: { siteId }, data: { loginMode: 'standard' } })
  await prisma.loginDomain.deleteMany({ where: { siteId } })
}

export async function setLoginMode(siteId: string, mode: LoginMode): Promise<{ ok: boolean; error?: string }> {
  if (mode === 'private') {
    const cfg = await getLoginConfig(siteId)
    if (cfg.status !== 'active') {
      return { ok: false, error: 'Add and verify a login domain before enabling private login' }
    }
  }
  await prisma.user.updateMany({ where: { siteId }, data: { loginMode: mode } })
  return { ok: true }
}

/**
 * Attach the domain to the Vercel project so a certificate is issued. No-op unless
 * VERCEL_API_TOKEN and VERCEL_PROJECT_ID are set; failures are logged, not fatal, because
 * the owner can also add the domain manually.
 */
async function provisionVercelDomain(host: string): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN
  const project = process.env.VERCEL_PROJECT_ID
  if (!token || !project) return
  const team = process.env.VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : ''
  try {
    const res = await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(project)}/domains${team}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: host }),
    })
    if (!res.ok && res.status !== 409) {
      console.error('Vercel domain provisioning failed:', res.status)
    }
  } catch (error) {
    console.error('Vercel domain provisioning error:', error)
  }
}

export function newEntropy(): string {
  return randomBytes(16).toString('hex')
}

/**
 * k1 for private-mode logins. Derived from the site's own nonce plus Key-Rex entropy, so the
 * site can recompute it and confirm that a signature it is shown was made over *its* challenge.
 */
export function deriveReceiptK1(siteId: string, nonce: string, entropy: string): string {
  return createHash('sha256').update(`keyrex-k1|${siteId}|${nonce}|${entropy}`).digest('hex')
}
