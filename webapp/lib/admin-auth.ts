/**
 * Admin Authentication Utilities
 * 
 * Handles admin-specific authentication and authorization checks.
 * Admin access is controlled via ADMIN_XPUB environment variable.
 */

/**
 * Get the admin xpubs from environment variable (comma-separated)
 */
export function getAdminXpubs(): string[] {
  const adminXpubEnv = process.env.ADMIN_XPUB || ''
  const xpubs = adminXpubEnv.split(',').map(x => x.trim()).filter(Boolean)
  if (xpubs.length === 0) {
    console.warn('⚠️ ADMIN_XPUB environment variable not set - admin access disabled')
    console.warn('⚠️ To enable admin access:')
    console.warn('⚠️ 1. Log in to the regular dashboard')
    console.warn('⚠️ 2. Go to Settings tab')
    console.warn('⚠️ 3. Copy your xpub')
    console.warn('⚠️ 4. Add ADMIN_XPUB=your_xpub_here to .env.local')
    console.warn('⚠️ Multiple admins: separate xpubs with commas (e.g. ADMIN_XPUB=xpub1,xpub2)')
  }
  return xpubs
}

/**
 * @deprecated Use getAdminXpubs() instead. Returns the first admin xpub for backwards compatibility.
 */
export function getAdminXpub(): string | null {
  const xpubs = getAdminXpubs()
  return xpubs.length > 0 ? xpubs[0] : null
}

/**
 * Check if an xpub is an admin xpub
 */
export function isAdminXpub(xpub: string): boolean {
  const adminXpubs = getAdminXpubs()
  if (adminXpubs.length === 0) {
    console.warn('ADMIN_XPUB environment variable not set - admin access disabled')
    return false
  }

  const matches = adminXpubs.includes(xpub)
  if (!matches) {
    console.error('❌ xpub mismatch:')
    console.error('   Derived xpub:', xpub)
    console.error('   ADMIN_XPUBS: ', adminXpubs.map(x => x.substring(0, 20) + '...').join(', '))
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

