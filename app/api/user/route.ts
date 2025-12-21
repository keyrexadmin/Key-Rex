import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub } from '@/lib/storage'
import { verifyCookieData, signCookieData } from '@/lib/cookie-signing'
import { rateLimitMiddleware, getClientIP } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent cost abuse (per-user for authenticated endpoints)
  const xpub = request.cookies.get('user_xpub')?.value
  // Use xpub as identifier if authenticated, otherwise use IP
  const identifier = xpub || getClientIP(request)
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 60, 60000) // 60 requests per minute per user/IP
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  if (!xpub) {
    if (process.env.NODE_ENV === 'development') {
      console.error('No xpub cookie found')
    }
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  
  // Check for subscription backup in cookie FIRST (before checking storage)
  // This ensures we always use the most recent subscription data, even if storage has stale data
  // CRITICAL: Verify cryptographic signature to detect tampering
  const backupCookie = request.cookies.get('user_subscription_backup')?.value
  let subscriptionBackup = null
  if (backupCookie) {
    // Verify cryptographic signature - returns null if tampered
    subscriptionBackup = verifyCookieData(backupCookie)
    if (subscriptionBackup && process.env.NODE_ENV === 'development') {
      console.log('✓ Found and verified subscription backup in cookie (signature valid)')
      
      // Additional security: Validate IP address consistency
      // Allow some tolerance for IP changes (user might be on different network)
      // But log if IP changed significantly
      const currentIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                       request.headers.get('x-real-ip') || 
                       'unknown'
      
      if (subscriptionBackup.freeDisclaimerAcceptedIp && 
          subscriptionBackup.freeDisclaimerAcceptedIp !== 'unknown' &&
          currentIp !== 'unknown' &&
          subscriptionBackup.freeDisclaimerAcceptedIp !== currentIp) {
        console.warn('⚠️  SECURITY WARNING: IP address changed since disclaimer acceptance')
        console.warn('  Original IP:', subscriptionBackup.freeDisclaimerAcceptedIp)
        console.warn('  Current IP:', currentIp)
        console.warn('  This may indicate legitimate network change or potential issue')
        // Don't block - just log for audit
      }
    } else {
      console.error('✗ SECURITY ALERT: Backup cookie signature verification FAILED - possible tampering detected!')
      console.error('  Cookie value (first 100 chars):', backupCookie.substring(0, 100))
      console.error('  This cookie will be IGNORED for security reasons')
      // Don't use tampered cookie - treat as if no backup exists
      subscriptionBackup = null
    }
  }
  
  let user = getUserByXpub(xpub)
  console.log('User found in storage:', user ? 'YES' : 'NO')
  
  // If user doesn't exist, create a new user
  if (!user) {
    console.warn('User not found in storage - this may be due to storage reset or different serverless instance')
    console.warn('User has valid xpub cookie, so they have authenticated')
    
    // CRITICAL: Check if this is a fresh sign-in after account deletion or server restart
    // If backup cookie exists but user doesn't exist in storage, it might be stale data from a deleted account
    // OR it could be from before a server restart (in-memory storage was cleared)
    // We should only restore if we're confident this is a storage reset, not an account deletion
    // For now, we'll be conservative: if user doesn't exist in storage, don't restore from backup
    // This ensures deleted accounts stay deleted AND ensures first-time users after server restart see the wizard
    if (subscriptionBackup) {
      console.warn('⚠️  Backup cookie found but user not in storage - this might be stale data from deleted account OR server restart')
      console.warn('⚠️  NOT restoring from backup cookie to prevent deleted account data from reappearing')
      console.warn('⚠️  User will start fresh - they can resubscribe if needed')
      console.warn('⚠️  This ensures first-time users after server restart see the wizard (freeDisclaimerAccepted will be false)')
      // Clear the backup cookie since it's likely stale
      subscriptionBackup = null
    }
    
    // Create user with fresh defaults (freeDisclaimerAccepted: false)
    const { createUser } = await import('@/lib/storage')
    const { generateSiteId } = await import('@/lib/utils')
    const siteId = generateSiteId()
    user = createUser(xpub, siteId)
    console.log('Minimal user created with siteId:', siteId)
    console.log('User created fresh - freeDisclaimerAccepted:', user.freeDisclaimerAccepted, '(should be false)')
    console.log('User created fresh - no data restored from backup (prevents deleted account data from reappearing)')
    
    // CRITICAL: Clear the backup cookie in the response to ensure it's deleted on the client
    // This prevents stale backup data from being used if the user refreshes
    // This also ensures the modal will show for first-time users after server restart
    const response = NextResponse.json(user)
    response.cookies.set('user_subscription_backup', '', {
      expires: new Date(0), // Set to past date to delete
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    console.log('✓ Backup cookie cleared in response (prevents stale data restoration)')
    console.log('✓ User will see wizard modal since freeDisclaimerAccepted is false')
    return response
  }
  
  // Ensure user exists (should never happen at this point, but TypeScript needs this)
  if (!user) {
    console.error('CRITICAL: User is still undefined after creation attempt')
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
  
  // IMPORTANT: Always check backup cookie for domains and disclaimer data
  // Domains should be preserved
  // This ensures domains are always restored from backup cookie if available
  if (subscriptionBackup) {
    console.log('Backup cookie found - checking if it has newer data than storage')
    console.log('Storage domains:', user.allowedDomains)
    console.log('Storage domain count:', (user.allowedDomains || []).length)
    console.log('Backup domains:', subscriptionBackup.allowedDomains)
    console.log('Backup domain count:', (subscriptionBackup.allowedDomains || []).length)
    
    // CRITICAL: Check if backup cookie has fewer domains than storage (indicating deleted domains)
    const storageDomainCount = (user.allowedDomains || []).length
    const backupDomainCount = (subscriptionBackup.allowedDomains || []).length
    const hasDeletedDomains = backupDomainCount > 0 && storageDomainCount > backupDomainCount
    
    if (hasDeletedDomains) {
      console.error('CRITICAL: Backup cookie has fewer domains than storage - deleted domains detected!')
      console.error('Storage domains (contain deleted):', user.allowedDomains)
      console.error('Backup cookie domains (source of truth):', subscriptionBackup.allowedDomains)
      console.error('CRITICAL: Storage will be IMMEDIATELY fixed to match backup cookie')
      
      // IMMEDIATELY fix storage to match backup cookie
      const { updateUser } = await import('@/lib/storage')
      const storageFixed = updateUser(xpub, {
        allowedDomains: [...subscriptionBackup.allowedDomains] // Force storage to match backup cookie
      })
      if (storageFixed) {
        console.log('✓ Storage IMMEDIATELY fixed to remove deleted domains')
        console.log('✓ Storage now contains ONLY:', storageFixed.allowedDomains)
        user = storageFixed // Update user reference
      }
    }
    
    // CRITICAL: Always check domains - they should be preserved
    const domainsChanged = JSON.stringify(subscriptionBackup.allowedDomains || []) !== JSON.stringify(user.allowedDomains || [])
    const subscribedChanged = subscriptionBackup.subscribed !== user.subscribed
    const disclaimerChanged = subscriptionBackup.freeDisclaimerAccepted !== user.freeDisclaimerAccepted
    const integrationEnabledChanged = subscriptionBackup.integrationEnabled !== undefined && 
                                      subscriptionBackup.integrationEnabled !== (user.integrationEnabled ?? true)
    
    // Update if ANY field changed, OR if domains exist in backup but not in storage
    const shouldUpdate = domainsChanged || subscribedChanged || disclaimerChanged || integrationEnabledChanged ||
                        ((subscriptionBackup.allowedDomains || []).length > 0 && (user.allowedDomains || []).length === 0) ||
                        hasDeletedDomains // Always update if we fixed deleted domains
    
    if (shouldUpdate) {
      console.log('Backup cookie has newer data - updating storage with backup data')
      console.log('CRITICAL: Restoring domains from backup cookie:', subscriptionBackup.allowedDomains)
      const { updateUser } = await import('@/lib/storage')
      
      // CRITICAL: Backup cookie domains take priority - they're the source of truth
      // If backup cookie has domains, ALWAYS use them - never fall back to storage
      // This ensures domains deleted during downgrade are NOT restored
      const finalDomains = subscriptionBackup.allowedDomains !== undefined && Array.isArray(subscriptionBackup.allowedDomains)
        ? subscriptionBackup.allowedDomains 
        : (user.allowedDomains || [])
      
      console.log('=== Backup Cookie Priority Check ===')
      console.log('Backup domains (source of truth):', subscriptionBackup.allowedDomains)
      console.log('Storage domains (may contain deleted domains):', user.allowedDomains)
      console.log('Final domains to use:', finalDomains)
      console.log('CRITICAL: Backup cookie domains take priority if valid')
      
      // CRITICAL VERIFICATION: If backup cookie has domains and storage has more, log warning
      // This helps identify when deleted domains might be trying to be restored
      if (subscriptionBackup.allowedDomains && Array.isArray(subscriptionBackup.allowedDomains) && 
          user.allowedDomains && user.allowedDomains.length > subscriptionBackup.allowedDomains.length) {
        const deletedDomains = user.allowedDomains.filter(d => !subscriptionBackup.allowedDomains.includes(d))
        console.warn('WARNING: Storage has domains that were deleted:', deletedDomains)
        console.warn('CRITICAL: These domains will NOT be restored - backup cookie is source of truth')
        console.warn('CRITICAL: Using backup cookie domains only:', subscriptionBackup.allowedDomains)
      }
      
      // CRITICAL: Before updating, verify that backup cookie domains are fewer or equal to storage
      // If storage has more domains, it means they were deleted
      // In that case, we MUST use backup cookie domains (the source of truth)
      const storageDomainCount = (user.allowedDomains || []).length
      const backupDomainCount = (subscriptionBackup.allowedDomains || []).length
      
      if (storageDomainCount > backupDomainCount && backupDomainCount > 0) {
        console.warn('CRITICAL: Storage has more domains than backup cookie - this indicates deleted domains')
        console.warn('Storage domains (deleted):', user.allowedDomains)
        console.warn('Backup cookie domains (source of truth):', subscriptionBackup.allowedDomains)
        console.warn('CRITICAL: Using backup cookie domains ONLY - deleted domains will NOT be restored')
        // Force use backup cookie domains
        const updatedUser = updateUser(xpub, {
          subscribed: subscriptionBackup.subscribed !== undefined ? subscriptionBackup.subscribed : user.subscribed,
          subscriptionTier: 'free', // All users are free tier now
          // CRITICAL: Force use backup cookie domains - they're the source of truth
          allowedDomains: [...subscriptionBackup.allowedDomains], // Create new array to ensure replacement
          freeDisclaimerAccepted: subscriptionBackup.freeDisclaimerAccepted,
          freeDisclaimerAcceptedAt: subscriptionBackup.freeDisclaimerAcceptedAt,
          freeDisclaimerAcceptedIp: subscriptionBackup.freeDisclaimerAcceptedIp,
          freeDisclaimerAcceptedUserAgent: subscriptionBackup.freeDisclaimerAcceptedUserAgent,
          integrationEnabled: subscriptionBackup.integrationEnabled !== undefined ? subscriptionBackup.integrationEnabled : (user.integrationEnabled ?? true),
        })
        if (updatedUser) {
          user = updatedUser
          console.log('✓ Storage updated with backup cookie data (deleted domains removed)')
          console.log('✓ Domains restored from backup cookie:', user.allowedDomains)
        } else {
          console.error('Failed to update user with backup cookie data')
        }
      } else {
        // Normal update - backup cookie and storage are in sync or backup has more/equal domains
        const updatedUser = updateUser(xpub, {
          subscribed: subscriptionBackup.subscribed !== undefined ? subscriptionBackup.subscribed : user.subscribed,
          subscriptionTier: 'free', // All users are free tier now
          // CRITICAL: Always use backup cookie domains if they exist (they're the source of truth)
          allowedDomains: finalDomains,
          freeDisclaimerAccepted: subscriptionBackup.freeDisclaimerAccepted,
          freeDisclaimerAcceptedAt: subscriptionBackup.freeDisclaimerAcceptedAt,
          freeDisclaimerAcceptedIp: subscriptionBackup.freeDisclaimerAcceptedIp,
          freeDisclaimerAcceptedUserAgent: subscriptionBackup.freeDisclaimerAcceptedUserAgent,
          integrationEnabled: subscriptionBackup.integrationEnabled !== undefined ? subscriptionBackup.integrationEnabled : (user.integrationEnabled ?? true),
        })
        if (updatedUser) {
          user = updatedUser
          console.log('✓ Storage updated with backup cookie data')
          console.log('✓ Domains restored:', user.allowedDomains)
        } else {
          console.error('Failed to update user with backup cookie data')
        }
      }
    } else {
      console.log('Storage and backup cookie match - using storage data')
    }
  }
  
  // Ensure user is still defined (TypeScript check)
  if (!user) {
    console.error('CRITICAL: User became undefined after backup cookie check')
    return NextResponse.json({ error: 'Failed to load user' }, { status: 500 })
  }
  
  // Migrate old users: if subscriptionTier or allowedDomains is missing
  // CRITICAL: Preserve existing domains during migration - don't clear them!
  const needsMigration = !user.subscriptionTier || (user.allowedDomains === undefined)
  
  if (needsMigration) {
    console.log('Migrating user data - preserving existing domains')
    console.log('Current domains before migration:', user.allowedDomains)
    const { updateUser } = await import('@/lib/storage')
    const migratedUser = updateUser(xpub, {
      subscriptionTier: 'free', // All users are free tier now
      // CRITICAL: Preserve existing domains - only set to [] if truly undefined
      allowedDomains: user.allowedDomains !== undefined ? user.allowedDomains : [],
    })
    console.log('Migrated user to include subscriptionTier and allowedDomains')
    console.log('Domains after migration:', migratedUser?.allowedDomains)
    user = migratedUser || user
  }
  
  // CRITICAL: When syncing backup cookie, we must NEVER restore deleted domains
  // If backup cookie has fewer domains than storage, it means domains were deleted
  // In that case, we MUST use backup cookie domains (the source of truth), NOT storage domains
  const existingBackupCookieForSync = request.cookies.get('user_subscription_backup')?.value
  let existingBackupDataForSync = null
  if (existingBackupCookieForSync) {
    try {
      existingBackupDataForSync = verifyCookieData(existingBackupCookieForSync)
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  // CRITICAL: Determine which domains to use for backup cookie sync
  // If backup cookie has fewer domains than storage, it means domains were deleted
  // In that case, use backup cookie domains (source of truth), NOT storage domains
  let domainsForBackupCookie: string[] = []
  if (existingBackupDataForSync && existingBackupDataForSync.allowedDomains && Array.isArray(existingBackupDataForSync.allowedDomains)) {
    const storageDomainCount = (user.allowedDomains || []).length
    const backupDomainCount = existingBackupDataForSync.allowedDomains.length
    
    if (storageDomainCount > backupDomainCount && backupDomainCount > 0) {
      // Storage has more domains than backup cookie - this means domains were deleted
      // Use backup cookie domains (source of truth), NOT storage domains
      console.log('CRITICAL: Storage has more domains than backup cookie - using backup cookie domains for sync')
      console.log('Storage domains (contain deleted):', user.allowedDomains)
      console.log('Backup cookie domains (source of truth):', existingBackupDataForSync.allowedDomains)
      domainsForBackupCookie = [...existingBackupDataForSync.allowedDomains]
    } else {
      // Storage and backup cookie are in sync, or storage has fewer/equal domains
      // Use storage domains (which should be clean)
      domainsForBackupCookie = user.allowedDomains || []
    }
  } else {
    // No backup cookie - use storage domains
    domainsForBackupCookie = user.allowedDomains || []
  }
  
  const updatedSubscriptionBackup = {
    subscribed: user.subscribed,
    subscriptionTier: 'free', // All users are free tier now
    allowedDomains: domainsForBackupCookie, // Use determined domains (never restore deleted ones)
    freeDisclaimerAccepted: user.freeDisclaimerAccepted || false,
    freeDisclaimerAcceptedAt: user.freeDisclaimerAcceptedAt,
    freeDisclaimerAcceptedIp: user.freeDisclaimerAcceptedIp,
    freeDisclaimerAcceptedUserAgent: user.freeDisclaimerAcceptedUserAgent,
    integrationEnabled: user.integrationEnabled ?? true,
  }
  
  console.log('=== Syncing backup cookie with current user data ===')
  console.log('Domains to save in backup cookie:', updatedSubscriptionBackup.allowedDomains)
  console.log('Domain count:', updatedSubscriptionBackup.allowedDomains.length)
  console.log('Storage domains:', user.allowedDomains)
  console.log('CRITICAL: Backup cookie preserves domains - deleted domains are NOT restored')
  console.log('CRITICAL: If storage has more domains than backup cookie, we use backup cookie domains (source of truth)')
  
  const response = NextResponse.json(user)
  // Sign the backup cookie and set httpOnly for security
  const signedBackup = signCookieData(updatedSubscriptionBackup)
  response.cookies.set('user_subscription_backup', signedBackup, {
    httpOnly: true, // CRITICAL: Prevent client-side access to prevent tampering
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === 'production',
  })
  console.log('✓ Backup cookie synced with current user data')
  console.log('Returning user data:', { 
    xpub: user.xpub, 
    siteId: user.siteId, 
    subscribed: user.subscribed, 
    tier: user.subscriptionTier,
    domains: user.allowedDomains,
    domainCount: (user.allowedDomains || []).length
  })
  console.log('CRITICAL: Deleted domains are NEVER restored to backup cookie')
  
  return response
}

