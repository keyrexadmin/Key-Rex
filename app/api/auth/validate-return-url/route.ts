import { NextRequest, NextResponse } from 'next/server'
import { getUserBySiteId } from '@/lib/storage'
import { isDomainAllowed } from '@/lib/storage'
import { getCorsHeaders } from '@/lib/cors'

/**
 * Server-side endpoint to validate returnUrl against user's allowed domains
 * Prevents open redirect vulnerabilities
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { returnUrl, siteId } = body
    
    if (!returnUrl || !siteId) {
      return NextResponse.json({ 
        error: 'Missing returnUrl or siteId' 
      }, { status: 400 })
    }
    
    // Get user to check allowed domains
    const user = getUserBySiteId(siteId)
    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid siteId' 
      }, { status: 404 })
    }
    
    // Validate returnUrl
    let isValid = false
    let validatedUrl: string | null = null
    
    try {
      const returnUrlObj = new URL(decodeURIComponent(returnUrl))
      const allowedDomains = user.allowedDomains || []
      
      // If user has no allowed domains yet, allow any domain (first-use scenario)
      // Otherwise, validate against allowed domains
      if (allowedDomains.length === 0) {
        // First-use: allow the domain from returnUrl
        isValid = true
        validatedUrl = returnUrlObj.toString()
      } else {
        // Validate against allowed domains
        isValid = isDomainAllowed(returnUrlObj.hostname, allowedDomains)
        if (isValid) {
          validatedUrl = returnUrlObj.toString()
        }
      }
    } catch (e) {
      // Invalid URL format
      console.error('Invalid returnUrl format:', e)
      isValid = false
    }
    
    const origin = request.headers.get('origin')
    const corsHeaders = getCorsHeaders(origin, 'POST, OPTIONS')
    
    return NextResponse.json({ 
      isValid,
      validatedUrl: isValid ? validatedUrl : null
    }, {
      headers: corsHeaders
    })
  } catch (error) {
    console.error('Error in validate-return-url:', error)
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

