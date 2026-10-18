import { getUserSession } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub } from '@/lib/storage'
import { getLoginFlow, isLegacyDeliveryEnabled } from '@/lib/legacy'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const xpub = getUserSession(request)
  if (!xpub) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const user = await getUserByXpub(xpub)
  if (!user?.siteId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const flow = await getLoginFlow(user.siteId)
  return NextResponse.json({
    ...flow,
    legacyDelivery: isLegacyDeliveryEnabled(),
    sunset: process.env.KEYREX_LEGACY_SUNSET || null,
  })
}
