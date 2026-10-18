import { getUserSession } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub, getAllUsers, getUserBySiteId } from '@/lib/storage'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  try {
    const xpub = getUserSession(request)
    const searchParams = request.nextUrl.searchParams
    const siteId = searchParams.get('siteId')
    
    const result: any = {
      timestamp: new Date().toISOString(),
      totalUsers: 0,
      allSiteIds: [],
      userByXpub: null,
      userBySiteId: null,
    }
    
    // Get all users
    const allUsers = await getAllUsers()
    result.totalUsers = allUsers.length
    result.allSiteIds = allUsers.map(u => ({
      siteId: u.siteId,
      xpub: u.xpub.substring(0, 20) + '...',
      createdAt: new Date(u.createdAt).toISOString(),
    }))

    // Check by xpub if provided
    if (xpub) {
      const user = await getUserByXpub(xpub)
      if (user) {
        result.userByXpub = {
          siteId: user.siteId,
          xpub: user.xpub.substring(0, 20) + '...',
          subscribed: user.subscribed,
          freeDisclaimerAccepted: user.freeDisclaimerAccepted,
          allowedDomains: user.allowedDomains,
        }
      } else {
        result.userByXpub = 'NOT FOUND'
      }
    }
    
    // Check by siteId if provided
    if (siteId) {
      const user = await getUserBySiteId(siteId)
      if (user) {
        result.userBySiteId = {
          siteId: user.siteId,
          xpub: user.xpub.substring(0, 20) + '...',
          subscribed: user.subscribed,
          freeDisclaimerAccepted: user.freeDisclaimerAccepted,
          allowedDomains: user.allowedDomains,
        }
      } else {
        result.userBySiteId = 'NOT FOUND'
      }
    }
    
    return NextResponse.json(result, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error in debug user endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



