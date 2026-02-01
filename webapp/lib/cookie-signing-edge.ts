/**
 * Edge-compatible cookie signing using Web Crypto API
 * This version works in middleware (Edge runtime)
 */

// Lazy initialization to avoid module-level execution issues in Edge runtime
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

/**
 * Sign a cookie value with HMAC-SHA256 using Web Crypto API (Edge-compatible)
 * Format: value.signature
 */
export async function signCookieEdge(value: string): Promise<string> {
  const COOKIE_SECRET = getCookieSecret()
  const encoder = new TextEncoder()
  const keyData = encoder.encode(COOKIE_SECRET)
  const valueData = encoder.encode(value)
  
  // Import key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  // Sign the value
  const signature = await crypto.subtle.sign('HMAC', key, valueData)
  
  // Convert signature to hex string
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  return `${value}.${signatureHex}`
}

/**
 * Verify and extract the original value from a signed cookie (Edge-compatible)
 * Returns null if signature is invalid (tampering detected)
 */
export async function verifyCookieEdge(signedValue: string): Promise<string | null> {
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
  
  // Recompute signature using Web Crypto API
  const COOKIE_SECRET = getCookieSecret()
  const encoder = new TextEncoder()
  const keyData = encoder.encode(COOKIE_SECRET)
  const valueData = encoder.encode(value)
  
  // Import key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  // Sign the value
  const signature = await crypto.subtle.sign('HMAC', key, valueData)
  
  // Convert signature to hex string
  const expectedSignatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  // Constant-time comparison to prevent timing attacks
  if (providedSignature.length !== expectedSignatureHex.length) {
    return null
  }
  
  let match = true
  for (let i = 0; i < providedSignature.length; i++) {
    if (providedSignature[i] !== expectedSignatureHex[i]) {
      match = false
    }
  }
  
  if (!match) {
    // Signature mismatch - tampering detected
    return null
  }
  
  return value
}

/**
 * Sign a JSON object for cookie storage (Edge-compatible)
 */
export async function signCookieDataEdge(data: any): Promise<string> {
  const jsonString = JSON.stringify(data)
  return signCookieEdge(jsonString)
}

/**
 * Verify and parse a signed JSON cookie (Edge-compatible)
 * Returns null if signature is invalid or JSON is malformed
 */
export async function verifyCookieDataEdge(signedValue: string): Promise<any | null> {
  const verified = await verifyCookieEdge(signedValue)
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

