import { NextRequest, NextResponse } from 'next/server'
import { verifySignature, deriveXpub } from '@/lib/auth'
import { getUserByXpub, createUser, getUserBySiteId, getVerifiedDomains, getAuthChallenge } from '@/lib/storage'
import { issueLoginToken, getIssuer } from '@/lib/token'
import { generateSiteId, isTestDomain } from '@/lib/utils'
import { validateDashboardOrigin, validateEmbedOrigin, getKeyRexDomain, getCorsHeaders } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  // Handle CORS preflight
  // For callback, we need to allow both dashboard (Key-Rex domain) and embed (client domains)
  // Mobile wallets like Zeus may not send Origin header - allow requests without origin
  const origin = request.headers.get('origin')
  const keyrexDomain = getKeyRexDomain(request)
  
  // Allow Key-Rex domain or validate later in GET handler
  // Mobile wallets (Zeus, etc.) may not send origin - be permissive in OPTIONS
  if (origin && !validateDashboardOrigin(request, keyrexDomain)) {
    // Could be embed login or mobile wallet - validate in GET handler
    // For OPTIONS, we'll be permissive but validate in GET
  }
  
  // Set CORS headers - if no origin (mobile wallet), still allow the request
  const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
  
  // For mobile wallets without origin, allow all origins in preflight
  // (actual validation happens in GET handler)
  if (!origin) {
    // Mobile wallet request - allow in preflight, validate in GET
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }
  
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent brute force attacks and cost abuse
  // NOTE: QR code authentication polls every 1 second for up to 60 seconds (60 requests)
  // Limit set to 60/min to allow legitimate authentication while still preventing abuse
  const { rateLimitMiddleware } = await import('@/lib/rate-limit')
  const rateLimit = rateLimitMiddleware(request, 60, 60000) // 60 requests per minute (allows full QR polling window)
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  // SECURITY: Request body size limit check (for GET, check URL length)
  if (request.url.length > 2048) {
    return NextResponse.json({ error: 'Request URL too long' }, { status: 414 })
  }
  
  // Always log callback requests (critical for diagnosing mobile wallet auth issues)
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const reqOrigin = request.headers.get('origin')
  const isLikelyWallet = !reqOrigin && !userAgent.includes('Mozilla')
  console.log('=== /api/auth/callback ===', {
    time: new Date().toISOString(),
    url: request.url.substring(0, 300),
    ua: userAgent.substring(0, 100),
    origin: reqOrigin || 'none',
    isLikelyWallet,
  })

  const searchParams = request.nextUrl.searchParams
  // Get k1 - handle case where there might be extra query params
  let k1 = searchParams.get('k1')
  // If k1 has extra stuff after it (like &t=timestamp), clean it
  if (k1 && k1.includes('&')) {
    k1 = k1.split('&')[0]
    console.log('Cleaned k1 (removed extra params):', k1.substring(0, 20) + '...')
  }
  const sig = searchParams.get('sig')
  const key = searchParams.get('key')
  const siteId = searchParams.get('siteId')
  const tag = searchParams.get('tag')

  // Always log params for wallet callbacks (sig+key present) to diagnose mobile issues
  if (sig || key || isLikelyWallet) {
    console.log('WALLET CALLBACK params:', {
      k1: k1 ? `present (${k1.length} chars): ${k1.substring(0, 20)}...` : 'MISSING/EMPTY',
      k1_raw: k1 === null ? 'null' : k1 === '' ? 'empty_string' : `truthy(${k1.length})`,
      sig: sig ? `present (${sig.length} chars)` : 'MISSING',
      key: key ? `present (${key.length} chars)` : 'MISSING',
      tag: tag || 'none',
      siteId: siteId || 'none',
      allParams: Array.from(searchParams.entries()).map(([k, v]) => `${k}=${v.substring(0, 20)}`).join(', '),
    })
  }
  
  // If no sig/key, this could be:
  // 1. Initial LNURL-auth request - return the auth parameters
  // 2. Client trying to retrieve xpub after Alby called the callback
  //    (check if we have a stored session for this k1)
  if (!sig || !key) {
    if (!k1) {
      return NextResponse.json({ error: 'Missing k1 parameter' }, { status: 400 })
    }
    
    // Check if this is a retrieval request (client trying to get xpub after callback)
    // Clean k1 first to ensure consistent lookup
    const cleanK1ForRetrieval = k1.split('&')[0].split('?')[0]
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Retrieval request: Original k1:', k1.substring(0, 20) + '...')
      console.log('Retrieval request: Cleaned k1:', cleanK1ForRetrieval.substring(0, 20) + '...')
    }
    
    // Try both in-memory storage and cookies
    const { getAuthSession } = await import('@/lib/storage')
    let storedXpub = await getAuthSession(cleanK1ForRetrieval)
    
    if (process.env.NODE_ENV === 'development' && storedXpub) {
      console.log('Retrieval request: Found xpub in storage')
    }
    
    if (storedXpub) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Retrieval request: Found stored xpub for k1:', k1.substring(0, 20) + '...')
      }

      // SECURITY: Validate origin for embedded logins
      let siteValidated = false
      if (siteId) {
        const user = await getUserBySiteId(siteId)
        if (user) {
          const origin = request.headers.get('origin')

          // Always validate origin if present (check verified domains only)
          if (origin) {

            // Extract domain from origin
            let requestDomain: string | null = null
            try {
              const url = new URL(origin)
              requestDomain = url.hostname
            } catch {
              requestDomain = origin.replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0]
            }

            // Test domains are always allowed
            if (requestDomain && !isTestDomain(requestDomain)) {
              // Allow requests from KeyRex's own domain (the QR page is hosted on KeyRex
              // and polls this endpoint with siteId during the auth flow)
              const keyrexDomain = getKeyRexDomain(request)
              const isKeyrexOrigin = requestDomain === keyrexDomain || requestDomain.endsWith('.' + keyrexDomain)

              if (!isKeyrexOrigin) {
                const verifiedDomains = await getVerifiedDomains(user.xpub)

                // If user has no verified domains, block authentication from production domains
                if (verifiedDomains.length === 0) {
                  return NextResponse.json({
                    error: 'No verified domains found. Please add and verify at least one domain in your dashboard before using authentication.'
                  }, { status: 403 })
                }

                // Check if domain is in verified list
                if (!validateEmbedOrigin(request, verifiedDomains, user.xpub)) {
                  console.warn('CORS: Invalid origin for xpub retrieval:', origin, 'siteId:', siteId)
                  return NextResponse.json({ error: 'Origin not authorized' }, { status: 403 })
                }
              }
            }
          }
          siteValidated = true
        }
      }

      // Issue a signed login token for embedded logins (the raw xpub is not a credential)
      let token: string | null = null
      if (siteId && siteValidated) {
        const challenge = await getAuthChallenge(cleanK1ForRetrieval)
        if (challenge && (!challenge.siteId || challenge.siteId === siteId)) {
          token = await issueLoginToken({
            xpub: storedXpub,
            siteId,
            issuer: getIssuer(request),
            nonce: challenge.nonce,
          })
        }
      }

      const response = NextResponse.json({
        status: 'OK',
        xpub: storedXpub,
        ...(token ? { token } : {}),
      })
      
      // Set CORS headers based on validated origin
      const origin = request.headers.get('origin')
      const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      
      return response
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Initial LNURL-auth request (no sig/key yet)')
    }
    
    // Return LNURL-auth response per LUD-04 spec
    // Only tag, k1, and optional action — no callback field (wallet uses the decoded URL)
    const initialResponse = NextResponse.json({
      tag: 'login',
      k1: k1,
      action: 'login',
    })
    
    // Set CORS headers based on origin
    const origin = request.headers.get('origin')
    const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
    Object.entries(corsHeaders).forEach(([key, value]) => {
      initialResponse.headers.set(key, value)
    })
    
    return initialResponse
  }
  
  // If we have sig and key, this is the authentication response
  if (!k1) {
    return NextResponse.json({ error: 'Missing k1 parameter' }, { status: 400 })
  }
  
  // Verify k1 matches stored challenge (optional check - for security)
  const storedChallenge = request.cookies.get('auth_challenge')?.value
  if (storedChallenge && storedChallenge !== k1) {
    console.warn('k1 challenge mismatch:', {
      received: k1.substring(0, 16) + '...',
      stored: storedChallenge.substring(0, 16) + '...',
    })
    // Still proceed - might be from different session
  }
  
  // Log the received parameters for debugging (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('=== LNURL-auth callback received - AUTHENTICATION IN PROGRESS ===')
    console.log('This confirms that your wallet is authenticating the request')
    console.log('k1 (challenge):', k1.substring(0, 32) + '...')
    console.log('sig (signature):', sig ? sig.substring(0, 32) + '...' : 'MISSING')
    console.log('key (public key):', key ? key.substring(0, 32) + '...' : 'MISSING')
    console.log('sig length:', sig?.length)
    console.log('key length:', key?.length)
    console.log('Verifying cryptographic signature...')
  }
  
  console.log('Verifying signature for k1:', k1.substring(0, 20) + '...', 'k1_length:', k1.length, 'sig_length:', sig?.length, 'key_length:', key?.length)
  const isValid = verifySignature(k1, sig, key)
  console.log('Signature verification result:', isValid ? 'VALID' : 'INVALID')

  if (!isValid) {
    console.error('AUTH FAILED: Signature verification failed. k1_length:', k1.length, 'k1_first20:', k1.substring(0, 20), 'sig_length:', sig?.length, 'key_length:', key?.length)
    return NextResponse.json({
      error: 'Invalid signature - cryptographic verification failed',
      details: 'The signature from your wallet could not be verified. Please try again.'
    }, { status: 401 })
  }
  
  // Always log signature verification success (critical for mobile auth debugging)
  console.log('AUTH SUCCESS: Signature verified for k1:', k1.substring(0, 20) + '...')

  // SECURITY: The k1 must have been issued by us and may be used for exactly one verified
  // signature. This blocks replay of captured (k1, sig, key) and self-chosen challenges.
  const { consumeAuthChallenge } = await import('@/lib/storage')
  if (!(await consumeAuthChallenge(k1, siteId))) {
    console.warn('AUTH FAILED: k1 unknown, expired, already used, or bound to another site')
    return NextResponse.json({
      error: 'Invalid or expired challenge. Please start a new login.'
    }, { status: 401 })
  }

  // NOTE: the auth session (k1 -> xpub) is marked as used later by /api/auth/set-session
  // after the browser retrieves the xpub.

  // Derive xpub from pubkey
  const xpub = deriveXpub(key)

  // Store k1 -> xpub mapping for client to retrieve
  // Clean k1 first to ensure consistent storage
  const cleanK1 = k1.split('&')[0].split('?')[0]

  console.log('Storing auth session:', { k1_prefix: cleanK1.substring(0, 20), k1_length: cleanK1.length, xpub_prefix: xpub.substring(0, 16) })

  const { storeAuthSession } = await import('@/lib/storage')
  await storeAuthSession(cleanK1, xpub)

  console.log('AUTH SESSION STORED successfully for k1:', cleanK1.substring(0, 20) + '...')

  
  // Verify it was stored
  const { getAuthSession } = await import('@/lib/storage')
  const verify = await getAuthSession(cleanK1)
  
  if (process.env.NODE_ENV === 'development' && verify) {
    console.log('Verification: Session stored and xpub matches')
  }
  
  // If siteId is provided, this is an embedded login - validate origin
  if (siteId) {
    const { recordLogin } = await import('@/lib/storage')

    // Check if siteId belongs to a valid user
    const user = await getUserBySiteId(siteId)
    if (!user) {
      return NextResponse.json({ error: 'Invalid siteId' }, { status: 404 })
    }
    
    // Validate origin for embed login (check verified domains only)
    const origin = request.headers.get('origin')
    if (origin) {
      
      // Extract domain from origin
      let requestDomain: string | null = null
      try {
        const url = new URL(origin)
        requestDomain = url.hostname
      } catch {
        requestDomain = origin.replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0]
      }
      
      // Test domains are always allowed
      if (requestDomain && !isTestDomain(requestDomain)) {
        const verifiedDomains = await getVerifiedDomains(user.xpub)

        // If user has no verified domains, block authentication from production domains
        if (verifiedDomains.length === 0) {
          return NextResponse.json({ 
            error: 'No verified domains found. Please add and verify at least one domain in your dashboard before using authentication.' 
          }, { status: 403 })
        }
        
        // Check if domain is in verified list
        if (!validateEmbedOrigin(request, verifiedDomains, user.xpub)) {
          console.warn('CORS: Invalid origin for embed login:', origin, 'siteId:', siteId)
          return NextResponse.json({ error: 'Origin not authorized' }, { status: 403 })
        }
      }
    }
    
    // All users are free users - no subscription check needed

    // Record login
    await recordLogin(siteId, key)

    // LUD-04 spec: wallet expects { status: "OK" } after successful auth
    // Include a return URL so wallets that support it can redirect back to the browser
    const returnToQrUrl = `${request.nextUrl.origin}/embed/qr?siteId=${encodeURIComponent(siteId)}&k1=${encodeURIComponent(cleanK1)}&redirect=true&authenticated=true`
    const response = NextResponse.json({
      status: 'OK',
      xpub,
      // Return URL for wallets that support redirect-after-auth
      url: returnToQrUrl,
      // successAction format (from LUD-09) - some wallets check this for LNURL-auth too
      successAction: { tag: 'url', description: 'Return to browser', url: returnToQrUrl },
    })

    // Set CORS headers for embed login
    const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
  
  // Otherwise, this is a dashboard login
  // Get or create user
  let user = await getUserByXpub(xpub)
  if (!user) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Creating new user for xpub:', xpub.substring(0, 16) + '...')
    }
    const newSiteId = generateSiteId()
    user = await createUser(xpub, newSiteId)
    if (process.env.NODE_ENV === 'development') {
      console.log('User created with siteId:', newSiteId)
    }
  }
  
  // Double-check user exists
  const verifyUser = await getUserByXpub(xpub)
  if (!verifyUser) {
    if (process.env.NODE_ENV === 'development') {
      console.error('CRITICAL: User was not created or cannot be retrieved!')
    }
    return NextResponse.json({ 
      status: 'ERROR',
      error: 'Failed to create user account'
    }, { status: 500 })
  }
  
  // Return JSON response (LNURL-auth spec) - WebLN expects { status: 'OK' }
  // Also include the xpub in the response so the browser can set the cookie
  // Include return URL for wallets that support redirect-after-auth
  const returnToDashboardUrl = `${request.nextUrl.origin}/embed/qr?k1=${encodeURIComponent(cleanK1)}&authenticated=true`
  const response = NextResponse.json({
    status: 'OK',
    xpub: xpub,
    url: returnToDashboardUrl,
    successAction: { tag: 'url', description: 'Return to browser', url: returnToDashboardUrl },
  })
  
  // Set CORS headers for dashboard login (Key-Rex domain)
  // Mobile wallets like Zeus may not send Origin header - allow requests without origin
  const origin = request.headers.get('origin')
  const keyrexDomain = getKeyRexDomain(request)
  
  // For dashboard logins, validate Key-Rex domain only if origin is present
  // Mobile wallets (Zeus, etc.) may not send origin - allow those requests
  if (origin) {
    if (!validateDashboardOrigin(request, keyrexDomain)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('CORS: Invalid origin for dashboard login:', origin)
      }
      // Still allow for now (mobile wallets might send unexpected origins), but log warning
    }
    
    // Set CORS headers only if origin is present
    const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
  } else {
    // No origin header - likely a mobile wallet (Zeus, etc.)
    // Allow the request but don't set CORS headers (not needed for non-browser requests)
    if (process.env.NODE_ENV === 'development') {
      console.log('Callback request without origin header - likely mobile wallet (Zeus, etc.)')
    }
  }
  
  // Try to set cookie (may not work in Alby's context, but worth trying)
  response.cookies.set('user_xpub', xpub, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // SECURITY: Reduced from 1 year to 30 days
  })
  
  if (process.env.NODE_ENV === 'development') {
    console.log('=== Dashboard login successful ===')
    console.log('Returning JSON with xpub:', xpub.substring(0, 16) + '...')
    console.log('User in storage:', (await getUserByXpub(xpub)) ? 'YES' : 'NO')
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('User data:', {
      xpub: verifyUser.xpub.substring(0, 20) + '...',
      siteId: verifyUser.siteId,
      subscribed: verifyUser.subscribed
    })
    console.log('Response headers being set:', {
      'Set-Cookie': `user_xpub=${xpub.substring(0, 20)}...`,
      'Content-Type': 'application/json'
    })
    console.log('NOTE: Cookie may not be set in browser if called from Alby extension context')
    console.log('The client-side code should call /api/auth/set-session to set the cookie')
  }
  
  return response
}



