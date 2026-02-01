import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub, addDomain, removeDomain, normalizeDomain, createUser, logActivity, addDomainVerification, getDomainVerification } from '@/lib/storage'
import { generateSiteId, validateDomain, isTestDomain } from '@/lib/utils'
import { verifyCookieData, signCookieData } from '@/lib/cookie-signing'
import { rateLimitMiddleware, getClientIP } from '@/lib/rate-limit'
import { generateVerificationToken } from '@/lib/domain-verification'

// Helper function to check wizard completion
function checkWizardCompletion(request: NextRequest): NextResponse | null {
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
  return null
}

// GET: Get allowed domains for current user
export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent cost abuse (per-user for authenticated endpoints)
  let xpub = request.cookies.get('user_xpub')?.value
  const identifier = xpub || getClientIP(request)
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 30, 60000) // 30 requests per minute per user/IP
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  const xpubFromCookie = request.cookies.get('user_xpub')?.value
  
  if (!xpubFromCookie) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  
  // Reassign xpub from cookie (already declared for rate limiting above)
  xpub = xpubFromCookie
  
  if (process.env.NODE_ENV === 'development') {
    console.log('=== GET /api/domains ===')
    console.log('Cookie xpub:', xpub ? xpub.substring(0, 20) + '...' : 'NOT FOUND')
  }
  
  // SECURITY: Check if user has completed wizard (freeDisclaimerAccepted)
  const wizardCheck = checkWizardCompletion(request)
  if (wizardCheck) return wizardCheck
  
  let user = getUserByXpub(xpub)
  
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
        const siteId = generateSiteId()
        user = createUser(xpub, siteId)
        // Restore subscription data from backup
        const { updateUser } = await import('@/lib/storage')
        user = updateUser(xpub, {
          subscribed: backup.subscribed || false,
          subscriptionTier: 'free',
          allowedDomains: backup.allowedDomains || [],
        })
        console.log('User restored from backup cookie')
      } else {
        console.error('✗ SECURITY ALERT: Backup cookie signature verification FAILED - possible tampering!')
        console.error('  Cookie will be IGNORED for security reasons')
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'User not found. Please sign in again.' }, { status: 404 })
    }
  }
  
  // CRITICAL: Storage is the source of truth - use storage domains
  // After downgrade, storage should only contain the selected domain (deleted domains are completely removed)
  // We use storage, not backup cookie, because storage is the authoritative source
  const domainsToReturn = user.allowedDomains || []
  
  console.log('Returning domains from storage (source of truth):', domainsToReturn)
  console.log('Domain count:', domainsToReturn.length)
  console.log('CRITICAL: Storage should only contain the domain kept during downgrade')
  
  // Return domains with verification status
  const domainsWithStatus = domainsToReturn.map(domain => {
    const verification = user.domainVerifications?.get(domain)
    const isVerified = verification?.status === 'verified' || isTestDomain(domain)
    return {
      domain,
      verified: isVerified,
      status: verification?.status || (isTestDomain(domain) ? 'verified' : 'pending'),
      verificationToken: verification?.status === 'pending' ? verification.verificationToken : undefined,
      errorMessage: verification?.errorMessage
    }
  })
  
  return NextResponse.json({ 
    domains: domainsToReturn, // Backward compatibility
    domainsWithStatus // Include verification info
  })
}

