import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/session'
import { getUserByXpub } from '@/lib/storage'
import { rateLimitMiddleware } from '@/lib/rate-limit'
import {
  getLoginConfig,
  getCnameTarget,
  setLoginDomain,
  verifyLoginDomain,
  removeLoginDomain,
  setLoginMode,
} from '@/lib/login-domain'

export const dynamic = 'force-dynamic'

async function authenticate(request: NextRequest) {
  const xpub = getUserSession(request)
  if (!xpub) return null
  const user = await getUserByXpub(xpub)
  return user?.siteId ? { xpub, siteId: user.siteId } : null
}

async function status(siteId: string) {
  const cfg = await getLoginConfig(siteId)
  return {
    mode: cfg.mode,
    host: cfg.host,
    status: cfg.status,
    privateActive: cfg.privateActive,
    cnameTarget: getCnameTarget(),
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  return NextResponse.json(await status(auth.siteId))
}

/** Body: { action: 'set', host } | { action: 'verify' } | { action: 'mode', mode } | { action: 'remove' } */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const limit = rateLimitMiddleware({ headers: request.headers, identifier: auth.xpub }, 20, 60000)
  if (!limit.allowed) return limit.response as NextResponse

  let body: { action?: string; host?: string; mode?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  switch (body.action) {
    case 'set': {
      const result = await setLoginDomain(auth.siteId, auth.xpub, body.host || '')
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
      break
    }
    case 'verify': {
      const result = await verifyLoginDomain(auth.siteId)
      if (!result.ok) return NextResponse.json({ error: result.error, ...(await status(auth.siteId)) }, { status: 409 })
      break
    }
    case 'mode': {
      if (body.mode !== 'standard' && body.mode !== 'private') {
        return NextResponse.json({ error: 'mode must be "standard" or "private"' }, { status: 400 })
      }
      const result = await setLoginMode(auth.siteId, body.mode)
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
      break
    }
    case 'remove':
      await removeLoginDomain(auth.siteId)
      break
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
  return NextResponse.json(await status(auth.siteId))
}
