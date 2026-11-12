import { getUserSession } from '@/lib/session'
import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub, updateUser } from '@/lib/storage'
import { signCookieData, verifyCookieData } from '@/lib/cookie-signing'

export async function POST(request: NextRequest) {
  const xpub = getUserSession(request)
  
  console.log('=== Disclaimer Acceptance API called ===')
  console.log('Cookie xpub:', xpub ? xpub.substring(0, 20) + '...' : 'NOT FOUND')
  
  if (!xpub) {
    console.error('No xpub cookie found')
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  
  let user = await getUserByXpub(xpub)
  if (!user) {
    console.error('User not found in storage, checking backup cookie...')
    // Check backup cookie - user might have been created but storage reset
    const backupCookie = request.cookies.get('user_subscription_backup')?.value
    if (backupCookie) {
      const backupData = verifyCookieData(backupCookie)
      if (backupData) {
        console.log('Found user data in backup cookie, creating user from backup...')
        // Import createUser and generateSiteId
        const { createUser } = await import('@/lib/storage')
        const { generateSiteId } = await import('@/lib/utils')
        // Create user from backup data
        user = await createUser(xpub, generateSiteId())
        // Restore subscription data from backup
        if (backupData.subscriptionTier) {
          user.subscriptionTier = backupData.subscriptionTier
        }
        if (backupData.subscribed !== undefined) {
          user.subscribed = backupData.subscribed
        }
        if (backupData.allowedDomains) {
          user.allowedDomains = backupData.allowedDomains
        }
        console.log('User created from backup cookie')
      }
    }
    
    if (!user) {
      console.error('User not found in storage or backup cookie')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
  }
  
  // Get IP address from request headers
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
  
  // Get User Agent for audit trail
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  // Get current timestamp
  const timestamp = Date.now()
  
  // Store acceptance with timestamp, IP, and User Agent
  const updated = await updateUser(xpub, {
    freeDisclaimerAccepted: true,
    freeDisclaimerAcceptedAt: timestamp,
    freeDisclaimerAcceptedIp: ip,
    freeDisclaimerAcceptedUserAgent: userAgent,
  })
  
  if (!updated) {
    console.error('Failed to update user with disclaimer acceptance')
    return NextResponse.json({ error: 'Failed to save acceptance' }, { status: 500 })
  }
  
  console.log('Disclaimer accepted by user:', xpub.substring(0, 20) + '...')
  console.log('IP address:', ip)
  console.log('User Agent:', userAgent)
  console.log('Timestamp:', timestamp, '(', new Date(timestamp).toISOString(), ')')
  console.log('✓ Stored in database: xpub, timestamp, IP address, User Agent, freeDisclaimerAccepted=true')
  
  // Update backup cookie to include disclaimer acceptance
  const backupCookie = request.cookies.get('user_subscription_backup')?.value
  let backupData = null
  if (backupCookie) {
    // Verify cryptographic signature - returns null if tampered
    backupData = verifyCookieData(backupCookie)
    if (!backupData) {
      console.error('✗ SECURITY ALERT: Backup cookie signature verification FAILED during disclaimer acceptance - possible tampering!')
      // Continue with request but log the security issue
    }
  }
  
  const updatedBackup = {
    subscribed: updated.subscribed,
    subscriptionTier: updated.subscriptionTier,
    allowedDomains: updated.allowedDomains || [],
    freeDisclaimerAccepted: true,
    freeDisclaimerAcceptedAt: timestamp,
    freeDisclaimerAcceptedIp: ip,
    freeDisclaimerAcceptedUserAgent: userAgent,
    integrationEnabled: updated.integrationEnabled ?? true,
  }
  
  // If we had valid backup data, preserve other fields
  if (backupData) {
    updatedBackup.subscribed = backupData.subscribed !== undefined ? backupData.subscribed : updated.subscribed
    updatedBackup.subscriptionTier = backupData.subscriptionTier || updated.subscriptionTier
    updatedBackup.allowedDomains = backupData.allowedDomains || updated.allowedDomains || []
    updatedBackup.integrationEnabled = backupData.integrationEnabled !== undefined ? backupData.integrationEnabled : (updated.integrationEnabled ?? true)
  }
  
  const response = NextResponse.json({ 
    success: true, 
    user: updated,
    acceptedAt: new Date(timestamp).toISOString(),
    acceptedAtTimestamp: timestamp,
    ipAddress: ip,
    userAgent: userAgent
  })
  
  // Update backup cookie with cryptographic signing and httpOnly for security
  const signedBackup = signCookieData(updatedBackup)
  response.cookies.set('user_subscription_backup', signedBackup, {
    httpOnly: true, // CRITICAL: Prevent client-side access to prevent tampering
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    secure: process.env.NODE_ENV === 'production',
  })
  
  // Log disclaimer acceptance for audit purposes
  console.log('=== DISCLAIMER ACCEPTANCE AUDIT LOG ===')
  console.log('User xpub:', xpub.substring(0, 20) + '...')
  console.log('Timestamp:', timestamp, '(', new Date(timestamp).toISOString(), ')')
  console.log('IP Address:', ip)
  console.log('User Agent:', userAgent)
  console.log('Acceptance stored in database and signed cookie')
  console.log('All data retrievable via: getUserByXpub(xpub) or /api/user endpoint')
  console.log('========================================')
  
  console.log('✓ Disclaimer acceptance saved and backup cookie updated')
  
  return response
}

