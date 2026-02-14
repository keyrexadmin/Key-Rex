import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub, updateUser, createUser } from '@/lib/storage'
import { signCookieData, verifyCookieData } from '@/lib/cookie-signing'
import { generateSiteId } from '@/lib/utils'
import { rateLimitMiddleware, getClientIP } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // SECURITY: Rate limiting - prevent cost abuse (per-user, stricter for write operations)
  const xpub = request.cookies.get('user_xpub')?.value
  const identifier = xpub || getClientIP(request)
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 5, 60000) // 5 requests per minute per user/IP (stricter for writes)
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  try {
    if (!xpub) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // SECURITY: Check if user has completed wizard (freeDisclaimerAccepted)
    const backupCookie = request.cookies.get('user_subscription_backup')?.value
    if (backupCookie) {
      const backupData = verifyCookieData(backupCookie)
      if (backupData && !backupData.freeDisclaimerAccepted) {
        return NextResponse.json({ 
          error: 'Wizard not completed. Please complete the onboarding wizard first.',
          wizardRequired: true 
        }, { status: 403 })
      }
    }

    let user = await getUserByXpub(xpub)

    // SECURITY: If user exists in storage, check wizard completion
    if (user && !user.freeDisclaimerAccepted) {
      return NextResponse.json({
        error: 'Wizard not completed. Please complete the onboarding wizard first.',
        wizardRequired: true
      }, { status: 403 })
    }
    if (!user) {
      console.warn('User not found in storage - this may be due to storage reset')
      // Check if user has a valid xpub cookie - if so, they've authenticated
      // Try to restore from backup cookie or create minimal user
      const backupCookie = request.cookies.get('user_subscription_backup')?.value
      if (backupCookie) {
        // Verify cryptographic signature - returns null if tampered
        const backup = verifyCookieData(backupCookie)
        if (backup) {
          console.log('✓ Found and verified subscription backup (signature valid), creating user with backup data')
          // Use siteId from backup if available, otherwise generate new one
          const siteId = (backup as any).siteId || generateSiteId()
          user = await createUser(xpub, siteId)
          // Restore subscription data from backup
          user = await updateUser(xpub, {
            subscribed: backup.subscribed || false,
            subscriptionTier: 'free',
            allowedDomains: backup.allowedDomains || [],
            freeDisclaimerAccepted: backup.freeDisclaimerAccepted || false,
            freeDisclaimerAcceptedAt: backup.freeDisclaimerAcceptedAt,
            freeDisclaimerAcceptedIp: backup.freeDisclaimerAcceptedIp,
            freeDisclaimerAcceptedUserAgent: backup.freeDisclaimerAcceptedUserAgent,
            integrationEnabled: backup.integrationEnabled ?? true,
          })
          console.log('User restored from backup cookie')
        } else {
          console.error('✗ SECURITY ALERT: Backup cookie signature verification FAILED - possible tampering!')
          console.error('  Cookie will be IGNORED for security reasons')
        }
      }
      
      // If still no user, create a minimal user (user has valid xpub cookie, so they're authenticated)
      if (!user) {
        console.log('No backup cookie found or invalid - creating minimal user')
        const siteId = generateSiteId()
        user = await createUser(xpub, siteId)
        console.log('Minimal user created with siteId:', siteId)
      }
      
      if (!user) {
        return NextResponse.json({ error: 'User not found. Please sign in again.' }, { status: 404 })
      }
    }

    const body = await request.json()
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request. enabled must be a boolean' }, { status: 400 })
    }

    // Update user's integration enabled status
    const updatedUser = await updateUser(xpub, { integrationEnabled: enabled })

    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    // Update backup cookie for persistence
    const subscriptionBackup = {
      xpub: updatedUser.xpub,
      siteId: updatedUser.siteId,
      subscribed: updatedUser.subscribed,
      subscriptionTier: updatedUser.subscriptionTier,
      allowedDomains: updatedUser.allowedDomains || [],
      freeDisclaimerAccepted: updatedUser.freeDisclaimerAccepted || false,
      freeDisclaimerAcceptedAt: updatedUser.freeDisclaimerAcceptedAt,
      freeDisclaimerAcceptedIp: updatedUser.freeDisclaimerAcceptedIp,
      freeDisclaimerAcceptedUserAgent: updatedUser.freeDisclaimerAcceptedUserAgent,
      integrationEnabled: updatedUser.integrationEnabled ?? true,
    }

    const response = NextResponse.json({ 
      success: true, 
      integrationEnabled: updatedUser.integrationEnabled 
    })
    
    const signedBackup = signCookieData(subscriptionBackup)
    response.cookies.set('user_subscription_backup', signedBackup, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Error toggling integration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

