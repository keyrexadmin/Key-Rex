/**
 * Rate limiting utility to prevent DoS and brute force attacks
 * Uses in-memory storage (for serverless, consider Redis in production)
 */

interface RateLimitRecord {
  count: number
  resetAt: number
}

// In-memory rate limit storage
// In production with multiple instances, use Redis or similar
const rateLimitStore = new Map<string, RateLimitRecord>()

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP address, xpub, etc.)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  if (!record || now > record.resetAt) {
    // No record or expired - create new window
    const resetAt = now + windowMs
    rateLimitStore.set(identifier, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
    }
  }

  if (record.count >= maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    }
  }

  // Increment count
  record.count++
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: record.resetAt,
  }
}

/**
 * Get client IP address from request (handles proxies correctly)
 * @param request - Next.js request object
 * @returns Client IP address or 'unknown'
 */
export function getClientIP(request: { headers: Headers }): string {
  // Behind Vercel/Cloudflare - X-Forwarded-For contains: client, proxy1, proxy2
  // We want the ORIGINAL client IP (first in chain, but last in X-Forwarded-For)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // Split by comma and take the FIRST IP (original client)
    // Note: Some proxies put original client first, some last
    // Vercel puts original client FIRST
    const ips = forwarded.split(',').map(ip => ip.trim())
    const clientIP = ips[0] // Vercel puts original client first
    
    // Validate IP format (basic check)
    if (/^[\d.:a-fA-F]+$/.test(clientIP)) {
      return clientIP
    }
  }

  // Fallback to X-Real-IP (single IP header)
  const realIP = request.headers.get('x-real-ip')
  if (realIP && /^[\d.:a-fA-F]+$/.test(realIP)) {
    return realIP
  }

  return 'unknown'
}

/**
 * Rate limit middleware for API routes
 * Returns 429 if rate limited
 * @param request - Request object with headers, optionally with identifier for per-user limiting
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 */
export function rateLimitMiddleware(
  request: { headers: Headers; identifier?: string },
  maxRequests: number,
  windowMs: number
): { allowed: boolean; response?: Response; remaining?: number; resetAt?: number } {
  // Use provided identifier (e.g., xpub for authenticated users) or fall back to IP
  const identifier = request.identifier || getClientIP(request)
  const result = checkRateLimit(identifier, maxRequests, windowMs)

  if (!result.allowed) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetAt.toString(),
          },
        }
      ),
    }
  }

  return {
    allowed: true,
    remaining: result.remaining,
    resetAt: result.resetAt,
  }
}

