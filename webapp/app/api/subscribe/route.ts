import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub, updateUser, normalizeDomain, addDomain, createUser, addDomainVerification, updateDomainVerification } from '@/lib/storage'
import { signCookieData, verifyCookieData } from '@/lib/cookie-signing'
import { generateSiteId, validateDomain, isTestDomain } from '@/lib/utils'
import { rateLimitMiddleware, getClientIP } from '@/lib/rate-limit'
import { generateVerificationToken } from '@/lib/domain-verification'

export async function POST(request: NextRequest) {
  // SECURITY: Rate limiting - prevent subscription abuse (per-user for authenticated endpoints)
  const xpub = request.cookies.get('user_xpub')?.value
  const identifier = xpub || getClientIP(request)
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 10, 60000) // 10 requests per minute per user/IP
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  // SECURITY: Request body size limit (1MB)
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 1024 * 1024) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }
  
  try {
    
    if (!xpub) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const body = await request.json()
    const { tier, domain } = body
    
    if (!domain || !domain.trim()) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }
    
    // Domain validation (allows test domains)
    const validation = validateDomain(domain.trim())
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid domain format' }, { status: 400 })
    }
    
    // Get user
    let user = await getUserByXpub(xpub)
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
          const siteId = generateSiteId()
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
      
      // If still no user, create a minimal user (they have valid xpub cookie, so they're authenticated)
      if (!user) {
        console.log('Creating new user for authenticated xpub')
        const siteId = generateSiteId()
        user = await createUser(xpub, siteId)
      }
    }

    // Normalize domain
    const normalizedDomain = normalizeDomain(domain.trim())

    // Use addDomain to add the domain (handles verification properly)
    // Then update subscription status
    const domainAdded = await addDomain(xpub, normalizedDomain)
    if (!domainAdded) {
      return NextResponse.json({ error: 'Failed to add domain' }, { status: 500 })
    }

    // Handle domain verification
    // Test domains are auto-verified
    if (isTestDomain(normalizedDomain)) {
      const token = generateVerificationToken()
      await addDomainVerification(xpub, normalizedDomain, token)
      await updateDomainVerification(xpub, normalizedDomain, {
        status: 'verified',
        verifiedAt: Date.now()
      })
    } else {
      // Real domains: create pending verification
      const token = generateVerificationToken()
      await addDomainVerification(xpub, normalizedDomain, token)
    }

    // Update subscription status
    const updatedUser = await updateUser(xpub, {
      subscribed: true,
      subscriptionTier: 'free',
    })
    
    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }
    
    // Update backup cookie
    const subscriptionBackup = {
      subscribed: updatedUser.subscribed,
      subscriptionTier: 'free',
      allowedDomains: updatedUser.allowedDomains || [],
      freeDisclaimerAccepted: updatedUser.freeDisclaimerAccepted || false,
      freeDisclaimerAcceptedAt: updatedUser.freeDisclaimerAcceptedAt,
      freeDisclaimerAcceptedIp: updatedUser.freeDisclaimerAcceptedIp,
      freeDisclaimerAcceptedUserAgent: updatedUser.freeDisclaimerAcceptedUserAgent,
      integrationEnabled: updatedUser.integrationEnabled ?? true,
    }
    
    const response = NextResponse.json(updatedUser)
    const signedBackup = signCookieData(subscriptionBackup)
    response.cookies.set('user_subscription_backup', signedBackup, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === 'production',
    })
    
    return response
  } catch (error) {
    console.error('Subscribe error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

