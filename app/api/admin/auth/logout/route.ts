import { NextRequest, NextResponse } from 'next/server'

/**
 * Admin Logout API Route
 * 
 * Clears the admin session cookie.
 */
export async function POST(request: NextRequest) {
  console.log('=== /api/admin/auth/logout called ===')
  
  const response = NextResponse.json({ success: true })
  
  // Clear admin session cookie
  response.cookies.set('admin_session', '', {
    expires: new Date(0),
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  
  console.log('Admin session cookie cleared')
  
  return response
}