// POST: Add a domain
export async function POST(request: NextRequest) {
  // SECURITY: Rate limiting - prevent cost abuse (per-user, stricter for write operations)
  let xpub = request.cookies.get('user_xpub')?.value
  const identifier = xpub || getClientIP(request)
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 10, 60000) // 10 requests per minute per user/IP (stricter for writes)
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  const xpubFromCookie = request.cookies.get('user_xpub')?.value
  
  if (process.env.NODE_ENV === 'development') {
    console.log('=== POST /api/domains ===')
    console.log('Cookie xpub:', xpubFromCookie ? xpubFromCookie.substring(0, 20) + '...' : 'NOT FOUND')
  }
  
  if (!xpubFromCookie) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  
  // Reassign xpub from cookie (already declared for rate limiting above)
  xpub = xpubFromCookie
  
  let user = getUserByXpub(xpub)
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
        user = createUser(xpub, siteId)
        // Restore subscription data from backup
        const { updateUser } = await import('@/lib/storage')
        user = updateUser(xpub, {
          subscribed: backup.subscribed || false,
          subscriptionTier: 'free',
          allowedDomains: backup.allowedDomains || [],
        })
        console.log('User restored from backup cookie')
      } else {
        console.error('✗ SECURITY ALERT: Backup cookie signature verification FAILED - possible tampering!')
        console.error('  Cookie will be IGNORED for security reasons')
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'User not found. Please sign in again.' }, { status: 404 })
    }
  }
  
  console.log('User found:', {
    subscribed: user.subscribed,
    tier: user.subscriptionTier,
    currentDomains: user.allowedDomains,
  })
  
  // All users can add unlimited domains (domains are now free for all users)
  
  // SECURITY: Request body size limit
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 1024 * 1024) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }
  
  const body = await request.json().catch(() => ({}))
  const domain = body.domain
  
  if (!domain || typeof domain !== 'string') {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
  }
  
  // SECURITY: Domain length validation (handled by validateDomain, but check early)
  if (domain.length > 253) {
    return NextResponse.json({ error: 'Domain is too long (max 253 characters)' }, { status: 400 })
  }
  
  const normalized = normalizeDomain(domain)
  if (!normalized) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
  }
  
  console.log('Normalized domain:', normalized)
  
  // Check if domain already exists
  const existingDomains = user.allowedDomains || []
  if (existingDomains.includes(normalized)) {
    // Domain already exists - check verification status
    const verification = getDomainVerification(xpub, normalized)
    if (verification?.status === 'verified') {
      return NextResponse.json({ 
        error: 'Domain already added and verified' 
      }, { status: 400 })
    }
    // If pending, return existing verification info
    if (verification?.status === 'pending') {
      return NextResponse.json({
        domain: normalized,
        domains: existingDomains,
        status: 'pending',
        verificationToken: verification.verificationToken,
        message: 'Domain already pending verification'
      })
    }
  }
  
  // Skip verification for test domains (auto-verify)
  if (isTestDomain(normalized)) {
    // Test domains don't need verification - add directly
    const updated = addDomain(xpub, normalized)
    if (!updated) {
      console.error('addDomain returned undefined')
      return NextResponse.json({ error: 'Failed to add domain' }, { status: 500 })
    }
    
    // Auto-verify test domains
    const token = generateVerificationToken() // Still generate token for consistency
    addDomainVerification(xpub, normalized, token)
    // Mark as verified immediately
    const { updateDomainVerification } = await import('@/lib/storage')
    updateDomainVerification(xpub, normalized, {
      status: 'verified',
      verifiedAt: Date.now()
    })
    
    console.log('Test domain added and auto-verified:', normalized)
    
    const response = NextResponse.json({ 
      domains: updated.allowedDomains,
      verified: true,
      status: 'verified'
    })
    
    // Update backup cookie
    const subscriptionBackup = {
      subscribed: updated.subscribed || false,
      subscriptionTier: updated.subscriptionTier || 'free',
      allowedDomains: updated.allowedDomains || [],
      freeDisclaimerAccepted: updated.freeDisclaimerAccepted || false,
      freeDisclaimerAcceptedAt: updated.freeDisclaimerAcceptedAt,
      freeDisclaimerAcceptedIp: updated.freeDisclaimerAcceptedIp,
      freeDisclaimerAcceptedUserAgent: updated.freeDisclaimerAcceptedUserAgent,
      integrationEnabled: updated.integrationEnabled ?? true,
    }
    const signedBackup = signCookieData(subscriptionBackup)
    response.cookies.set('user_subscription_backup', signedBackup, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === 'production',
    })
    
    return response
  }
  
  // For real domains: create pending verification
  const token = generateVerificationToken()
  
  // Add domain first (will be in allowedDomains but not verified)
  const updated = addDomain(xpub, normalized)
  if (!updated) {
    console.error('addDomain returned undefined')
    return NextResponse.json({ error: 'Failed to add domain' }, { status: 500 })
  }
  
  // Create pending verification
  const verification = addDomainVerification(xpub, normalized, token)
  if (!verification) {
    console.error('addDomainVerification returned undefined')
    return NextResponse.json({ error: 'Failed to create verification' }, { status: 500 })
  }
  
  console.log('Domain added with pending verification:', normalized)
  console.log('Verification token:', token)
  
  // CRITICAL: Update backup cookie to persist domains across storage resets
  const response = NextResponse.json({ 
    domain: normalized,
    domains: updated.allowedDomains,
    status: 'pending',
    verificationToken: token,
    message: 'Domain added. Please verify ownership by adding DNS TXT record.'
  })
  const subscriptionBackup = {
    subscribed: updated.subscribed || false,
    subscriptionTier: updated.subscriptionTier || 'free',
    allowedDomains: updated.allowedDomains || [],
    freeDisclaimerAccepted: updated.freeDisclaimerAccepted || false,
    freeDisclaimerAcceptedAt: updated.freeDisclaimerAcceptedAt,
    freeDisclaimerAcceptedIp: updated.freeDisclaimerAcceptedIp,
    freeDisclaimerAcceptedUserAgent: updated.freeDisclaimerAcceptedUserAgent,
    integrationEnabled: updated.integrationEnabled ?? true,
  }
    // Sign the backup cookie and set httpOnly for security
    const signedBackup = signCookieData(subscriptionBackup)
    response.cookies.set('user_subscription_backup', signedBackup, {
      httpOnly: true, // CRITICAL: Prevent client-side access to prevent tampering
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      secure: process.env.NODE_ENV === 'production',
    })
  console.log('Backup cookie updated with new domain:', updated.allowedDomains)
  
  return response
}

