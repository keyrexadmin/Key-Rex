import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Delete all session-related cookies
  const response = NextResponse.json({ success: true })
  
  // Delete primary session cookie
  response.cookies.delete('user_xpub')
  
  // Delete subscription backup cookie
  response.cookies.delete('user_subscription_backup')
  
  // Delete any temporary auth challenge cookies (they expire anyway, but clean up for good measure)
  response.cookies.delete('auth_challenge')
  
  // Note: auth_k1_* cookies are temporary and expire, but we could delete them if needed
  // However, they're scoped to specific k1 challenges and expire quickly, so not critical
  
  if (process.env.NODE_ENV === 'development') {
    console.log('User logged out - all session cookies deleted')
  }
  
  return response
}


