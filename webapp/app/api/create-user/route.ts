import { getUserSession } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub, createUser, getAllUsers } from '@/lib/storage'
import { generateSiteId } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const xpub = getUserSession(request)
    
    if (!xpub) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    console.log('=== /api/create-user called ===')
    console.log('xpub:', xpub.substring(0, 20) + '...')
    
    // Check if user already exists
    let user = await getUserByXpub(xpub)
    console.log('User exists?', !!user)

    if (user) {
      console.log('User already exists with siteId:', user.siteId)
      const allUsers = await getAllUsers()
      return NextResponse.json({
        success: true,
        message: 'User already exists',
        user: {
          xpub: user.xpub.substring(0, 20) + '...',
          siteId: user.siteId,
        },
        allUsers: allUsers.map(u => ({
          siteId: u.siteId,
          xpub: u.xpub.substring(0, 20) + '...',
        }))
      })
    }
    
    // Create new user
    const siteId = generateSiteId()
    console.log('Creating user with siteId:', siteId)
    user = await createUser(xpub, siteId)

    // Verify it was created
    const verify = await getUserByXpub(xpub)
    console.log('User created?', !!verify)
    const allUsersAfterCreate = await getAllUsers()
    console.log('Total users in storage:', allUsersAfterCreate.length)
    console.log('All siteIds:', allUsersAfterCreate.map(u => u.siteId))
    
    if (!verify) {
      return NextResponse.json({ error: 'Failed to create user - user not found after creation' }, { status: 500 })
    }
    
    const finalUsers = await getAllUsers()
    return NextResponse.json({
      success: true,
      message: 'User created',
      user: {
        xpub: user.xpub.substring(0, 20) + '...',
        siteId: user.siteId,
      },
      allUsers: finalUsers.map(u => ({
        siteId: u.siteId,
        xpub: u.xpub.substring(0, 20) + '...',
      }))
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}