// DELETE: Remove a domain
export async function DELETE(request: NextRequest) {
  // SECURITY: Rate limiting - prevent cost abuse (per-user, stricter for write operations)
  let xpub = request.cookies.get('user_xpub')?.value
  const identifier = xpub || getClientIP(request)
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 10, 60000) // 10 requests per minute per user/IP (stricter for writes)
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  const xpubFromCookie = request.cookies.get('user_xpub')?.value
  
  if (process.env.NODE_ENV === 'development') {
    console.log('=== DELETE /api/domains ===')
    console.log('Cookie xpub:', xpubFromCookie ? xpubFromCookie.substring(0, 20) + '...' : 'NOT FOUND')
  }
  
  if (!xpubFromCookie) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  
  // Reassign xpub from cookie (already declared for rate limiting above)
  xpub = xpubFromCookie
  
  let user = getUserByXpub(xpub)
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
        user = createUser(xpub, siteId)
        // Restore subscription data from backup
        const { updateUser } = await import('@/lib/storage')
        user = updateUser(xpub, {
          subscribed: backup.subscribed || false,
          subscriptionTier: 'free',
          allowedDomains: backup.allowedDomains || [],
        })
        console.log('User restored from backup cookie')
      } else {
        console.error('✗ SECURITY ALERT: Backup cookie signature verification FAILED - possible tampering!')
        console.error('  Cookie will be IGNORED for security reasons')
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'User not found. Please sign in again.' }, { status: 404 })
    }
  }
  
  // All users can manage domains (domains are now free for all users)
  
  const searchParams = request.nextUrl.searchParams
  const domain = searchParams.get('domain')
  
  if (!domain) {
    return NextResponse.json({ error: 'Domain parameter is required' }, { status: 400 })
  }
  
  // Don't allow removing the last domain
  if (!user.allowedDomains || user.allowedDomains.length <= 1) {
    return NextResponse.json({ error: 'Cannot remove the last domain' }, { status: 400 })
  }
  
  const updated = removeDomain(xpub, domain)
  if (!updated) {
    return NextResponse.json({ error: 'Failed to remove domain' }, { status: 500 })
  }
  
  console.log('=== Domain Permanently Deleted ===')
  console.log('Deleted domain:', domain)
  console.log('Remaining domains:', updated.allowedDomains)
  console.log('CRITICAL: Deleted domain cannot be found anywhere until user explicitly re-adds it')
  
  // CRITICAL: Update backup cookie to persist domains across storage resets
  // The backup cookie must contain ONLY the remaining domains (deleted domain is not included)
  const response = NextResponse.json({ domains: updated.allowedDomains })
  const subscriptionBackup = {
    subscribed: updated.subscribed || false,
    subscriptionTier: updated.subscriptionTier || 'free',
    allowedDomains: updated.allowedDomains || [], // Array WITHOUT the deleted domain
    freeDisclaimerAccepted: updated.freeDisclaimerAccepted || false,
    freeDisclaimerAcceptedAt: updated.freeDisclaimerAcceptedAt,
    freeDisclaimerAcceptedIp: updated.freeDisclaimerAcceptedIp,
    freeDisclaimerAcceptedUserAgent: updated.freeDisclaimerAcceptedUserAgent,
    integrationEnabled: updated.integrationEnabled ?? true,
  }
  
  console.log('=== Backup Cookie Update After Domain Deletion ===')
  console.log('Domains in backup cookie (deleted domain NOT included):', subscriptionBackup.allowedDomains)
  console.log('Domain count:', subscriptionBackup.allowedDomains.length)
  console.log('CRITICAL: Deleted domain is permanently removed from all storage locations')
  
    // Sign the backup cookie and set httpOnly for security
    const signedBackup = signCookieData(subscriptionBackup)
    response.cookies.set('user_subscription_backup', signedBackup, {
      httpOnly: true, // CRITICAL: Prevent client-side access to prevent tampering
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      secure: process.env.NODE_ENV === 'production',
    })
  console.log('✓ Backup cookie updated - deleted domain is permanently removed')
  
  return response
}

