import { NextRequest, NextResponse } from 'next/server'
import { signSession } from '@/lib/session'
import { verifySignature, deriveXpub } from '@/lib/auth'
import { getUserByXpub, createUser, consumeAuthChallenge } from '@/lib/storage'
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
    
    // SECURITY: Consume the issued k1 exactly once to prevent replay
    if (!(await consumeAuthChallenge(k1))) {
      return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 401 })
    }

    // Derive xpub from pubkey
    const xpub = deriveXpub(key)

    // Get or create user
    let user = await getUserByXpub(xpub)
    if (!user) {
      const siteId = generateSiteId()
      user = await createUser(xpub, siteId)
    }
    
    // Set session cookie
    const response = NextResponse.json({ success: true, xpub: user.xpub })
    response.cookies.set('user_xpub', signSession('user', xpub), {
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







