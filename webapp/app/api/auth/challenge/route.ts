import { NextRequest, NextResponse } from 'next/server'
import { generateChallenge } from '@/lib/auth'
import { rateLimitMiddleware } from '@/lib/rate-limit'
import { issueAuthChallenge } from '@/lib/storage'

export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent DoS attacks and cost abuse
  // Allow reasonable rate for challenge generation (login attempts)
  const rateLimit = rateLimitMiddleware(request, 20, 60000) // 20 requests per minute (allows multiple login attempts)
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  const k1 = generateChallenge()

  try {
    await issueAuthChallenge(k1)
  } catch (error) {
    console.error('Challenge: failed to persist:', error)
    return NextResponse.json({ error: 'Failed to issue challenge' }, { status: 500 })
  }
  
  // Store challenge in session/cookie (simplified - use proper session storage in production)
  const response = NextResponse.json({ k1 })
  response.cookies.set('auth_challenge', k1, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300, // 5 minutes
  })
  
  return response
}







