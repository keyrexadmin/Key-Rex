import { NextRequest, NextResponse } from 'next/server'
import { generateChallenge } from '@/lib/auth'
import { encodeLNURL } from '@/lib/lnurl'
import { rateLimitMiddleware } from '@/lib/rate-limit'

/**
 * Admin LNURL API Route
 * 
 * Generates a challenge and returns the admin login LNURL.
 */
export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent DoS attacks
  // More lenient in development to allow testing
  const limit = process.env.NODE_ENV === 'development' ? 60 : 10
  const rateLimit = rateLimitMiddleware(request, limit, 60000) // 60/min in dev, 10/min in production
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  const k1 = generateChallenge()
  const domain = request.nextUrl.origin
  const callbackUrl = `${domain}/api/admin/auth/login?k1=${encodeURIComponent(k1)}`
  const lnurlBech32 = encodeLNURL(callbackUrl)
  
  console.log('=== /api/admin/auth/lnurl called ===')
  console.log('Generated k1:', k1.substring(0, 20) + '...')
  console.log('Admin callback URL:', callbackUrl)
  console.log('Bech32 LNURL:', lnurlBech32.substring(0, 50) + '...')
  
  // Store challenge in cookie
  const response = NextResponse.json({ 
    k1,
    lnurl: lnurlBech32,
    callback: callbackUrl 
  })
  response.cookies.set('admin_auth_challenge', k1, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300, // 5 minutes
  })
  
  return response
}





