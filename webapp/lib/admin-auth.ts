/**
 * Admin Authentication Utilities
 * 
 * Handles admin-specific authentication and authorization checks.
 * Admin access is controlled via ADMIN_XPUB environment variable.
 */

/**
 * Get the admin xpub from environment variable
 */
export function getAdminXpub(): string | null {
  const adminXpub = process.env.ADMIN_XPUB || null
  if (!adminXpub) {
    console.warn('⚠️ ADMIN_XPUB environment variable not set - admin access disabled')
    console.warn('⚠️ To enable admin access:')
    console.warn('⚠️ 1. Log in to the regular dashboard')
    console.warn('⚠️ 2. Go to Settings tab')
    console.warn('⚠️ 3. Copy your xpub')
    console.warn('⚠️ 4. Add ADMIN_XPUB=your_xpub_here to .env.local')
  }
  return adminXpub
}

/**
 * Check if an xpub is the admin xpub
 */
export function isAdminXpub(xpub: string): boolean {
  const adminXpub = getAdminXpub()
  if (!adminXpub) {
    console.warn('ADMIN_XPUB environment variable not set - admin access disabled')
    return false
  }
  
  const matches = xpub === adminXpub
  if (!matches) {
    console.error('❌ xpub mismatch:')
    console.error('   Derived xpub:', xpub)
    console.error('   ADMIN_XPUB:  ', adminXpub)
    console.error('   These do not match - admin access denied')
  }
  
  return matches
}

/**
 * Verify admin session from cookie
 */
export function getAdminSessionFromCookie(cookieValue: string | undefined): string | null {
  if (!cookieValue) {
    return null
  }
  
  // Admin session cookie contains the xpub
  // Verify it matches ADMIN_XPUB
  if (isAdminXpub(cookieValue)) {
    return cookieValue
  }
  
  return null
}

