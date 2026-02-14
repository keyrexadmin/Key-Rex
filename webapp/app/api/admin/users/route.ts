import { NextRequest, NextResponse } from 'next/server'
import { getAdminSessionFromCookie } from '@/lib/admin-auth'
import { getAllUsers } from '@/lib/storage'
import { rateLimitMiddleware } from '@/lib/rate-limit'

/**
 * Admin Users API Route
 * 
 * Returns list of all users (admin only)
 */
export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent cost abuse (per-admin)
  const adminSession = request.cookies.get('admin_session')?.value
  const identifier = adminSession || 'anonymous'
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 30, 60000) // 30 requests per minute per admin
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  // Verify admin session
  if (!adminSession || !getAdminSessionFromCookie(adminSession)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    // Get all users from storage
    const users = await getAllUsers()
    
    // Format for response
    const usersList = users.map(user => ({
      xpub: user.xpub,
      siteId: user.siteId,
      subscribed: user.subscribed,
      subscriptionTier: user.subscriptionTier || 'free',
      allowedDomains: user.allowedDomains || [],
      freeDisclaimerAccepted: user.freeDisclaimerAccepted || false,
      freeDisclaimerAcceptedAt: user.freeDisclaimerAcceptedAt,
      integrationEnabled: user.integrationEnabled !== false,
      createdAt: user.createdAt,
    }))
    
    return NextResponse.json({
      users: usersList,
      total: usersList.length,
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

