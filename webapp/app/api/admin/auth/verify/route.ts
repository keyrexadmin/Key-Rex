import { NextRequest, NextResponse } from 'next/server'
import { getAdminSessionFromCookie, isAdminXpub } from '@/lib/admin-auth'
import { rateLimitMiddleware } from '@/lib/rate-limit'

/**
 * Admin Verify API Route
 * 
 * Checks if the current session is a valid admin session.
 */
export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent cost abuse
  const rateLimit = rateLimitMiddleware(request, 60, 60000) // 60 requests per minute (allows frequent checks)
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  const adminSession = request.cookies.get('admin_session')?.value
  
  console.log('=== /api/admin/auth/verify called ===')
  console.log('Admin session cookie:', adminSession ? adminSession.substring(0, 20) + '...' : 'NOT FOUND')
  console.log('Admin session cookie full value:', adminSession || 'NOT FOUND')
  
  if (!adminSession) {
    console.log('No admin session cookie found')
    return NextResponse.json({ isAdmin: false }, { status: 200 })
  }
  
  // Verify the session xpub matches ADMIN_XPUB
  const isValidAdmin = getAdminSessionFromCookie(adminSession)
  
  if (!isValidAdmin) {
    const adminXpub = process.env.ADMIN_XPUB
    console.log('Admin session cookie does not match ADMIN_XPUB')
    console.log('Cookie xpub:', adminSession)
    console.log('ADMIN_XPUB from env:', adminXpub ? adminXpub.substring(0, 20) + '...' : 'NOT SET')
    console.log('Match check failed')
    return NextResponse.json({ 
      isAdmin: false,
      reason: 'xpub_mismatch',
      cookieXpub: adminSession,
      adminXpubSet: !!adminXpub
    }, { status: 200 })
  }
  
  console.log('✓ Valid admin session')
  
  return NextResponse.json({ 
    isAdmin: true,
    xpub: adminSession
  })
}

