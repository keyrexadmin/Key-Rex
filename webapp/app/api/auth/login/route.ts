import { NextRequest, NextResponse } from 'next/server'
import { verifySignature, deriveXpub } from '@/lib/auth'
import { getUserByXpub, createUser, markAuthSessionAsUsed } from '@/lib/storage'
import { generateSiteId } from '@/lib/utils'
import { rateLimitMiddleware } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // SECURITY: Rate limiting - prevent brute force attacks
  const rateLimit = rateLimitMiddleware(request, 5, 60000) // 5 requests per minute
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
    const { k1, sig, key } = body
    
    if (!k1 || !sig || !key) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }
    
    // Verify signature
    if (!verifySignature(k1, sig, key)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    // SECURITY: Mark k1 as used immediately after successful verification to prevent replay attacks
    markAuthSessionAsUsed(k1)
    
    // Derive xpub from pubkey
    const xpub = deriveXpub(key)
    
    // Get or create user
    let user = getUserByXpub(xpub)
    if (!user) {
      const siteId = generateSiteId()
      user = createUser(xpub, siteId)
    }
    
    // Set session cookie
    const response = NextResponse.json({ success: true, xpub: user.xpub })
    response.cookies.set('user_xpub', xpub, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // SECURITY: Reduced from 1 year to 30 days
    })
    
    return response
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}







