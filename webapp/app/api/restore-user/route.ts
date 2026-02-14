import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub, createUser, updateUser } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    const xpub = request.cookies.get('user_xpub')?.value
    
    if (!xpub) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const body = await request.json()
    const { siteId } = body
    
    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
    }
    
    // Check if user already exists
    let user = await getUserByXpub(xpub)

    if (user) {
      // Update existing user with the specified siteId
      const updated = await updateUser(xpub, { siteId })
      if (updated) {
        return NextResponse.json({ 
          success: true, 
          message: 'User siteId updated',
          user: {
            xpub: updated.xpub.substring(0, 20) + '...',
            siteId: updated.siteId,
          }
        })
      } else {
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
      }
    } else {
      // Create new user with the specified siteId
      user = await createUser(xpub, siteId)
      return NextResponse.json({ 
        success: true, 
        message: 'User created with specified siteId',
        user: {
          xpub: user.xpub.substring(0, 20) + '...',
          siteId: user.siteId,
        }
      })
    }
  } catch (error) {
    console.error('Error restoring user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