// PUT: Update the single domain
export async function PUT(request: NextRequest) {
  // SECURITY: Rate limiting - prevent cost abuse (per-user, stricter for write operations)
  let xpub = request.cookies.get('user_xpub')?.value
  const identifier = xpub || getClientIP(request)
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 10, 60000) // 10 requests per minute per user/IP (stricter for writes)
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  const xpubFromCookie = request.cookies.get('user_xpub')?.value
  
  if (process.env.NODE_ENV === 'development') {
    console.log('=== PUT /api/domains ===')
    console.log('Cookie xpub:', xpubFromCookie ? xpubFromCookie.substring(0, 20) + '...' : 'NOT FOUND')
  }
  
  if (!xpubFromCookie) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  
  // Reassign xpub from cookie (already declared for rate limiting above)
  xpub = xpubFromCookie
  
  let user = getUserByXpub(xpub)
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
        user = createUser(xpub, siteId)
        // Restore subscription data from backup
        const { updateUser } = await import('@/lib/storage')
        user = updateUser(xpub, {
          subscribed: backup.subscribed || false,
          subscriptionTier: 'free',
          allowedDomains: backup.allowedDomains || [],
        })
        console.log('User restored from backup cookie')
      } else {
        console.error('✗ SECURITY ALERT: Backup cookie signature verification FAILED - possible tampering!')
        console.error('  Cookie will be IGNORED for security reasons')
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: 'User not found. Please sign in again.' }, { status: 404 })
    }
  }
  
  const body = await request.json().catch(() => ({}))
  const domain = body.domain
  
  console.log('Domain to update:', domain)
  console.log('User tier:', user.subscriptionTier)
  console.log('Current domains:', user.allowedDomains)
  
  if (!domain || typeof domain !== 'string') {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
  }
  
  // Domain validation (allows test domains)
  const validation = validateDomain(domain)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error || 'Invalid domain format' }, { status: 400 })
  }
  
  const normalized = normalizeDomain(domain)
  
  console.log('Normalized domain:', normalized)
  
  // All users can update domains (domains are now free for all users)
  const { updateUser } = await import('@/lib/storage')
  
  // Update the domain: if it exists, replace it; otherwise add it
  let updatedDomains: string[]
  let oldDomain: string | undefined
  if (user.allowedDomains && user.allowedDomains.length > 0) {
    // Check if domain already exists (by index or value)
    const existingIndex = user.allowedDomains.findIndex(d => {
      const normalizedExisting = normalizeDomain(d)
      return normalizedExisting === normalized
    })
    if (existingIndex >= 0) {
      // Replace existing domain
      oldDomain = user.allowedDomains[existingIndex]
      updatedDomains = [...user.allowedDomains]
      updatedDomains[existingIndex] = normalized
    } else {
      // Add new domain
      updatedDomains = [...user.allowedDomains, normalized]
    }
  } else {
    // No existing domains, add this one
    updatedDomains = [normalized]
  }
  
  const updated = updateUser(xpub, {
    allowedDomains: updatedDomains
  })
  
  if (!updated) {
    console.error('updateUser returned undefined')
    return NextResponse.json({ error: 'Failed to update domain' }, { status: 500 })
  }
  
  // Log activity for domain update
  if (oldDomain && normalizeDomain(oldDomain) !== normalized) {
    logActivity(xpub, 'domain_updated', `Domain updated from "${oldDomain}" to "${normalized}"`, {
      oldDomain: oldDomain,
      newDomain: normalized
    })
  }
  
  console.log('Domain updated successfully. Updated domains:', updated.allowedDomains)
  
  // CRITICAL: Update backup cookie to persist domains across storage resets
  const response = NextResponse.json({ domains: updated.allowedDomains })
  const subscriptionBackup = {
    subscribed: updated.subscribed || false,
    subscriptionTier: updated.subscriptionTier || 'free',
    allowedDomains: updated.allowedDomains || [],
    freeDisclaimerAccepted: updated.freeDisclaimerAccepted || false,
    freeDisclaimerAcceptedAt: updated.freeDisclaimerAcceptedAt,
    freeDisclaimerAcceptedIp: updated.freeDisclaimerAcceptedIp,
    freeDisclaimerAcceptedUserAgent: updated.freeDisclaimerAcceptedUserAgent,
    integrationEnabled: updated.integrationEnabled ?? true,
  }
    // Sign the backup cookie and set httpOnly for security
    const signedBackup = signCookieData(subscriptionBackup)
    response.cookies.set('user_subscription_backup', signedBackup, {
      httpOnly: true, // CRITICAL: Prevent client-side access to prevent tampering
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      secure: process.env.NODE_ENV === 'production',
    })
  console.log('Backup cookie updated with updated domain:', updated.allowedDomains)
  
  return response
}

