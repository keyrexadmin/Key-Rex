import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware to protect dashboard routes
 * 
 * This middleware provides an additional layer of security by:
 * 1. Checking for authentication cookie before allowing dashboard access
 * 2. Redirecting unauthenticated users to home page
 * 
 * Note: Wizard completion check (freeDisclaimerAccepted) is handled by
 * the dashboard page component itself, as it requires access to user storage.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Protect dashboard route
  if (pathname.startsWith('/dashboard')) {
    const userXpub = request.cookies.get('user_xpub')?.value
    
    // If no authentication cookie, redirect to home
    if (!userXpub) {
      console.log('[Middleware] Unauthenticated access attempt to dashboard, redirecting to home')
      const url = new URL('/', request.url)
      // Add wizard=true to encourage user to complete setup
      url.searchParams.set('wizard', 'true')
      return NextResponse.redirect(url)
    }
    
    // User has authentication cookie - allow through
    // Dashboard page component will check freeDisclaimerAccepted
    console.log('[Middleware] Authenticated user accessing dashboard')
  }
  
  // Allow all other routes to pass through
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     * - embed (embed script routes)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|embed).*)',
  ],
}

