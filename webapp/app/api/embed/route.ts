import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub } from '@/lib/storage'
import { rateLimitMiddleware, getClientIP } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  // SECURITY: Rate limiting - prevent cost abuse (public endpoint, per-IP)
  const identifier = getClientIP(request)
  const rateLimit = rateLimitMiddleware({ headers: request.headers, identifier }, 30, 60000) // 30 requests per minute per IP
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  const xpub = request.cookies.get('user_xpub')?.value
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') || 'branded'
  
  if (!xpub) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  
  const user = getUserByXpub(xpub)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
  const embedUrl = `${baseUrl}/embed?siteId=${user.siteId}`
  
  // Updated embed code - now fetches config from server dynamically
  // No need for branded parameter - config is fetched from server
  return NextResponse.json({
    code: `<script src="${embedUrl}"></script>\n<script>KeyRex.init();</script>`,
  })
}







