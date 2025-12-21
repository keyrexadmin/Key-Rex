import { NextResponse } from 'next/server'
import { getAllUsers } from '@/lib/storage'

export async function GET() {
  const users = getAllUsers()
  const userInfo = users.map(u => ({
    xpub: u.xpub.substring(0, 20) + '...',
    siteId: u.siteId,
    subscribed: u.subscribed,
    allowedDomains: u.allowedDomains,
  }))
  
  return NextResponse.json({
    totalUsers: users.length,
    users: userInfo,
  })
}



