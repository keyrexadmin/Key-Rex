import { NextRequest, NextResponse } from 'next/server'
import { generateChallenge } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const k1 = generateChallenge()
  
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







