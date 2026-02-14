import { NextRequest, NextResponse } from 'next/server'
import { getUserBySiteId, getAllUsers, getVerifiedDomains } from '@/lib/storage'
import { getFeaturedWallets } from '@/lib/storage'
import { EmbedConfig, FeaturedWallet } from '@/types'
import { validateEmbedOrigin, getCorsHeaders } from '@/lib/cors'
import { rateLimitMiddleware, getClientIP } from '@/lib/rate-limit'
import { isTestDomain } from '@/lib/utils'

function getBaseUrl(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
}

export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent cost abuse (public endpoint, per-IP)
  const identifier = getClientIP(request)
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 30, 60000) // 30 requests per minute per IP
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  const searchParams = request.nextUrl.searchParams
  const siteId = searchParams.get('siteId')

  // Get featured wallets (only enabled ones, sorted by priority)
  // These are global and available to all users
  const featuredWallets = await getFeaturedWallets()

  // If no siteId provided, return default config (for landing page preview)
  // Use same footer text as actual embed script so previews match
  if (!siteId) {
    const config: EmbedConfig = {
      siteId: '',
      buttonText: 'Sign in with Key-Rex',
      showBranding: true,
      featuredWallets, // Include featured wallets for landing page
      footerText: 'Powered by Key-Rex — open-source', // Match actual embed script
      integrationEnabled: true, // Default to enabled for preview
    }

    // For preview (no siteId), allow any origin (it's public)
    const origin = request.headers.get('origin')
    const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS', 'Content-Type, Cache-Control')
    
    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'public, max-age=60', // 1 minute cache - allows quick updates
        ...corsHeaders,
      },
    })
  }

  // Get user by siteId (for dashboard preview)
  const user = await getUserBySiteId(siteId)

  // Validate origin for embed config requests (check verified domains only)
  const origin = request.headers.get('origin')
  if (user && origin) {
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
      
      // If user has no verified domains, block config requests from production domains
      if (verifiedDomains.length === 0) {
        return NextResponse.json({ 
          error: 'No verified domains found. Please add and verify at least one domain in your dashboard.' 
        }, { 
          status: 403,
          headers: getCorsHeaders(origin, 'GET, OPTIONS', 'Content-Type, Cache-Control')
        })
      }
      
      // Check if domain is in verified list
      if (!validateEmbedOrigin(request, verifiedDomains, user.xpub)) {
        console.warn('CORS: Invalid origin for config request:', origin, 'siteId:', siteId)
        return NextResponse.json({ 
          error: 'Origin not authorized' 
        }, { 
          status: 403,
          headers: getCorsHeaders(origin, 'GET, OPTIONS', 'Content-Type, Cache-Control')
        })
      }
    }
  }
  
  // Debug logging
  console.log('=== Config API called ===')
  console.log('Requested siteId:', siteId)
  console.log('User found:', !!user)
  const allUsers = await getAllUsers()
  console.log('Total users in storage:', allUsers.length)
  console.log('All siteIds in storage:', allUsers.map(u => u.siteId))

  if (!user) {
    // In development, return a default config so the card can still render
    // This helps with the storage persistence issue in Next.js dev mode
    if (process.env.NODE_ENV === 'development') {
      console.warn('Config API: User not found in storage (dev mode) - returning default config')
      
      // Ensure we have featured wallets (use defaults if storage is empty)
      const baseUrl = getBaseUrl(request)
      const now = Date.now()
      const defaultWallets: FeaturedWallet[] = featuredWallets.length > 0 ? featuredWallets : [
        { 
          id: 'alby-default',
          name: 'Alby', 
          downloadUrl: 'https://getalby.com', 
          logoUrl: baseUrl + '/images/wallets/alby-logo.svg',
          enabled: true,
          priority: 1,
          createdAt: now,
          updatedAt: now
        },
        { 
          id: 'phoenix-default',
          name: 'Phoenix', 
          downloadUrl: 'https://phoenix.acinq.co', 
          logoUrl: baseUrl + '/images/wallets/phoenix-logo.svg',
          enabled: true,
          priority: 2,
          createdAt: now,
          updatedAt: now
        },
        { 
          id: 'zeus-default',
          name: 'Zeus', 
          downloadUrl: 'https://zeusln.app', 
          logoUrl: baseUrl + '/images/wallets/zeus-logo.svg',
          enabled: true,
          priority: 3,
          createdAt: now,
          updatedAt: now
        }
      ]
      
      const defaultConfig: EmbedConfig = {
        siteId,
        buttonText: 'Sign in with Key-Rex',
        showBranding: true,
        featuredWallets: defaultWallets,
        footerText: 'Powered by Key-Rex — open-source',
        integrationEnabled: true,
      }
      // In dev mode, only set CORS for localhost origins (security: don't allow arbitrary origins)
      // Allow localhost:3001 (fake client) and localhost:3000 (Key-Rex)
      const isLocalhost = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))
      const corsHeaders = isLocalhost ? getCorsHeaders(origin, 'GET, OPTIONS', 'Content-Type, Cache-Control') : {}
      return NextResponse.json(defaultConfig, {
        headers: {
          'Cache-Control': 'public, max-age=60',
          ...corsHeaders,
        },
      })
    }
    
    // In production, return 404
    // Don't set CORS headers for invalid siteId (security: don't leak info)
    console.log('Config API: siteId not found:', siteId)
    console.log('Config API: Available siteIds:', allUsers.map(u => u.siteId))
    return NextResponse.json({ 
      error: 'Invalid siteId',
      searchedSiteId: siteId,
      availableSiteIds: allUsers.map(u => u.siteId)
    }, { 
      status: 404
      // No CORS headers for invalid siteId
    })
  }

  // Check if integration is enabled
  if (user.integrationEnabled === false) {
    const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS', 'Content-Type, Cache-Control')
    return NextResponse.json({ 
      error: 'Integration is disabled',
      integrationEnabled: false 
    }, { 
      status: 403,
      headers: corsHeaders,
    })
  }

  // All users are now free users - simplified config
  // Determine button text and branding - all users get branded version
  let buttonText = 'Sign in with Key-Rex'
  let showBranding = true // All users see branding
  
  // Determine footer text - default for all users
  let footerText = 'Powered by Key-Rex — open-source'
  
  // Build config
  const config: EmbedConfig = {
    siteId,
    buttonText,
    showBranding,
    featuredWallets,
    footerText,
    integrationEnabled: true, // If we got here, integration is enabled (disabled check happens earlier)
  }

  const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS', 'Content-Type, Cache-Control')
  return NextResponse.json(config, {
    headers: {
      'Cache-Control': 'public, max-age=60', // 1 minute cache - allows quick updates
      ...corsHeaders,
    },
  })
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS', 'Content-Type, Cache-Control')
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}


