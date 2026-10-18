import { NextRequest, NextResponse } from 'next/server'
import { generateChallenge } from '@/lib/auth'
import { encodeLNURL } from '@/lib/lnurl'
import { rateLimitMiddleware } from '@/lib/rate-limit'
import { issueAuthChallenge, AUTH_NONCE_PATTERN } from '@/lib/storage'

export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent DoS attacks and cost abuse
  // More lenient in development to allow testing (especially for QR code page which may fetch multiple times)
  // Increased limit for development to handle wizard flow and QR code page refreshes
  // Production: 30/min allows for legitimate auth flow (initial load, retries, multiple components)
  const limit = process.env.NODE_ENV === 'development' ? 120 : 30
  const rateLimit = rateLimitMiddleware(request, limit, 60000) // 120/min in dev, 30/min in production
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  // This endpoint returns a random challenge and bech32 LNURL - no sensitive data.
  // Allow cross-origin requests so embed scripts on client websites can fetch challenges.
  const origin = request.headers.get('origin')

  // Check if k1 and siteId are provided (for encoding existing callback)
  // Otherwise generate a new k1 (for dashboard login)
  const searchParams = request.nextUrl.searchParams
  const providedK1 = searchParams.get('k1')
  const providedSiteId = searchParams.get('siteId')
  const providedNonce = searchParams.get('nonce')
  if (providedNonce && !AUTH_NONCE_PATTERN.test(providedNonce)) {
    return NextResponse.json({ error: 'Invalid nonce: use 16-128 characters of A-Z, a-z, 0-9, - or _' }, { status: 400 })
  }

  // Validate providedK1 - reject obviously invalid values like the literal string "undefined"
  // This catches the case where the embed script's LNURL fetch failed and passed k1=undefined
  if (providedK1 && !/^[0-9a-fA-F]{64}$/.test(providedK1)) {
    console.warn('LNURL: Rejected invalid providedK1:', JSON.stringify(providedK1.substring(0, 40)), 'length:', providedK1.length)
    // Don't reject the request - just ignore the invalid k1 and generate a new one
  }

  // Only use providedK1 if it's a valid 64-char hex string (32 bytes)
  const validK1 = providedK1 && /^[0-9a-fA-F]{64}$/.test(providedK1) ? providedK1 : null
  const k1 = validK1 || generateChallenge()
  const domain = request.nextUrl.origin

  // LNURL-auth spec (LUD-04): callback URL MUST include tag=login
  // so wallets know this is an auth request when they decode the bech32 LNURL
  let callbackUrl: string
  if (providedSiteId) {
    callbackUrl = `${domain}/api/auth/callback?tag=login&k1=${encodeURIComponent(k1)}&siteId=${encodeURIComponent(providedSiteId)}`
  } else {
    callbackUrl = `${domain}/api/auth/callback?tag=login&k1=${encodeURIComponent(k1)}`
  }

  const lnurlBech32 = encodeLNURL(callbackUrl)

  // Register the challenge so it can be consumed exactly once after signature verification
  try {
    await issueAuthChallenge(k1, providedSiteId, providedNonce)
  } catch (error) {
    console.error('LNURL: failed to persist challenge:', error)
    return NextResponse.json({ error: 'Failed to issue challenge' }, { status: 500 })
  }

  // Verify bech32 round-trip to catch encoding issues
  try {
    const { bech32 } = await import('bech32')
    const decoded = bech32.decode(lnurlBech32, 2000)
    const decodedUrl = Buffer.from(bech32.fromWords(decoded.words)).toString('utf8')
    const roundTripOk = decodedUrl === callbackUrl
    if (!roundTripOk) {
      console.error('LNURL ENCODING MISMATCH!', { original: callbackUrl, decoded: decodedUrl })
    }
    console.log('LNURL generated:', {
      k1_prefix: k1.substring(0, 20),
      k1_length: k1.length,
      callbackUrl,
      lnurl_length: lnurlBech32.length,
      domain,
      providedK1: !!providedK1,
      providedSiteId: providedSiteId || 'none',
      roundTripOk,
    })
  } catch (e) {
    console.error('LNURL bech32 verification failed:', e)
    console.log('LNURL generated (unverified):', { k1_prefix: k1.substring(0, 20), callbackUrl })
  }
  
  // Store challenge in cookie
  const response = NextResponse.json({ 
    k1,
    lnurl: lnurlBech32,
    callback: callbackUrl 
  })
  
  // Set CORS headers - allow any origin since this endpoint returns only public challenge data
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  }
  
  response.cookies.set('auth_challenge', k1, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300, // 5 minutes
  })
  
  return response
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')

  // Allow any origin - this endpoint returns only public challenge data
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return new NextResponse(null, {
    status: 204,
    headers,
  })
}


