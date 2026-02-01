import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub, getDomainVerification, updateDomainVerification } from '@/lib/storage'
import { verifyDomainDNS } from '@/lib/domain-verification'
import { rateLimitMiddleware } from '@/lib/rate-limit'

/**
 * POST /api/domains/verify
 * Verify domain ownership via DNS TXT record
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 10 checks per minute
  const rateLimit = rateLimitMiddleware(request, 10, 60000)
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  const xpub = request.cookies.get('user_xpub')?.value
  if (!xpub) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  
  const body = await request.json()
  const { domain } = body
  
  if (!domain || typeof domain !== 'string') {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
  }
  
  const user = getUserByXpub(xpub)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  
  const verification = getDomainVerification(xpub, domain)
  if (!verification) {
    return NextResponse.json({ 
      error: 'Domain not found or verification not initiated' 
    }, { status: 404 })
  }
  
  // Check DNS
  const result = await verifyDomainDNS(domain, verification.verificationToken)
  
  if (result.verified) {
    // Update verification status
    updateDomainVerification(xpub, domain, {
      status: 'verified',
      verifiedAt: Date.now(),
      lastCheckedAt: Date.now(),
      errorMessage: undefined
    })
    
    return NextResponse.json({ 
      verified: true,
      domain,
      message: 'Domain verified successfully!' 
    })
  }
  
  // Update with error
  updateDomainVerification(xpub, domain, {
    lastCheckedAt: Date.now(),
    errorMessage: result.error,
    status: 'failed'
  })
  
  return NextResponse.json({ 
    verified: false,
    domain,
    error: result.error 
  })
}


