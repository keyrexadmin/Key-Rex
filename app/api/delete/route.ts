import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub, deleteUser } from '@/lib/storage'

export async function POST(request: NextRequest) {
  const xpub = request.cookies.get('user_xpub')?.value
  
  console.log('=== Delete API called ===')
  console.log('Cookie xpub:', xpub ? xpub.substring(0, 20) + '...' : 'NOT FOUND')
  
  if (!xpub) {
    console.error('No xpub cookie found')
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  
  const user = getUserByXpub(xpub)
  console.log('User found:', user ? 'YES' : 'NO')
  
  // Delete user if they exist, but always delete the cookie
  let deleted = false
  if (user) {
    deleted = deleteUser(xpub)
    console.log('User deleted from storage:', deleted ? 'YES' : 'NO')
  } else {
    console.log('User not found in storage (may have been reset), but proceeding with cookie deletion')
  }
  
  // Always delete the cookies, even if user wasn't found in storage
  // (storage might have been reset, but we still want to log them out)
  // CRITICAL: Must set same path/domain as when cookies were created to ensure deletion works
  const response = NextResponse.json({ success: true, deleted })
  
  // Delete user_xpub cookie with same settings as when it was created
  response.cookies.set('user_xpub', '', {
    expires: new Date(0), // Set to past date to delete
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  
  // CRITICAL: Also delete the subscription backup cookie to prevent old subscription data
  // from being restored to a new user account if they re-sign in
  // Must use same settings as when cookie was created
  response.cookies.set('user_subscription_backup', '', {
    expires: new Date(0), // Set to past date to delete
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  
  // Also clear any auth sessions for this xpub
  const { getAuthSession } = await import('@/lib/storage')
  // Note: We can't easily iterate authSessions to find by xpub, but they expire after 5 minutes anyway
  
  console.log('Cookies deleted (user_xpub and user_subscription_backup), response sent')
  console.log('User deleted from storage:', deleted)
  console.log('CRITICAL: All cookies cleared - user must sign in fresh if they create a new account')
  
  return response
}






