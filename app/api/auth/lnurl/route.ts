import { NextRequest, NextResponse } from 'next/server'
import { generateChallenge } from '@/lib/auth'
import { encodeLNURL } from '@/lib/lnurl'
import { validateDashboardOrigin, getKeyRexDomain, getCorsHeaders } from '@/lib/cors'
import { rateLimitMiddleware } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent DoS attacks and cost abuse
  const rateLimit = rateLimitMiddleware(request, 5, 60000) // 5 requests per minute (reduced from 10 for cost control)
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  // Validate origin - this endpoint is for dashboard logins (Key-Rex domain only)
  const keyrexDomain = getKeyRexDomain(request)
  const origin = request.headers.get('origin')
  
  if (!origin || !validateDashboardOrigin(request, keyrexDomain)) {
    // For dashboard logins, we allow same-origin requests (no origin header)
    // But if origin is provided, it must match Key-Rex domain
    if (origin && !validateDashboardOrigin(request, keyrexDomain)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('CORS: Invalid origin for dashboard login:', origin)
      }
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
    }
  }
  
  const k1 = generateChallenge()
  const domain = request.nextUrl.origin
  // Ensure callback URL is properly formatted - no extra params that could confuse Alby
  const callbackUrl = `${domain}/api/auth/callback?tag=login&k1=${encodeURIComponent(k1)}`
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


