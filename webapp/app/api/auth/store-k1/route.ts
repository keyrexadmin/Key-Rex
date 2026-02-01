import { NextRequest, NextResponse } from 'next/server'
import { getCorsHeaders } from '@/lib/cors'

/**
 * Server-side endpoint to store k1 and returnUrl in httpOnly cookies
 * This replaces client-side document.cookie calls to prevent XSS attacks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { k1, returnUrl } = body
    
    if (!k1) {
      return NextResponse.json({ error: 'Missing k1 parameter' }, { status: 400 })
    }
    
    if (!returnUrl) {
      return NextResponse.json({ error: 'Missing returnUrl parameter' }, { status: 400 })
    }
    
    const origin = request.headers.get('origin')
    
    // Store k1 in httpOnly cookie (prevents XSS attacks)
    const response = NextResponse.json({ success: true })
    response.cookies.set('keyrex_k1', k1, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300, // 5 minutes
      path: '/',
    })
    
    // Store return URL in httpOnly cookie
    response.cookies.set('keyrex_return_url', returnUrl, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300, // 5 minutes
      path: '/',
    })
    
    // Set CORS headers
    const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS')
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  } catch (error) {
    console.error('Error in store-k1:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS')
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}


