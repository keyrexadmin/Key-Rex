import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware to protect dashboard routes and enable CORS for embed
 * 
 * This middleware provides:
 * 1. Dashboard protection with authentication checking
 * 2. Wizard completion verification
 * 3. CORS headers for embed and auth API routes (for cross-origin embedding)
 */
export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // Add CORS headers for embed and auth API routes
    if (pathname.startsWith('/embed') || pathname.startsWith('/api/embed') || 
        pathname.startsWith('/api/auth') || pathname.startsWith('/api/verify')) {
      const response = NextResponse.next()
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      
      // Handle OPTIONS preflight requests
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, { status: 200, headers: response.headers })
      }
      
      return response
    }

    // Protect dashboard route only
    // Early return if not a dashboard route to avoid any imports
    if (!pathname.startsWith('/dashboard')) {
      return NextResponse.next()
    }

    // Only import and use cookie verification for dashboard routes
    const { verifyUserSessionEdge } = await import('@/lib/session-edge')
    const userXpub = await verifyUserSessionEdge(request.cookies.get('user_xpub')?.value)

    // If no authentication cookie, redirect to home
    if (!userXpub) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Middleware] Unauthenticated access attempt to dashboard, redirecting to home')
      }
      const url = new URL('/', request.url)
      // Add wizard=true to encourage user to complete setup
      url.searchParams.set('wizard', 'true')
      return NextResponse.redirect(url)
    }

    // SECURITY: Check if user has completed wizard (freeDisclaimerAccepted)
    // Check backup cookie for wizard completion status
    // Use Edge-compatible version for cookie verification
    const backupCookie = request.cookies.get('user_subscription_backup')?.value
    if (backupCookie) {
      try {
        // Lazy import to avoid module-level execution issues
        const { verifyCookieDataEdge } = await import('@/lib/cookie-signing-edge')
        const backupData = await verifyCookieDataEdge(backupCookie)
        if (backupData && !backupData.freeDisclaimerAccepted) {
          // User hasn't completed wizard - redirect to home with wizard
          if (process.env.NODE_ENV === 'development') {
            console.log('[Middleware] User has not completed wizard, redirecting to home')
          }
          const url = new URL('/', request.url)
          url.searchParams.set('wizard', 'true')
          return NextResponse.redirect(url)
        }
      } catch (error) {
        // Cookie verification failed (invalid signature) - let dashboard handle it
        if (process.env.NODE_ENV === 'development') {
          console.log('[Middleware] Cookie verification failed, allowing through - dashboard will verify')
        }
      }
    } else {
      // No backup cookie - redirect to home to complete wizard
      if (process.env.NODE_ENV === 'development') {
        console.log('[Middleware] No backup cookie found, redirecting to home to complete wizard')
      }
      const url = new URL('/', request.url)
      url.searchParams.set('wizard', 'true')
      return NextResponse.redirect(url)
    }

    // User has authentication cookie and has completed wizard - allow through
    if (process.env.NODE_ENV === 'development') {
      console.log('[Middleware] Authenticated user with completed wizard accessing dashboard')
    }
    return NextResponse.next()
  } catch (error) {
    // If middleware fails, log error and allow request through (fail open for safety)
    // Dashboard page component will also verify and redirect if needed
    if (process.env.NODE_ENV === 'development') {
      console.error('[Middleware] Error in middleware:', error)
    }
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/embed/:path*',
    '/api/embed/:path*',
    '/api/auth/:path*',
    '/api/verify/:path*',
  ],
}

