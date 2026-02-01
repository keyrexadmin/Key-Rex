import { NextRequest, NextResponse } from 'next/server'
import { getCorsHeaders } from '@/lib/cors'

/**
 * Server-side endpoint to read k1 and returnUrl from httpOnly cookies
 * This replaces client-side document.cookie reads
 */
export async function GET(request: NextRequest) {
  try {
    const k1 = request.cookies.get('keyrex_k1')?.value || null
    const returnUrl = request.cookies.get('keyrex_return_url')?.value || null
    
    const origin = request.headers.get('origin')
    const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
    
    return NextResponse.json({ 
      k1,
      returnUrl: returnUrl ? decodeURIComponent(returnUrl) : null
    }, {
      headers: corsHeaders
    })
  } catch (error) {
    console.error('Error in get-k1:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}


