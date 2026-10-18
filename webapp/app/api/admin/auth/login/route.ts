import { NextRequest, NextResponse } from 'next/server'
import { verifySignature, deriveXpub } from '@/lib/auth'
import { isAdminXpub } from '@/lib/admin-auth'
import { validateDashboardOrigin, getKeyRexDomain, getCorsHeaders } from '@/lib/cors'
import { rateLimitMiddleware } from '@/lib/rate-limit'
import { storeAuthSession, getAuthSession, consumeAuthChallenge } from '@/lib/storage'

/**
 * Admin Login API Route
 *
 * Handles LNURL-auth callback for admin authentication.
 * Verifies the xpub matches ADMIN_XPUB environment variable.
 *
 * Flow:
 * 1. Wallet decodes LNURL, GETs this endpoint (no sig/key) → returns tag/k1/callback
 * 2. Wallet signs k1, GETs this endpoint with sig/key → verifies, stores k1→xpub in DB
 * 3. Browser polls this endpoint with just k1 (no sig/key) and poll=true → checks DB, sets cookie
 */
export async function OPTIONS(request: NextRequest) {
  // SECURITY: Validate origin for admin login (Key-Rex domain only)
  const keyrexDomain = getKeyRexDomain(request)
  const origin = request.headers.get('origin')

  // Allow same-origin requests (no origin header) or validate Key-Rex domain
  if (origin && !validateDashboardOrigin(request, keyrexDomain)) {
    return new NextResponse(null, { status: 403 })
  }

  const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent brute force attacks
  const rateLimit = rateLimitMiddleware(request, 30, 60000) // 30 requests per minute (polling + wallet)
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }

  const keyrexDomain = getKeyRexDomain(request)
  const origin = request.headers.get('origin')

  const searchParams = request.nextUrl.searchParams
  const k1 = searchParams.get('k1')
  const sig = searchParams.get('sig')
  const key = searchParams.get('key')
  const poll = searchParams.get('poll')

  // === BROWSER POLLING: Check if wallet has completed auth for this k1 ===
  if (poll && k1 && !sig && !key) {
    // SECURITY: Validate origin for browser polling (Key-Rex domain only)
    if (origin && !validateDashboardOrigin(request, keyrexDomain)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
    }

    const xpub = await getAuthSession(k1)
    if (!xpub) {
      return NextResponse.json({ status: 'waiting' })
    }

    // Verify this is the admin xpub
    if (!isAdminXpub(xpub)) {
      return NextResponse.json({
        status: 'error',
        error: 'Not authorized for admin access'
      }, { status: 403 })
    }

    // Set admin session cookie on the BROWSER's response
    const response = NextResponse.json({
      status: 'OK',
      isAdmin: true,
    })

    const cookieOptions: any = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    }
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.secure = true
    }
    response.cookies.set('admin_session', xpub, cookieOptions)

    const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
    Object.entries(corsHeaders).forEach(([k, v]) => {
      response.headers.set(k, v)
    })

    return response
  }

  // === WALLET INITIAL REQUEST: Return LNURL-auth response format ===
  // Allow same-origin requests (no origin header) or validate Key-Rex domain
  if (origin && !validateDashboardOrigin(request, keyrexDomain)) {
    console.warn('CORS: Invalid origin for admin login:', origin)
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  if (!sig || !key) {
    if (!k1) {
      return NextResponse.json({ error: 'Missing k1 parameter' }, { status: 400 })
    }

    // Return LNURL-auth response format
    const domain = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
    const callback = `${domain}/api/admin/auth/login?tag=login&k1=${k1}`

    const response = NextResponse.json({
      tag: 'login',
      k1: k1,
      callback: callback,
    })

    const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
    Object.entries(corsHeaders).forEach(([k, v]) => {
      response.headers.set(k, v)
    })

    return response
  }

  // === WALLET CALLBACK: Verify signature and store auth result ===
  if (!k1) {
    return NextResponse.json({ error: 'Missing k1 parameter' }, { status: 400 })
  }

  const isValid = verifySignature(k1, sig, key)

  if (!isValid) {
    console.error('Admin login: Invalid signature')
    return NextResponse.json({
      error: 'Invalid signature - cryptographic verification failed'
    }, { status: 401 })
  }

  // SECURITY: k1 must be an issued, unexpired, unused challenge (single use)
  if (!(await consumeAuthChallenge(k1))) {
    return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 401 })
  }

  // Derive xpub from pubkey
  const xpub = deriveXpub(key)

  console.log('Admin login: Derived xpub:', xpub.substring(0, 20) + '...')

  // Verify this xpub is the admin xpub
  const adminXpub = process.env.ADMIN_XPUB

  if (!isAdminXpub(xpub)) {
    console.error('Admin login: xpub does not match ADMIN_XPUB')
    console.error('Admin login: Derived xpub:', xpub)
    console.error('Admin login: Expected ADMIN_XPUB:', adminXpub || 'NOT SET')

    return NextResponse.json({
      error: 'Unauthorized - this xpub is not authorized for admin access',
      adminXpubSet: !!adminXpub
    }, { status: 403 })
  }

  console.log('Admin login: Verified as admin, storing auth session')

  // Store k1 → xpub in DB so the browser can pick it up via polling
  const cleanK1 = k1.split('&')[0].split('?')[0]
  await storeAuthSession(cleanK1, xpub)

  // Return OK to the wallet (LNURL-auth spec requires { status: "OK" })
  const response = NextResponse.json({
    status: 'OK',
  })

  const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
  Object.entries(corsHeaders).forEach(([k, v]) => {
    response.headers.set(k, v)
  })

  return response
}
