import { NextRequest, NextResponse } from 'next/server'
import { getAdminSessionFromCookie } from '@/lib/admin-auth'
import { getAllUsers, getAllContactSubmissions, getUsageStats } from '@/lib/storage'

/**
 * Admin Stats API Route
 * 
 * Returns system-wide statistics (admin only)
 */
export async function GET(request: NextRequest) {
  // Verify admin session
  const adminSession = request.cookies.get('admin_session')?.value
  if (!adminSession || !getAdminSessionFromCookie(adminSession)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const users = getAllUsers()
    const contactSubmissions = getAllContactSubmissions()
    
    // Calculate aggregate stats from all users
    let totalDomains = 0
    let totalLogins = 0
    let activeUsers = 0
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000
    
    // Aggregate usage stats from all users
    for (const user of users) {
      totalDomains += (user.allowedDomains || []).length
      
      const usage = getUsageStats(user.siteId)
      if (usage) {
        totalLogins += usage.allTime
        // Check if user has logged in recently (within last 30 days)
        if (user.createdAt > oneMonthAgo || (usage.userLastLoginDate && Array.from(usage.userLastLoginDate.values()).some(date => date > oneMonthAgo))) {
          activeUsers++
        }
      }
    }
    
    // Calculate recent activity
    const recentLogins = 0 // Will be calculated from usage stats if needed
    const unreadContacts = contactSubmissions.filter(sub => sub.status === 'unread').length
    
    return NextResponse.json({
      totalUsers: users.length,
      totalDomains,
      totalLogins,
      activeUsers,
      recentLogins,
      totalContactSubmissions: contactSubmissions.length,
      unreadContacts,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

