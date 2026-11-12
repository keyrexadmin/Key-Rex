import { getAdminSession } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSessionFromCookie } from '@/lib/admin-auth'
import { getUserByXpub, getUsageStats, getActivityLogs } from '@/lib/storage'
import { rateLimitMiddleware } from '@/lib/rate-limit'

/**
 * Admin User Detail API Route
 * 
 * Returns detailed information about a specific user (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ xpub: string }> }
) {
  // SECURITY: Rate limiting - prevent cost abuse (per-admin)
  const adminSession = getAdminSession(request)
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
    const resolvedParams = await params
    const xpub = decodeURIComponent(resolvedParams.xpub)
    const user = await getUserByXpub(xpub)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get usage stats
    const usage = await getUsageStats(user.siteId)

    // Get activity logs
    const activityLogs = await getActivityLogs(xpub, 50) // Last 50 activities
    
    // Format daily data for last 30 days
    const today = new Date()
    const dailyData: Array<{ date: string; logins: number; uniqueUsers: number }> = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const logins = usage.dailyLogins.get(dateKey) || 0
      const uniqueUsers = usage.dailyUniqueUsers.get(dateKey)?.size || 0
      dailyData.push({
        date: dateKey,
        logins,
        uniqueUsers,
      })
    }
    
    // Format domain breakdown
    const domainBreakdown = Array.from(usage.domainLogins.entries())
      .map(([domain, count]) => ({
        domain,
        logins: count,
        uniqueUsers: usage.domainUniqueUsers.get(domain)?.size || 0,
      }))
      .sort((a, b) => b.logins - a.logins)
    
    // Format wallet breakdown
    const walletBreakdown = Array.from(usage.walletLogins.entries())
      .map(([wallet, count]) => ({
        wallet,
        logins: count,
        uniqueUsers: usage.walletUniqueUsers.get(wallet)?.size || 0,
      }))
      .sort((a, b) => b.logins - a.logins)
    
    return NextResponse.json({
      user: {
        xpub: user.xpub,
        siteId: user.siteId,
        subscribed: user.subscribed,
        subscriptionTier: user.subscriptionTier || 'free',
        allowedDomains: user.allowedDomains || [],
        freeDisclaimerAccepted: user.freeDisclaimerAccepted || false,
        freeDisclaimerAcceptedAt: user.freeDisclaimerAcceptedAt,
        integrationEnabled: user.integrationEnabled !== false,
        createdAt: user.createdAt,
      },
      stats: {
        allTime: usage.allTime,
        currentMonth: usage.currentMonth,
        yearToDate: usage.yearToDate,
        uniqueUsers: usage.uniquePubkeys.size,
      },
      dailyData,
      domainBreakdown,
      walletBreakdown,
      activityLogs,
    })
  } catch (error) {
    console.error('Error fetching user details:', error)
    return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 })
  }
}





