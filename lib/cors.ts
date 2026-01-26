import { NextRequest } from 'next/server'
import { normalizeDomain } from './storage'

/**
 * Validates if the request origin is allowed
 * @param request - Next.js request object
 * @param allowedDomains - Array of allowed domain strings
 * @returns true if origin is allowed, false otherwise
 */
export function validateOrigin(request: NextRequest, allowedDomains: string[]): boolean {
  const origin = request.headers.get('origin')
  if (!origin) {
    return false
  }
  
  try {
    const url = new URL(origin)
    const hostname = url.hostname
    
    // Check against allowed domains (exact match or subdomain)
    return allowedDomains.some(domain => {
      const normalizedDomain = normalizeDomain(domain)
      const normalizedHostname = normalizeDomain(hostname)
      
      // Exact match
      if (normalizedHostname === normalizedDomain) {
        return true
      }
      
      // Subdomain match (e.g., subdomain.example.com matches example.com)
      if (normalizedHostname.endsWith('.' + normalizedDomain)) {
        return true
      }
      
      return false
    })
  } catch {
    return false
  }
}

/**
 * Gets CORS headers for a validated origin
 * @param origin - The validated origin string (or null)
 * @param methods - Allowed HTTP methods (default: 'GET, POST, OPTIONS')
 * @param headers - Allowed headers (default: 'Content-Type')
 * @returns CORS headers object
 */
export function getCorsHeaders(
  origin: string | null,
  methods: string = 'GET, POST, OPTIONS',
  headers: string = 'Content-Type'
): Record<string, string> {
  if (!origin) {
    return {} // No CORS headers if no origin
  }
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': headers,
    'Access-Control-Allow-Credentials': 'true',
  }
}

/**
 * Validates origin for dashboard logins (Key-Rex domain only)
 * @param request - Next.js request object
 * @param keyrexDomain - The Key-Rex domain (e.g., 'keyrex.com')
 * @returns true if origin matches Key-Rex domain
 */
export function validateDashboardOrigin(request: NextRequest, keyrexDomain: string): boolean {
  const origin = request.headers.get('origin')
  if (!origin) {
    return false
  }
  
  try {
    const url = new URL(origin)
    const hostname = url.hostname
    const normalizedHostname = normalizeDomain(hostname)
    const normalizedDomain = normalizeDomain(keyrexDomain)
    
    // Exact match or subdomain (e.g., app.keyrex.com)
    return normalizedHostname === normalizedDomain || normalizedHostname.endsWith('.' + normalizedDomain)
  } catch {
    return false
  }
}

/**
 * Validates origin for embed logins (client's allowed domains)
 * @param request - Next.js request object
 * @param allowedDomains - User's allowed domains (used if xpub not provided)
 * @param xpub - Optional: User's xpub to check verified domains only
 * @returns true if origin is in allowed/verified domains
 */
export function validateEmbedOrigin(
  request: NextRequest, 
  allowedDomains: string[],
  xpub?: string
): boolean {
  // If xpub provided, check verified domains only
  if (xpub) {
    const { getVerifiedDomains } = require('./storage')
    const verifiedDomains = getVerifiedDomains(xpub)
    return validateOrigin(request, verifiedDomains)
  }
  
  // Fallback: use provided domains (for backward compatibility)
  return validateOrigin(request, allowedDomains)
}

/**
 * Gets the Key-Rex domain from the request
 * @param request - Next.js request object
 * @returns The Key-Rex domain (hostname)
 */
export function getKeyRexDomain(request: NextRequest): string {
  try {
    const url = new URL(request.url)
    return url.hostname
  } catch {
    return 'localhost'
  }
}

