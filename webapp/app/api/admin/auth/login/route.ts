import { NextRequest, NextResponse } from 'next/server'
import { verifySignature, deriveXpub } from '@/lib/auth'
import { isAdminXpub } from '@/lib/admin-auth'
import { validateDashboardOrigin, getKeyRexDomain, getCorsHeaders } from '@/lib/cors'
import { rateLimitMiddleware } from '@/lib/rate-limit'
import { markAuthSessionAsUsed } from '@/lib/storage'

/**
 * Admin Login API Route
 * 
 * Handles LNURL-auth callback for admin authentication.
 * Verifies the xpub matches ADMIN_XPUB environment variable.
 */
export async function OPTIONS(request: NextRequest) {
  // SECURITY: Validate origin for admin login (Key-Rex domain only)
  const keyrexDomain = getKeyRexDomain(request)
  const origin = request.headers.get('origin')
  
  // Allow same-origin requests (no origin header) or validate Key-Rex domain
  if (origin && !validateDashboardOrigin(request, keyrexDomain)) {
    return new NextResponse(null, { status: 403 })
  }
  
  const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent brute force attacks
  const rateLimit = rateLimitMiddleware(request, 10, 60000) // 10 requests per minute
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  // SECURITY: Validate origin for admin login (Key-Rex domain only)
  const keyrexDomain = getKeyRexDomain(request)
  const origin = request.headers.get('origin')
  
  // Allow same-origin requests (no origin header) or validate Key-Rex domain
  if (origin && !validateDashboardOrigin(request, keyrexDomain)) {
    console.warn('CORS: Invalid origin for admin login:', origin)
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }
  
  const searchParams = request.nextUrl.searchParams
  const k1 = searchParams.get('k1')
  const sig = searchParams.get('sig')
  const key = searchParams.get('key')
  
  if (process.env.NODE_ENV === 'development') {
    console.log('=== /api/admin/auth/login called ===')
  }
  
  // If no sig/key, return LNURL-auth response format
  if (!sig || !key) {
    if (!k1) {
      return NextResponse.json({ error: 'Missing k1 parameter' }, { status: 400 })
    }
    
    // Return LNURL-auth response format
    const domain = request.nextUrl.origin
    const callback = `${domain}/api/admin/auth/login?k1=${k1}`
    
    const response = NextResponse.json({
      tag: 'login',
      k1: k1,
      callback: callback,
    })
    
    // Set CORS headers based on validated origin
    const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }
  
  // Verify signature
  if (!k1) {
    return NextResponse.json({ error: 'Missing k1 parameter' }, { status: 400 })
  }
  
  const isValid = verifySignature(k1, sig, key)
  
  if (!isValid) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Admin login: Invalid signature')
    }
    return NextResponse.json({ 
      error: 'Invalid signature - cryptographic verification failed'
    }, { status: 401 })
  }
  
  // SECURITY: Mark k1 as used immediately after successful verification to prevent replay attacks
  await markAuthSessionAsUsed(k1)
  
  // Derive xpub from pubkey
  const xpub = deriveXpub(key)
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Admin login: Derived xpub:', xpub.substring(0, 20) + '...')
  }
  
  // Get admin xpub from env for comparison
  const adminXpub = process.env.ADMIN_XPUB
  
  // Verify this xpub is the admin xpub
  if (!isAdminXpub(xpub)) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Admin login: xpub does not match ADMIN_XPUB')
      console.error('Admin login: Derived xpub:', xpub.substring(0, 20) + '...')
      console.error('Admin login: Expected ADMIN_XPUB:', adminXpub ? adminXpub.substring(0, 20) + '...' : 'NOT SET')
    }
    
    // SECURITY: Don't expose derivedXpub in production error responses
    const errorResponse: any = {
      error: 'Unauthorized - this xpub is not authorized for admin access',
      adminXpubSet: !!adminXpub
    }
    
    // Only include debugging info in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.derivedXpub = xpub
    }
    
    return NextResponse.json(errorResponse, { status: 403 })
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('✓ Admin login successful')
  }
  
  // Set admin session cookie
  const response = NextResponse.json({ 
    status: 'OK',
    xpub: xpub,
    isAdmin: true
  })
  
  // SECURITY: Set CORS headers based on validated origin (not wildcard)
  const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // Set admin session cookie
  const cookieOptions: any = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // SECURITY: Reduced from 1 year to 30 days
  }
  
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true
  }
  
  response.cookies.set('admin_session', xpub, cookieOptions)
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Admin session cookie set for xpub:', xpub.substring(0, 20) + '...')
  }
  
  return response
}

