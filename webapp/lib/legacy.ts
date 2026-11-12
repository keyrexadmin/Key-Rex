import { createHmac } from 'crypto'
import type { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { pairwiseSubject } from '@/lib/token'

/**
 * Legacy raw-identifier delivery. While enabled (default) embed responses keep returning the
 * raw xpub next to the token. After KEYREX_LEGACY_XPUB_DELIVERY=false, the `xpub` field in
 * embedded-site responses carries the per-site pairwise identifier instead, so a value learned
 * on one site is useless on another. The raw value remains inside the token (legacy_sub)
 * only while KEYREX_INCLUDE_LEGACY_SUB is not "false".
 */
export function isLegacyDeliveryEnabled(): boolean {
  return process.env.KEYREX_LEGACY_XPUB_DELIVERY !== 'false'
}

/** Value to expose as `xpub`/`identifier` to an embedding site. */
export function identifierForSite(xpub: string, siteId: string): string {
  if (isLegacyDeliveryEnabled()) return xpub
  const secret = process.env.KEYREX_PAIRWISE_SECRET
  return secret ? pairwiseSubject(xpub, siteId, secret) : createHmac('sha256', 'unconfigured').update(siteId).digest('base64url')
}

export function applyDeprecationHeaders(response: NextResponse): void {
  if (!isLegacyDeliveryEnabled()) return
  response.headers.set('Deprecation', 'true')
  const sunset = process.env.KEYREX_LEGACY_SUNSET
  if (sunset) {
    const date = new Date(sunset)
    if (!isNaN(date.getTime())) response.headers.set('Sunset', date.toUTCString())
  }
  const base = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '')
  response.headers.set('Link', `<${base}/docs/migration>; rel="deprecation"`)
}

/** Count a completed embedded login. Never throws. */
export async function recordLoginFlow(siteId: string, usedToken: boolean): Promise<void> {
  const now = BigInt(Date.now())
  try {
    await prisma.siteLoginFlow.upsert({
      where: { siteId },
      create: usedToken
        ? { siteId, tokenLogins: 1, lastTokenAt: now }
        : { siteId, legacyLogins: 1, lastLegacyAt: now },
      update: usedToken
        ? { tokenLogins: { increment: 1 }, lastTokenAt: now }
        : { legacyLogins: { increment: 1 }, lastLegacyAt: now },
    })
  } catch (error) {
    console.error('Failed to record login flow', error)
  }
}

export async function getLoginFlow(siteId: string) {
  const row = await prisma.siteLoginFlow.findUnique({ where: { siteId } })
  const legacyLogins = row?.legacyLogins ?? 0
  const tokenLogins = row?.tokenLogins ?? 0
  return {
    tokenLogins,
    legacyLogins,
    lastTokenAt: row?.lastTokenAt ? Number(row.lastTokenAt) : null,
    lastLegacyAt: row?.lastLegacyAt ? Number(row.lastLegacyAt) : null,
    needsMigration: legacyLogins > 0 && tokenLogins === 0,
  }
}
