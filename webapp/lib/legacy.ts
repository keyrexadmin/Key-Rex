import { createHmac } from 'crypto'
import type { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { pairwiseSubject } from '@/lib/token'
import { getLegacySunset, isLegacyDeliveryEnabled } from '@/lib/legacy-sunset'

export { getLegacySunset, isLegacyDeliveryEnabled }

/** Value to expose as `xpub`/`identifier` to an embedding site. */
export function identifierForSite(xpub: string, siteId: string): string {
  if (isLegacyDeliveryEnabled()) return xpub
  const secret = process.env.KEYREX_PAIRWISE_SECRET
  return secret ? pairwiseSubject(xpub, siteId, secret) : createHmac('sha256', 'unconfigured').update(siteId).digest('base64url')
}

export function applyDeprecationHeaders(response: NextResponse): void {
  if (!isLegacyDeliveryEnabled()) return
  response.headers.set('Deprecation', 'true')
  response.headers.set('Sunset', getLegacySunset().toUTCString())
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
