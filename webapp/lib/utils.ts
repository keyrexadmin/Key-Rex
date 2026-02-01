import crypto from 'crypto'

export function generateSiteId(): string {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Check if a domain is a test domain (localhost, test subdomains, staging, etc.)
 */
export function isTestDomain(domain: string): boolean {
  const normalized = domain.toLowerCase().trim()
  
  // Localhost variations
  if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '0.0.0.0') {
    return true
  }
  
  // IP addresses (test environments often use IPs)
  const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
  if (ipRegex.test(normalized)) {
    return true
  }
  
  // Test subdomains
  const testSubdomainPatterns = [
    /^test\./,
    /^testing\./,
    /^staging\./,
    /^dev\./,
    /^development\./,
    /^local\./,
    /^demo\./,
    /^sandbox\./,
    /^qa\./,
    /^preview\./,
  ]
  
  for (const pattern of testSubdomainPatterns) {
    if (pattern.test(normalized)) {
      return true
    }
  }
  
  // Test TLDs
  const testTlds = ['.test', '.local', '.example']
  for (const tld of testTlds) {
    if (normalized.endsWith(tld)) {
      return true
    }
  }
  
  return false
}

/**
 * Detect wallet type from User-Agent string and signature format
 */
export function detectWallet(userAgent: string | null, signatureLength?: number): string | undefined {
  if (!userAgent) return undefined
  
  const ua = userAgent.toLowerCase()
  
  // Alby detection
  if (ua.includes('alby')) {
    return 'Alby'
  }
  
  // Phoenix detection
  if (ua.includes('phoenix')) {
    return 'Phoenix'
  }
  
  // Zeus detection
  if (ua.includes('zeus')) {
    return 'Zeus'
  }
  
  // Breez detection
  if (ua.includes('breez')) {
    return 'Breez'
  }
  
  // Wallet of Satoshi detection
  if (ua.includes('wallet') && ua.includes('satoshi')) {
    return 'Wallet of Satoshi'
  }
  
  // BlueWallet detection
  if (ua.includes('bluewallet') || ua.includes('blue wallet')) {
    return 'BlueWallet'
  }
  
  // Signature format detection (fallback)
  // Alby typically uses DER format (69-72 bytes)
  // Phoenix/Zeus typically use compact format (64 bytes)
  if (signatureLength) {
    if (signatureLength >= 69 && signatureLength <= 72) {
      return 'Alby (detected)'
    } else if (signatureLength === 64) {
      return 'Other LNURL Wallet'
    }
  }
  
  return undefined
}

/**
 * Detect browser from User-Agent string
 */
export function detectBrowser(userAgent: string | null): string {
  if (!userAgent) return 'Unknown'
  
  const ua = userAgent.toLowerCase()
  
  if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome'
  if (ua.includes('firefox')) return 'Firefox'
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari'
  if (ua.includes('edg')) return 'Edge'
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera'
  if (ua.includes('brave')) return 'Brave'
  
  return 'Other'
}

/**
 * Detect device type from User-Agent string
 */
export function detectDeviceType(userAgent: string | null): 'mobile' | 'desktop' | 'tablet' | 'unknown' {
  if (!userAgent) return 'unknown'
  
  const ua = userAgent.toLowerCase()
  
  // Tablet detection (check before mobile as tablets often contain mobile keywords)
  if (ua.includes('tablet') || ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
    return 'tablet'
  }
  
  // Mobile detection
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipod')) {
    return 'mobile'
  }
  
  // Desktop (default if not mobile/tablet)
  return 'desktop'
}

/**
 * Validate domain format - allows both regular domains and test domains
 * SECURITY: Includes length validation to prevent DoS attacks
 */
export function validateDomain(domain: string): { valid: boolean; error?: string } {
  const trimmed = domain.trim()
  
  if (!trimmed) {
    return { valid: false, error: 'Domain is required' }
  }
  
  // SECURITY: Domain length validation (RFC 1035: max 253 characters)
  if (trimmed.length > 253) {
    return { valid: false, error: 'Domain is too long (max 253 characters)' }
  }
  
  // Check for http/https
  if (trimmed.includes('http://') || trimmed.includes('https://')) {
    return { valid: false, error: 'Do not include http:// or https://. Just enter the domain (e.g., example.com)' }
  }
  
  // Check for trailing slash
  if (trimmed.endsWith('/')) {
    return { valid: false, error: 'Do not include trailing slash. Just enter the domain (e.g., example.com)' }
  }
  
  // Check for paths
  if (trimmed.includes('/')) {
    return { valid: false, error: 'Do not include paths. Just enter the domain (e.g., example.com)' }
  }
  
  // Check if it's a test domain
  if (isTestDomain(trimmed)) {
    // Test domains are always valid
    return { valid: true }
  }
  
  // Validate regular domain format
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
  if (!domainRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid domain format. Use format like: example.com or login.example.com' }
  }
  
  return { valid: true }
}


