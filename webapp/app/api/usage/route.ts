import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub, getUsageStats, createUser } from '@/lib/storage'
import { generateSiteId } from '@/lib/utils'
import { verifyCookieData } from '@/lib/cookie-signing'
import { rateLimitMiddleware, getClientIP } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent cost abuse (per-user for authenticated endpoints)
  const xpub = request.cookies.get('user_xpub')?.value
  // Use xpub as identifier if authenticated, otherwise use IP
  const identifier = xpub || getClientIP(request)
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 30, 60000) // 30 requests per minute per user/IP
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  if (!xpub) {
    if (process.env.NODE_ENV === 'development') {
      console.error('No xpub cookie found')
    }
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  
  // SECURITY: Check if user has completed wizard (freeDisclaimerAccepted)
  const backupCookie = request.cookies.get('user_subscription_backup')?.value
  if (backupCookie) {
    const backupData = verifyCookieData(backupCookie)
    if (backupData && !backupData.freeDisclaimerAccepted) {
      return NextResponse.json({ 
        error: 'Wizard not completed. Please complete the onboarding wizard first.',
        wizardRequired: true 
      }, { status: 403 })
    }
  }
  
  // Also check user in storage
  let user = await getUserByXpub(xpub)
  if (user && !user.freeDisclaimerAccepted) {
    return NextResponse.json({
      error: 'Wizard not completed. Please complete the onboarding wizard first.',
      wizardRequired: true
    }, { status: 403 })
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('=== /api/usage called ===')
    console.log('Cookie xpub:', xpub ? xpub.substring(0, 20) + '...' : 'NOT FOUND')
  }
  
  if (!user) {
    console.warn('User not found in storage - this may be due to storage reset')
    // Check if user has a valid xpub cookie - if so, they've authenticated
    // Try to restore from backup cookie or create minimal user
    // Reuse backupCookie from earlier (line 25) - if not set, check again
    const restoreBackupCookie = backupCookie || request.cookies.get('user_subscription_backup')?.value
    if (restoreBackupCookie) {
      // Verify cryptographic signature - returns null if tampered
      const backup = verifyCookieData(restoreBackupCookie)
      if (backup) {
        try {
          console.log('Found subscription backup, creating user with backup data')
          const siteId = generateSiteId()
          user = await createUser(xpub, siteId)
          // Restore subscription data from backup
          const { updateUser } = await import('@/lib/storage')
          user = await updateUser(xpub, {
            subscribed: backup.subscribed || false,
            subscriptionTier: backup.subscriptionTier || 'free',
            allowedDomains: backup.allowedDomains || [],
            needsCodeUpdate: backup.needsCodeUpdate || false,
            freeDisclaimerAccepted: backup.freeDisclaimerAccepted || false,
            freeDisclaimerAcceptedAt: backup.freeDisclaimerAcceptedAt,
            freeDisclaimerAcceptedIp: backup.freeDisclaimerAcceptedIp,
            freeDisclaimerAcceptedUserAgent: backup.freeDisclaimerAcceptedUserAgent,
            customButtonText: backup.customButtonText,
          })
          console.log('User restored from backup cookie for usage stats')
        } catch (e) {
          console.error('Failed to restore user from backup:', e)
        }
      } else {
        console.error('✗ SECURITY ALERT: Backup cookie signature verification FAILED in /api/usage - possible tampering!')
      }
    }
    
    if (!user) {
      console.error('User not found and could not be restored')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
  }
  
  console.log('User found, siteId:', user.siteId)
  const stats = await getUsageStats(user.siteId)
  console.log('Usage stats:', {
    currentMonth: stats.currentMonth,
    yearToDate: stats.yearToDate,
    allTime: stats.allTime,
  })
  
  // Get daily data for last 30 days
  const dailyData: Array<{ date: string; count: number; uniqueUsers: number }> = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const count = stats.dailyLogins.get(dateKey) || 0
    const uniqueUsers = stats.dailyUniqueUsers.get(dateKey)?.size || 0
    dailyData.push({
      date: dateKey,
      count,
      uniqueUsers,
    })
  }
  
  // Get last 7 days for chart
  const last7Days = dailyData.slice(-7)
  
  // Get domain breakdown
  const domainBreakdown: Array<{ domain: string; totalLogins: number; uniqueUsers: number }> = []
  for (const [domain, count] of stats.domainLogins.entries()) {
    domainBreakdown.push({
      domain,
      totalLogins: count,
      uniqueUsers: stats.domainUniqueUsers.get(domain)?.size || 0,
    })
  }
  // Sort by total logins (descending)
  domainBreakdown.sort((a, b) => b.totalLogins - a.totalLogins)
  
  // Get hourly pattern for today
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const hourlyData: Array<{ hour: number; count: number }> = []
  for (let hour = 0; hour < 24; hour++) {
    const hourKey = `${todayKey}-${String(hour).padStart(2, '0')}`
    hourlyData.push({
      hour,
      count: stats.hourlyLogins.get(hourKey) || 0,
    })
  }
  
  // Get wallet breakdown
  const walletBreakdown: Array<{ wallet: string; totalLogins: number; uniqueUsers: number }> = []
  for (const [wallet, count] of stats.walletLogins.entries()) {
    walletBreakdown.push({
      wallet,
      totalLogins: count,
      uniqueUsers: stats.walletUniqueUsers.get(wallet)?.size || 0,
    })
  }
  // Sort by total logins (descending)
  walletBreakdown.sort((a, b) => b.totalLogins - a.totalLogins)
  
  // Get last 7 days hourly pattern (aggregate)
  const last7DaysHourly: Map<number, number> = new Map()
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    for (let hour = 0; hour < 24; hour++) {
      const hourKey = `${dateKey}-${String(hour).padStart(2, '0')}`
      const count = stats.hourlyLogins.get(hourKey) || 0
      last7DaysHourly.set(hour, (last7DaysHourly.get(hour) || 0) + count)
    }
  }
  const last7DaysHourlyArray = Array.from(last7DaysHourly.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour - b.hour)
  
  // New vs Returning Users
  const newUsers = stats.firstTimeLogins.size
  const returningUsers = Array.from(stats.userLoginCount.entries()).filter(([_, count]) => count > 1).length
  const totalUniqueUsers = stats.uniquePubkeys.size
  const newUserPercentage = totalUniqueUsers > 0 ? Math.round((newUsers / totalUniqueUsers) * 100) : 0
  const returningUserPercentage = totalUniqueUsers > 0 ? Math.round((returningUsers / totalUniqueUsers) * 100) : 0
  
  // Day of Week breakdown
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayOfWeekBreakdown: Array<{ day: string; dayNumber: number; totalLogins: number; uniqueUsers: number }> = []
  for (let day = 0; day < 7; day++) {
    const count = stats.dayOfWeekLogins.get(day) || 0
    const uniqueUsers = stats.dayOfWeekUniqueUsers.get(day)?.size || 0
    if (count > 0 || uniqueUsers > 0) {
      dayOfWeekBreakdown.push({
        day: dayNames[day],
        dayNumber: day,
        totalLogins: count,
        uniqueUsers,
      })
    }
  }
  // Sort by day number (Sunday = 0 to Saturday = 6)
  dayOfWeekBreakdown.sort((a, b) => a.dayNumber - b.dayNumber)
  
  // Browser breakdown
  const browserBreakdown: Array<{ browser: string; totalLogins: number; uniqueUsers: number }> = []
  for (const [browser, count] of stats.browserLogins.entries()) {
    browserBreakdown.push({
      browser,
      totalLogins: count,
      uniqueUsers: stats.browserUniqueUsers.get(browser)?.size || 0,
    })
  }
  browserBreakdown.sort((a, b) => b.totalLogins - a.totalLogins)
  
  // Device Type breakdown
  const deviceBreakdown: Array<{ deviceType: string; totalLogins: number; uniqueUsers: number }> = []
  for (const [deviceType, count] of stats.deviceTypeLogins.entries()) {
    deviceBreakdown.push({
      deviceType: deviceType.charAt(0).toUpperCase() + deviceType.slice(1),
      totalLogins: count,
      uniqueUsers: stats.deviceTypeUniqueUsers.get(deviceType)?.size || 0,
    })
  }
  deviceBreakdown.sort((a, b) => b.totalLogins - a.totalLogins)
  
  // Growth Metrics - Week over Week
  const now = new Date()
  const lastWeekStart = new Date(now)
  lastWeekStart.setDate(now.getDate() - 14) // 2 weeks ago
  const lastWeekEnd = new Date(now)
  lastWeekEnd.setDate(now.getDate() - 7) // 1 week ago
  const thisWeekStart = new Date(now)
  thisWeekStart.setDate(now.getDate() - 7) // 1 week ago
  
  let lastWeekLogins = 0
  let thisWeekLogins = 0
  for (const [dateKey, count] of stats.dailyLogins.entries()) {
    const date = new Date(dateKey)
    if (date >= lastWeekStart && date < lastWeekEnd) {
      lastWeekLogins += count
    } else if (date >= thisWeekStart && date <= now) {
      thisWeekLogins += count
    }
  }
  const wowGrowth = lastWeekLogins > 0 
    ? Math.round(((thisWeekLogins - lastWeekLogins) / lastWeekLogins) * 100) 
    : (thisWeekLogins > 0 ? 100 : 0)
  
  // Growth Metrics - Month over Month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  
  let lastMonthLogins = 0
  let thisMonthLogins = stats.currentMonth // Already calculated
  for (const [monthKey, pubkeys] of stats.monthlyPubkeys.entries()) {
    const [year, month] = monthKey.split('-').map(Number)
    const monthDate = new Date(year, month, 1)
    if (monthDate >= lastMonthStart && monthDate < lastMonthEnd) {
      lastMonthLogins += pubkeys.size
    }
  }
  const momGrowth = lastMonthLogins > 0
    ? Math.round(((thisMonthLogins - lastMonthLogins) / lastMonthLogins) * 100)
    : (thisMonthLogins > 0 ? 100 : 0)
  
  // User Retention Rate (7-day and 30-day)
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 7)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)
  
  let sevenDayRetention = 0
  let thirtyDayRetention = 0
  let sevenDayRetentionUsers = 0
  let thirtyDayRetentionUsers = 0
  
  for (const [pubkey, firstLoginTime] of stats.userFirstLoginDate.entries()) {
    const firstLogin = new Date(firstLoginTime)
    const lastLogin = stats.userLastLoginDate.get(pubkey)
    
    if (lastLogin) {
      const lastLoginDate = new Date(lastLogin)
      const daysSinceFirst = Math.floor((now.getTime() - firstLogin.getTime()) / (1000 * 60 * 60 * 24))
      
      // 7-day retention: users who logged in within 7 days of their first login
      if (daysSinceFirst <= 7 && lastLoginDate >= sevenDaysAgo) {
        sevenDayRetentionUsers++
      }
      
      // 30-day retention: users who logged in within 30 days of their first login
      if (daysSinceFirst <= 30 && lastLoginDate >= thirtyDaysAgo) {
        thirtyDayRetentionUsers++
      }
    }
  }
  
  const totalNewUsers = stats.firstTimeLogins.size
  sevenDayRetention = totalNewUsers > 0 ? Math.round((sevenDayRetentionUsers / totalNewUsers) * 100) : 0
  thirtyDayRetention = totalNewUsers > 0 ? Math.round((thirtyDayRetentionUsers / totalNewUsers) * 100) : 0
  
  return NextResponse.json({
    currentMonth: stats.currentMonth,
    yearToDate: stats.yearToDate,
    allTime: stats.allTime,
    // Daily data
    dailyData: last7Days,
    last30Days: dailyData,
    // Domain breakdown
    domainBreakdown,
    // Hourly patterns
    todayHourly: hourlyData,
    last7DaysHourly: last7DaysHourlyArray,
    // Historical data
    loginHistory: stats.loginHistory.slice(-90), // Last 90 days
    // Wallet breakdown
    walletBreakdown,
    // New vs Returning Users
    newUsers,
    returningUsers,
    newUserPercentage,
    returningUserPercentage,
    // Day of Week breakdown
    dayOfWeekBreakdown,
    // Browser breakdown
    browserBreakdown,
    // Device breakdown
    deviceBreakdown,
    // Growth metrics
    wowGrowth,
    momGrowth,
    lastWeekLogins,
    thisWeekLogins,
    lastMonthLogins,
    thisMonthLogins,
    // Retention metrics
    sevenDayRetention,
    thirtyDayRetention,
    sevenDayRetentionUsers,
    thirtyDayRetentionUsers,
  })
}



