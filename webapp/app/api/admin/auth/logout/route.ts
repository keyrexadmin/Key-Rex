import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/rate-limit'

/**
 * Admin Logout API Route
 * 
 * Clears the admin session cookie.
 */
export async function POST(request: NextRequest) {
  // SECURITY: Rate limiting - prevent abuse
  const rateLimit = rateLimitMiddleware(request, 10, 60000) // 10 requests per minute
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  console.log('=== /api/admin/auth/logout called ===')
  
  const response = NextResponse.json({ success: true })
  
  // Clear admin session cookie
  response.cookies.set('admin_session', '', {
    expires: new Date(0),
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  
  console.log('Admin session cookie cleared')
  
  return response
}





