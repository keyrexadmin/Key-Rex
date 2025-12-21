import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Delete the session cookie
  const response = NextResponse.json({ success: true })
  response.cookies.delete('user_xpub')
  
  console.log('User logged out, cookie deleted')
  
  return response
}


