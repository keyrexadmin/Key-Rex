import { NextRequest, NextResponse } from 'next/server'
import { generateChallenge } from '@/lib/auth'
import { encodeLNURL } from '@/lib/lnurl'
import { validateDashboardOrigin, getKeyRexDomain, getCorsHeaders } from '@/lib/cors'
import { rateLimitMiddleware } from '@/lib/rate-limit'

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
  
  // Validate origin - this endpoint is for Key-Rex domain only (dashboard and QR code page)
  // Same-origin requests (no origin header) are always allowed
  // Cross-origin requests must match Key-Rex domain
  const keyrexDomain = getKeyRexDomain(request)
  const origin = request.headers.get('origin')
  
  // If origin is provided (cross-origin request), validate it
  if (origin) {
    if (!validateDashboardOrigin(request, keyrexDomain)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('CORS: Invalid origin for LNURL request:', origin, 'expected:', keyrexDomain)
      }
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
    }
  }
  // No origin header means same-origin request - always allow
  
  // Check if k1 and siteId are provided (for encoding existing callback)
  // Otherwise generate a new k1 (for dashboard login)
  const searchParams = request.nextUrl.searchParams
  const providedK1 = searchParams.get('k1')
  const providedSiteId = searchParams.get('siteId')

  const k1 = providedK1 || generateChallenge()
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
  
  if (process.env.NODE_ENV === 'development') {
    console.log('=== /api/auth/lnurl called ===')
    console.log('Generated k1:', k1.substring(0, 20) + '...')
    console.log('Callback URL:', callbackUrl)
    console.log('Bech32 LNURL:', lnurlBech32.substring(0, 50) + '...')
  }
  
  // Store challenge in cookie
  const response = NextResponse.json({ 
    k1,
    lnurl: lnurlBech32,
    callback: callbackUrl 
  })
  
  // Set CORS headers based on validated origin
  const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
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
  const keyrexDomain = getKeyRexDomain(request)
  
  // Validate origin for preflight
  if (origin && !validateDashboardOrigin(request, keyrexDomain)) {
    return new NextResponse(null, { status: 403 })
  }
  
  const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}


