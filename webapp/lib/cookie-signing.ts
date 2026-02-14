import * as crypto from 'crypto'

/**
 * Cryptographic signing for backup cookies to prevent tampering
 * Uses HMAC-SHA256 with a secret key from environment variable
 */

// SECURITY: Require COOKIE_SECRET in production, only allow default in development
function getCookieSecret(): string {
  const COOKIE_SECRET = process.env.COOKIE_SECRET
  if (!COOKIE_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY ERROR: COOKIE_SECRET environment variable must be set in production. Cookie signing will not work without it.')
    }
    // Only allow default in development
    console.warn('⚠️  WARNING: COOKIE_SECRET not set - using default secret. DO NOT USE IN PRODUCTION!')
    return 'default-secret-change-in-production'
  }
  return COOKIE_SECRET
}

// SECURITY: Never use NEXT_PUBLIC_COOKIE_SECRET for signing (it's exposed to client-side)
if (process.env.NEXT_PUBLIC_COOKIE_SECRET) {
  console.warn('⚠️  WARNING: NEXT_PUBLIC_COOKIE_SECRET is set but will NOT be used for cookie signing (security risk). Use COOKIE_SECRET instead.')
}

/**
 * Sign a cookie value with HMAC-SHA256
 * Format: value.signature
 */
export function signCookie(value: string): string {
  const secret = getCookieSecret()
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(value)
  const signature = hmac.digest('hex')
  return `${value}.${signature}`
}

/**
 * Verify and extract the original value from a signed cookie
 * Returns null if signature is invalid (tampering detected)
 */
export function verifyCookie(signedValue: string): string | null {
  if (!signedValue || typeof signedValue !== 'string') {
    return null
  }
  
  const lastDot = signedValue.lastIndexOf('.')
  if (lastDot === -1) {
    // No signature found - invalid format
    return null
  }
  
  const value = signedValue.substring(0, lastDot)
  const providedSignature = signedValue.substring(lastDot + 1)
  
  // Recompute signature
  const secret = getCookieSecret()
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(value)
  const expectedSignature = hmac.digest('hex')
  
  // Constant-time comparison to prevent timing attacks
  if (crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) {
    return value
  }
  
  // Signature mismatch - tampering detected
  return null
}

/**
 * Sign a JSON object for cookie storage
 */
export function signCookieData(data: any): string {
  const jsonString = JSON.stringify(data)
  return signCookie(jsonString)
}

/**
 * Verify and parse a signed JSON cookie
 * Returns null if signature is invalid or JSON is malformed
 */
export function verifyCookieData(signedValue: string): any | null {
  const verified = verifyCookie(signedValue)
  if (!verified) {
    return null
  }
  
  try {
    return JSON.parse(verified)
  } catch (e) {
    // Invalid JSON
    return null
  }
}

