import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub, createUser, getAuthSession } from '@/lib/storage'
import { generateSiteId } from '@/lib/utils'
import { rateLimitMiddleware } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // SECURITY: Rate limiting - prevent session fixation attacks and cost abuse
  // Allow 30 requests per minute to accommodate retries and multiple login attempts
  // (serverless instances have separate in-memory stores, so effective limit is higher)
  const rateLimit = rateLimitMiddleware(request, 30, 60000)
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
    const { xpub, k1 } = body
    
    if (process.env.NODE_ENV === 'development') {
      console.log('=== /api/auth/set-session called ===')
      console.log('Received xpub:', xpub ? xpub.substring(0, 20) + '...' : 'MISSING')
      console.log('Received k1:', k1 ? k1.substring(0, 20) + '...' : 'MISSING')
    }
    
    if (!xpub) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Missing xpub in request body')
      }
      return NextResponse.json({ error: 'Missing xpub' }, { status: 400 })
    }
    
    // SECURITY: Require k1 to verify this xpub was obtained through proper authentication
    if (!k1) {
      if (process.env.NODE_ENV === 'development') {
        console.error('SECURITY: Missing k1 parameter - cannot verify authentication')
      }
      return NextResponse.json({ 
        error: 'Authentication verification required. Missing k1 parameter.' 
      }, { status: 401 })
    }
    
    // Clean k1 to ensure consistent lookup (remove any extra query params)
    const cleanK1 = k1.split('&')[0].split('?')[0]
    if (process.env.NODE_ENV === 'development') {
      console.log('Original k1:', k1.substring(0, 20) + '...')
      console.log('Cleaned k1 for verification:', cleanK1.substring(0, 20) + '...')
    }
    
    // SECURITY: Verify that this xpub was obtained through proper cryptographic authentication
    // by checking if it exists in the authSessions mapping (created after signature verification)
    // SECURITY: The k1 -> xpub mapping stored in the database after signature verification is the
    // only trusted source. Client-supplied cookies must never be accepted as proof of authentication.
    const verifiedXpub = await getAuthSession(cleanK1)
    
    if (!verifiedXpub) {
      if (process.env.NODE_ENV === 'development') {
        console.error('SECURITY: k1 challenge not found or expired - authentication not verified')
        console.error('k1 searched:', cleanK1.substring(0, 20) + '...')
      }
      return NextResponse.json({ 
        error: 'Authentication verification failed. Invalid or expired challenge.' 
      }, { status: 401 })
    }
    
    // SECURITY: Verify that the provided xpub matches the verified xpub from authentication
    if (verifiedXpub !== xpub) {
      if (process.env.NODE_ENV === 'development') {
        console.error('SECURITY: xpub mismatch - provided xpub does not match verified xpub')
        console.error('Provided xpub:', xpub.substring(0, 20) + '...')
        console.error('Verified xpub:', verifiedXpub.substring(0, 20) + '...')
      }
      return NextResponse.json({ 
        error: 'Authentication verification failed. xpub mismatch.' 
      }, { status: 401 })
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✓ Authentication verified - xpub matches verified authentication')
    }
    
    // SECURITY: Mark k1 as used to prevent reuse (Fix #6)
    const { markAuthSessionAsUsed } = await import('@/lib/storage')
    await markAuthSessionAsUsed(cleanK1)
    
    // SECURITY: Invalidate old session cookie before setting new one (Fix #5: Session Fixation)
    // Delete old session cookie if it exists
    const oldXpub = request.cookies.get('user_xpub')?.value
    if (oldXpub && oldXpub !== xpub) {
      console.log('SECURITY: Invalidating old session cookie (session fixation prevention)')
    }
    
    // Get or create user
    let user = await getUserByXpub(xpub)
    if (!user) {
      console.log('User not found in set-session, creating new user')
      const siteId = generateSiteId()
      user = await createUser(xpub, siteId)
      console.log('New user created with siteId:', siteId)
    } else {
      console.log('Existing user found:', user.siteId)
    }
    
    // Set session cookie
    const response = NextResponse.json({ success: true, xpub: xpub, user: user })
    
    // SECURITY: Delete old session cookie before setting new one (Fix #5)
    if (oldXpub && oldXpub !== xpub) {
      response.cookies.set('user_xpub', '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
    }
    
    // Set cookie with proper settings for both development and production
    const cookieOptions: any = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // SECURITY: Reduced from 1 year to 30 days
    }
    
    // Only set secure in production (HTTPS required)
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.secure = true
    }
    
    // Set cookie using both methods to ensure it works
    response.cookies.set('user_xpub', xpub, cookieOptions)
    
    // Also try setting it directly in headers as a fallback
    const cookieString = `user_xpub=${xpub}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax; HttpOnly${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    response.headers.append('Set-Cookie', cookieString)
    
    if (process.env.NODE_ENV === 'development') {
      if (process.env.NODE_ENV === 'development') {
        console.log('Cookie set successfully, xpub:', xpub.substring(0, 20) + '...')
        console.log('User exists in storage:', await getUserByXpub(xpub) ? 'YES' : 'NO')
      }
    }
    
    return response
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in set-session:', error)
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

