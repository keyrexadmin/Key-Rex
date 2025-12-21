import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/storage'

// Test endpoint to check if auth sessions are being stored
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const k1 = searchParams.get('k1')
  
  if (k1) {
    const xpub = getAuthSession(k1)
    return NextResponse.json({ 
      k1: k1.substring(0, 20) + '...',
      xpub: xpub ? xpub.substring(0, 20) + '...' : 'NOT FOUND',
      found: !!xpub
    })
  }
  
  // Return info about auth sessions
  return NextResponse.json({ 
    message: 'No k1 provided. Provide ?k1=... to check specific session',
    note: 'This endpoint is for debugging only'
  })
}

