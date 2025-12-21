import { NextRequest, NextResponse } from 'next/server'
import { getActivityLogs, getActivityLogsByType, getActivityLogsByDateRange } from '@/lib/storage'
import { getUserByXpub } from '@/lib/storage'
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
    
    const user = getUserByXpub(xpub)
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
      logs = getActivityLogsByDateRange(xpub, startDate, endDate)
    } else if (type) {
      logs = getActivityLogsByType(xpub, type, limit)
    } else {
      logs = getActivityLogs(xpub, limit)
    }
    
    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Failed to fetch activity logs:', error)
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 })
  }
}





