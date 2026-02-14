import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub, updateUser } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    const xpub = request.cookies.get('user_xpub')?.value
    
    if (!xpub) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const user = await getUserByXpub(xpub)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Reset wizard completion status
    const updated = await updateUser(xpub, {
      freeDisclaimerAccepted: false,
      freeDisclaimerAcceptedAt: undefined,
      freeDisclaimerAcceptedIp: undefined,
      freeDisclaimerAcceptedUserAgent: undefined,
    })
    
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Wizard completion status reset',
      user: {
        xpub: updated.xpub.substring(0, 20) + '...',
        freeDisclaimerAccepted: updated.freeDisclaimerAccepted,
      }
    })
  } catch (error) {
    console.error('Error resetting wizard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



