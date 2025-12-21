import { NextRequest, NextResponse } from 'next/server'
import { verifySignature, deriveXpub } from '@/lib/auth'
import { recordLogin, getUserBySiteId, isDomainAllowed, updateUser, normalizeDomain, markAuthSessionAsUsed } from '@/lib/storage'
import { detectWallet, detectBrowser, detectDeviceType } from '@/lib/utils'
import { rateLimitMiddleware } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // SECURITY: Rate limiting - prevent brute force attacks
  // NOTE: WebLN authentication can poll multiple times quickly, allow reasonable buffer
  const rateLimit = rateLimitMiddleware(request, 20, 60000) // 20 requests per minute (allows WebLN polling with buffer)
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  // SECURITY: Request body size limit (1MB)
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 1024 * 1024) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }
  
  try {
    const body = await request.json()
    const { k1, sig, key, siteId } = body
    
    if (!k1 || !sig || !key || !siteId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }
    
    // Check if siteId belongs to a valid user
    const user = getUserBySiteId(siteId)
    if (!user) {
      return NextResponse.json({ error: 'Invalid siteId' }, { status: 404 })
    }
    
    // Check if integration is enabled
    if (user.integrationEnabled === false) {
      return NextResponse.json({ 
        error: 'Integration is disabled. Authentication is currently turned off for all domains.',
        integrationEnabled: false 
      }, { status: 403 })
    }
    
    // All users are now free users - no subscription check needed
    
    // Domain protection: Check if the origin is allowed
    const origin = request.headers.get('origin') || request.headers.get('referer')
    let requestDomain: string | null = null
    
    if (origin) {
      // Extract domain from origin/referer
      try {
        const url = new URL(origin)
        requestDomain = url.hostname
      } catch {
        // If URL parsing fails, try to extract domain manually
        requestDomain = origin.replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0]
      }
      
      // FIRST-USE DOMAIN CAPTURE: If user has no domains yet, capture this one (all users can have domains)
      if ((!user.allowedDomains || user.allowedDomains.length === 0) && requestDomain) {
        const normalizedDomain = normalizeDomain(requestDomain)
        if (process.env.NODE_ENV === 'development') {
          console.log('First-use domain capture:', normalizedDomain)
        }
        const updated = updateUser(user.xpub, {
          allowedDomains: [normalizedDomain]
        })
        if (updated && process.env.NODE_ENV === 'development') {
          console.log('Domain captured:', normalizedDomain)
        }
      }
      
      // Check if domain is allowed
      const allowedDomains = user.allowedDomains || []
      if (allowedDomains.length > 0 && !isDomainAllowed(requestDomain, allowedDomains)) {
        return NextResponse.json({ 
          error: 'This domain is not authorized — add it in your dashboard' 
        }, { status: 403 })
      }
    } else {
      // SECURITY: Require origin for embedded logins
      // Direct API calls without origin are not allowed for security
      if (process.env.NODE_ENV === 'development') {
        console.error('SECURITY: No origin/referer header in verify request for siteId:', siteId)
      }
      return NextResponse.json({ 
        error: 'Origin validation required. Missing origin header.' 
      }, { status: 400 })
    }
    
    // Verify signature
    if (!verifySignature(k1, sig, key)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    // SECURITY: Mark k1 as used immediately after successful verification to prevent replay attacks
    markAuthSessionAsUsed(k1)
    
    // Detect wallet, browser, and device from User-Agent and signature format
    const userAgent = request.headers.get('user-agent')
    let signatureLength: number | undefined
    if (sig) {
      try {
        // Try hex first (most common)
        if (/^[0-9a-fA-F]+$/.test(sig)) {
          signatureLength = Buffer.from(sig, 'hex').length
        } else {
          // Try base64
          signatureLength = Buffer.from(sig, 'base64').length
        }
      } catch {
        signatureLength = undefined
      }
    }
    const detectedWallet = detectWallet(userAgent, signatureLength)
    const detectedBrowser = detectBrowser(userAgent)
    const detectedDeviceType = detectDeviceType(userAgent)
    
    // Record login with domain, wallet, browser, and device information
    recordLogin(siteId, key, requestDomain || undefined, detectedWallet, detectedBrowser, detectedDeviceType)
    
    // Derive xpub
    const xpub = deriveXpub(key)
    
    return NextResponse.json({ success: true, xpub })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}


