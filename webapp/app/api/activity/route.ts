import { NextRequest, NextResponse } from 'next/server'
import { getActivityLogs, getActivityLogsByType, getActivityLogsByDateRange } from '@/lib/storage'
import { getUserByXpub } from '@/lib/storage'
import { verifyCookieData } from '@/lib/cookie-signing'
import { rateLimitMiddleware, getClientIP } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent cost abuse (per-user for authenticated endpoints)
  const xpub = request.cookies.get('user_xpub')?.value
  const identifier = xpub || getClientIP(request)
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 30, 60000) // 30 requests per minute per user/IP
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  try {
  if (!xpub) {
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
  
  const user = await getUserByXpub(xpub)

  // SECURITY: If user exists in storage, check wizard completion
  if (user && !user.freeDisclaimerAccepted) {
    return NextResponse.json({
      error: 'Wizard not completed. Please complete the onboarding wizard first.',
      wizardRequired: true
    }, { status: 403 })
  }
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') as any
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const startDate = searchParams.get('startDate') ? parseInt(searchParams.get('startDate')!) : undefined
    const endDate = searchParams.get('endDate') ? parseInt(searchParams.get('endDate')!) : undefined

    let logs

    if (startDate && endDate) {
      logs = await getActivityLogsByDateRange(xpub, startDate, endDate)
    } else if (type) {
      logs = await getActivityLogsByType(xpub, type, limit)
    } else {
      logs = await getActivityLogs(xpub, limit)
    }
    
    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Failed to fetch activity logs:', error)
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 })
  }
}





