import { NextRequest, NextResponse } from 'next/server'
import { getAdminSessionFromCookie } from '@/lib/admin-auth'
import { getAllUsers, getUsageStats } from '@/lib/storage'
import { rateLimitMiddleware } from '@/lib/rate-limit'

/**
 * Admin Analytics API Route
 * 
 * Returns aggregate analytics across all users (admin only)
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
    const users = await getAllUsers()

    // Aggregate daily logins across all users
    const dailyLoginsMap = new Map<string, number>()
    const dailyUniqueUsersMap = new Map<string, Set<string>>()
    const walletLoginsMap = new Map<string, number>()
    const walletUniqueUsersMap = new Map<string, Set<string>>()
    const domainLoginsMap = new Map<string, number>()
    const browserLoginsMap = new Map<string, number>()
    const deviceTypeLoginsMap = new Map<string, number>()

    // Aggregate stats from all users
    for (const user of users) {
      const usage = await getUsageStats(user.siteId)
      
      // Aggregate daily logins
      for (const [date, count] of usage.dailyLogins.entries()) {
        dailyLoginsMap.set(date, (dailyLoginsMap.get(date) || 0) + count)
        
        // Aggregate unique users per day
        const dayUniqueUsers = usage.dailyUniqueUsers.get(date)
        if (dayUniqueUsers) {
          if (!dailyUniqueUsersMap.has(date)) {
            dailyUniqueUsersMap.set(date, new Set())
          }
          dayUniqueUsers.forEach(pubkey => dailyUniqueUsersMap.get(date)!.add(pubkey))
        }
      }
      
      // Aggregate wallet usage
      for (const [wallet, count] of usage.walletLogins.entries()) {
        walletLoginsMap.set(wallet, (walletLoginsMap.get(wallet) || 0) + count)
        
        const walletUsers = usage.walletUniqueUsers.get(wallet)
        if (walletUsers) {
          if (!walletUniqueUsersMap.has(wallet)) {
            walletUniqueUsersMap.set(wallet, new Set())
          }
          walletUsers.forEach(pubkey => walletUniqueUsersMap.get(wallet)!.add(pubkey))
        }
      }
      
      // Aggregate domain usage
      for (const [domain, count] of usage.domainLogins.entries()) {
        domainLoginsMap.set(domain, (domainLoginsMap.get(domain) || 0) + count)
      }
      
      // Aggregate browser usage
      for (const [browser, count] of usage.browserLogins.entries()) {
        browserLoginsMap.set(browser, (browserLoginsMap.get(browser) || 0) + count)
      }
      
      // Aggregate device type usage
      for (const [deviceType, count] of usage.deviceTypeLogins.entries()) {
        deviceTypeLoginsMap.set(deviceType, (deviceTypeLoginsMap.get(deviceType) || 0) + count)
      }
    }
    
    // Get daily data for last 30 days
    const today = new Date()
    const dailyData: Array<{ date: string; logins: number; uniqueUsers: number }> = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const logins = dailyLoginsMap.get(dateKey) || 0
      const uniqueUsers = dailyUniqueUsersMap.get(dateKey)?.size || 0
      dailyData.push({
        date: dateKey,
        logins,
        uniqueUsers,
      })
    }
    
    // Format wallet breakdown
    const walletBreakdown = Array.from(walletLoginsMap.entries())
      .map(([wallet, count]) => ({
        wallet,
        logins: count,
        uniqueUsers: walletUniqueUsersMap.get(wallet)?.size || 0,
      }))
      .sort((a, b) => b.logins - a.logins)
    
    // Format domain breakdown
    const domainBreakdown = Array.from(domainLoginsMap.entries())
      .map(([domain, count]) => ({
        domain,
        logins: count,
      }))
      .sort((a, b) => b.logins - a.logins)
    
    // Format browser breakdown
    const browserBreakdown = Array.from(browserLoginsMap.entries())
      .map(([browser, count]) => ({
        browser,
        logins: count,
      }))
      .sort((a, b) => b.logins - a.logins)
    
    // Format device type breakdown
    const deviceTypeBreakdown = Array.from(deviceTypeLoginsMap.entries())
      .map(([deviceType, count]) => ({
        deviceType,
        logins: count,
      }))
      .sort((a, b) => b.logins - a.logins)
    
    return NextResponse.json({
      dailyData,
      walletBreakdown,
      domainBreakdown,
      browserBreakdown,
      deviceTypeBreakdown,
    })
  } catch (error) {
    console.error('Error fetching admin analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}





