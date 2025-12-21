# Additional Security Vulnerabilities Identified

**Date:** $(date)  
**Review Type:** Comprehensive Security Audit  
**Status:** ⚠️ **ADDITIONAL VULNERABILITIES FOUND**

---

## 🔴 CRITICAL VULNERABILITIES

### VULN-6: CORS Wildcard in Admin Login Endpoint

**Severity:** 🔴 **CRITICAL**  
**Location:** `app/api/admin/auth/login/route.ts:16, 94`

**Issue:**
```typescript
// OPTIONS handler
headers: {
  'Access-Control-Allow-Origin': '*',  // ❌ Allows ANY origin
  ...
}

// GET handler
response.headers.set('Access-Control-Allow-Origin', '*')  // ❌ Allows ANY origin
```

**Problem:**
- Admin login endpoint allows requests from **any origin** (`*`)
- Malicious website can call admin login endpoint and potentially intercept responses
- Even though signature verification protects authentication, this exposes the endpoint unnecessarily

**Attack Vector:**
1. Malicious site embeds iframe or makes fetch request to admin login endpoint
2. Can potentially read error messages or response structure
3. Could be used for reconnaissance or timing attacks

**Fix Required:**
```typescript
// Only allow Key-Rex domain for admin login
const keyrexDomain = getKeyRexDomain(request)
const origin = request.headers.get('origin')
if (origin && !validateDashboardOrigin(request, keyrexDomain)) {
  return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
}
const corsHeaders = getCorsHeaders(origin, 'GET, OPTIONS')
// Use corsHeaders instead of '*'
```

---

### VULN-7: No Rate Limiting on Authentication Endpoints

**Severity:** 🔴 **HIGH**  
**Affected Endpoints:**
- `/api/auth/lnurl` (challenge generation)
- `/api/auth/callback` (authentication)
- `/api/auth/login` (dashboard login)
- `/api/admin/auth/login` (admin login)
- `/api/verify` (embed verification)

**Problem:**
- No rate limiting on authentication endpoints
- Attacker can:
  - Generate unlimited k1 challenges (DoS)
  - Attempt unlimited authentication attempts
  - Brute force k1 values (though unlikely to succeed)
  - Overwhelm server with requests

**Impact:**
- **DoS Attack:** Generate thousands of challenges per second
- **Resource Exhaustion:** Fill in-memory storage with auth sessions
- **Brute Force:** Attempt many authentication attempts (though signature verification protects)

**Fix Required:**
- Implement rate limiting middleware
- Limit: 10 challenges per IP per minute
- Limit: 5 authentication attempts per IP per minute
- Use Redis or similar for distributed rate limiting

**Example:**
```typescript
// lib/rate-limit.ts
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  
  if (record.count >= maxRequests) {
    return false // Rate limit exceeded
  }
  
  record.count++
  return true
}
```

---

### VULN-8: XSS Vulnerability in FAQ Page

**Severity:** 🔴 **HIGH**  
**Location:** `app/faq/page.tsx:226`

**Issue:**
```typescript
<p className="text-white/200 text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: faq.a }} />
```

**Problem:**
- FAQ answers are rendered using `dangerouslySetInnerHTML`
- If FAQ data comes from user input or external source, XSS is possible
- Even if FAQ data is hardcoded, this is a dangerous pattern

**Attack Vector:**
1. If FAQ data is ever loaded from database or API
2. Attacker injects malicious HTML/JavaScript
3. Script executes in user's browser
4. Can steal cookies, session tokens, etc.

**Fix Required:**
- Use React's default text rendering (no `dangerouslySetInnerHTML`)
- If HTML is needed, sanitize with DOMPurify
- Or use a markdown renderer with XSS protection

**Example:**
```typescript
// Safe: Use React's default rendering
<p className="text-white/200 text-base leading-relaxed">{faq.a}</p>

// Or if HTML is required:
import DOMPurify from 'isomorphic-dompurify'
<p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(faq.a) }} />
```

---

### VULN-9: Weak Cookie Secret Default Value

**Severity:** 🔴 **HIGH**  
**Location:** `lib/cookie-signing.ts:8`

**Issue:**
```typescript
const COOKIE_SECRET = process.env.COOKIE_SECRET || process.env.NEXT_PUBLIC_COOKIE_SECRET || 'default-secret-change-in-production'
```

**Problem:**
- Default secret is hardcoded and predictable
- If `COOKIE_SECRET` is not set in production, all cookies can be forged
- `NEXT_PUBLIC_COOKIE_SECRET` is exposed to client-side (should NEVER be used for signing)

**Impact:**
- Attacker can forge `user_subscription_backup` cookies
- Can impersonate any user
- Can modify subscription data, domains, etc.

**Fix Required:**
```typescript
const COOKIE_SECRET = process.env.COOKIE_SECRET

if (!COOKIE_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL: COOKIE_SECRET environment variable must be set in production')
  }
  // Only allow default in development
  console.warn('⚠️  WARNING: Using default COOKIE_SECRET - DO NOT USE IN PRODUCTION')
}

// NEVER use NEXT_PUBLIC_COOKIE_SECRET for signing (it's exposed to client)
```

---

## 🟡 MEDIUM VULNERABILITIES

### VULN-10: Information Disclosure in Console Logs

**Severity:** 🟡 **MEDIUM**  
**Location:** Multiple files (100+ instances)

**Issue:**
- Extensive `console.log` statements throughout codebase
- Logs include:
  - Full xpub values (`console.log('Full xpub:', xpub)`)
  - Admin xpub in error messages
  - Request headers (may contain sensitive data)
  - Full URLs with parameters

**Problem:**
- Console logs may be visible in:
  - Server logs (Vercel, production)
  - Browser console (client-side)
  - Error tracking services (Sentry, etc.)
- Sensitive data could be exposed

**Examples:**
```typescript
// app/api/auth/callback/route.ts:337
console.log('Full xpub:', xpub)  // ❌ Full xpub logged

// app/api/admin/auth/login/route.ts:79
derivedXpub: xpub, // Include in response for debugging  // ❌ Exposed in error response

// app/api/auth/callback/route.ts:31
console.log('Request headers:', Object.fromEntries(request.headers.entries()))  // ❌ May contain sensitive headers
```

**Fix Required:**
- Remove or truncate sensitive data in logs
- Use environment-based logging (only log in development)
- Sanitize logs before sending to error tracking

**Example:**
```typescript
// Safe logging
console.log('xpub:', xpub ? xpub.substring(0, 8) + '...' : 'NOT FOUND')

// Remove sensitive data from error responses in production
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
} else {
  return NextResponse.json({ error: 'Unauthorized', derivedXpub: xpub }, { status: 403 })
}
```

---

### VULN-11: Admin Xpub Exposed in Error Responses

**Severity:** 🟡 **MEDIUM**  
**Location:** `app/api/admin/auth/login/route.ts:79`

**Issue:**
```typescript
return NextResponse.json({ 
  error: 'Unauthorized - this xpub is not authorized for admin access',
  derivedXpub: xpub, // ❌ Include in response for debugging
  adminXpubSet: !!adminXpub
}, { status: 403 })
```

**Problem:**
- Error response includes `derivedXpub` which could help attacker
- Reveals information about authentication attempts
- Could be used for reconnaissance

**Fix Required:**
- Remove `derivedXpub` from production error responses
- Only include in development mode

---

### VULN-12: No Request Body Size Limits

**Severity:** 🟡 **MEDIUM**  
**Affected:** All POST endpoints

**Problem:**
- No explicit limits on request body size
- Attacker could send very large JSON payloads
- Could cause:
  - Memory exhaustion
  - DoS attacks
  - Slow parsing

**Fix Required:**
- Add body size limits (e.g., 1MB max)
- Reject oversized requests early
- Use Next.js body size limits or custom middleware

**Example:**
```typescript
export async function POST(request: NextRequest) {
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }
  // ... rest of handler
}
```

---

### VULN-13: Missing Security Headers

**Severity:** 🟡 **MEDIUM**  
**Location:** No security headers found in codebase

**Missing Headers:**
- `Content-Security-Policy` (CSP) - Prevents XSS
- `X-Frame-Options` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `Strict-Transport-Security` (HSTS) - Forces HTTPS
- `Referrer-Policy` - Controls referrer information
- `Permissions-Policy` - Controls browser features

**Impact:**
- Vulnerable to XSS attacks
- Vulnerable to clickjacking
- No HTTPS enforcement
- Information leakage via referrer

**Fix Required:**
- Add security headers middleware or Next.js config
- Implement CSP policy
- Add HSTS for production

**Example (next.config.js):**
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ]
  }
}
```

---

### VULN-14: IP Address Spoofing Vulnerability

**Severity:** 🟡 **MEDIUM**  
**Location:** `app/api/contact/route.ts:38-40`, `app/api/user/route.ts:30-31`, `app/api/disclaimer/route.ts:51-52`

**Issue:**
```typescript
const ipAddress = request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown'
```

**Problem:**
- IP addresses taken from headers without validation
- Headers can be spoofed by attackers
- `X-Forwarded-For` can contain multiple IPs (comma-separated)
- First IP might be attacker's IP, not real client IP

**Impact:**
- Incorrect IP logging
- Rate limiting bypass (if implemented)
- Analytics data corruption
- Security logging inaccuracy

**Fix Required:**
- Validate IP addresses
- Handle comma-separated IPs correctly (take last, not first)
- Trust only when behind known proxy (Vercel, Cloudflare, etc.)

**Example:**
```typescript
function getClientIP(request: NextRequest): string {
  // Behind Vercel/Cloudflare - trust X-Forwarded-For
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // Take the LAST IP (original client), not first
    const ips = forwarded.split(',').map(ip => ip.trim())
    const clientIP = ips[ips.length - 1]
    // Validate IP format
    if (/^[\d.]+$/.test(clientIP)) {
      return clientIP
    }
  }
  // Fallback
  return request.headers.get('x-real-ip') || 'unknown'
}
```

---

### VULN-15: Long Session Cookie Lifetime

**Severity:** 🟡 **MEDIUM**  
**Location:** Multiple files

**Issue:**
```typescript
maxAge: 60 * 60 * 24 * 365, // 1 year
```

**Problem:**
- Session cookies last 1 year
- If cookie is stolen, attacker has access for 1 year
- No session refresh mechanism
- No way to revoke sessions

**Impact:**
- Stolen cookies remain valid for extended period
- No automatic session rotation
- Difficult to revoke compromised sessions

**Recommendation:**
- Reduce to 30 days
- Implement session refresh tokens
- Add "Remember Me" option for longer sessions
- Implement session revocation

---

### VULN-16: Missing CSRF Protection

**Severity:** 🟡 **MEDIUM**  
**Affected:** All state-changing endpoints (POST, PUT, DELETE)

**Problem:**
- No CSRF tokens on state-changing requests
- Relies on `SameSite: lax` cookies only
- `SameSite: lax` doesn't protect against:
  - GET-based state changes (if any)
  - Some edge cases in older browsers

**Impact:**
- Potential CSRF attacks on:
  - Domain management (add/remove domains)
  - Integration toggle
  - Contact form submission
  - User deletion

**Fix Required:**
- Add CSRF tokens for state-changing operations
- Or use `SameSite: strict` (may break some flows)
- Verify `Origin` header matches expected domain

**Example:**
```typescript
// Generate CSRF token on page load
// Include in all POST/PUT/DELETE requests
// Verify token on server
```

---

### VULN-17: No Input Length Validation

**Severity:** 🟡 **MEDIUM**  
**Affected:** Domain input, contact form, etc.

**Problem:**
- No maximum length validation on:
  - Domain names
  - Contact form fields (name, email, subject, message)
  - Other user inputs

**Impact:**
- DoS via extremely long inputs
- Database/storage issues
- Memory exhaustion

**Fix Required:**
- Add length limits:
  - Domain: 253 characters (RFC 1035)
  - Email: 254 characters (RFC 5321)
  - Name: 100 characters
  - Subject: 200 characters
  - Message: 10,000 characters

---

### VULN-18: Domain Validation Bypass Potential

**Severity:** 🟡 **MEDIUM**  
**Location:** `lib/storage.ts:400-418`, `lib/utils.ts` (validateDomain)

**Issue:**
- Domain normalization may have edge cases
- Subdomain matching logic: `normalized.endsWith('.' + normalizedAllowed)`
- Could potentially allow bypass with crafted domains

**Example Attack:**
- If allowed domain is `example.com`
- Attacker tries `evilexample.com` (should be blocked)
- But `subdomain.evilexample.com` would be blocked correctly
- Need to verify exact matching logic

**Fix Required:**
- Review domain validation logic thoroughly
- Add tests for edge cases:
  - `evilexample.com` vs `example.com`
  - `example.com.evil.com` vs `example.com`
  - Unicode domains
  - IDN homograph attacks

---

### VULN-19: Admin Session Cookie Not Marked as Used

**Severity:** 🟡 **MEDIUM**  
**Location:** `app/api/admin/auth/login/route.ts`

**Issue:**
- Admin login doesn't mark k1 as used after successful authentication
- Same k1 could potentially be reused (though unlikely due to signature verification)

**Fix Required:**
- Mark k1 as used after admin authentication (same as regular login)

---

### VULN-20: Missing HTTPS Enforcement

**Severity:** 🟡 **MEDIUM**  
**Location:** No redirect from HTTP to HTTPS found

**Problem:**
- No automatic redirect from HTTP to HTTPS
- Cookies with `secure: true` won't work over HTTP
- But in development, `secure: false` allows HTTP (intentional)

**Impact:**
- Production site accessible over HTTP
- Man-in-the-middle attacks possible
- Session cookies could be intercepted

**Fix Required:**
- Add middleware to redirect HTTP to HTTPS in production
- Or configure at hosting level (Vercel handles this)

---

### VULN-21: Cookie Security in Development Mode

**Severity:** 🟡 **MEDIUM**  
**Location:** Multiple files

**Issue:**
```typescript
secure: process.env.NODE_ENV === 'production'
```

**Problem:**
- Cookies are not secure in development
- If development server is accessible over network, cookies can be intercepted
- Should use HTTPS even in development for testing

**Recommendation:**
- Use HTTPS in development when possible
- Or use `secure: true` always and handle localhost exception
- Document security implications

---

## 🟢 LOW RISK / INFORMATIONAL

### INFO-2: No Timing Attack Protection on String Comparisons

**Location:** Various string comparisons

**Issue:**
- Some string comparisons may be vulnerable to timing attacks
- Example: `xpub === storedXpub`

**Note:**
- Cookie signing uses `crypto.timingSafeEqual` (✅ Good)
- But other comparisons may leak timing information

**Recommendation:**
- Use constant-time comparisons for sensitive values
- Or accept risk (timing attacks are difficult to exploit remotely)

---

### INFO-3: Extensive Console Logging in Production

**Location:** Throughout codebase

**Issue:**
- 100+ console.log statements
- May impact performance
- May expose sensitive information

**Recommendation:**
- Use proper logging library (Winston, Pino)
- Environment-based log levels
- Remove or reduce logging in production

---

### INFO-4: No Request Timeout Configuration

**Issue:**
- No explicit request timeouts
- Long-running requests could hang

**Recommendation:**
- Configure request timeouts
- Handle timeout errors gracefully

---

### INFO-5: Missing Input Sanitization on Domain Names

**Location:** Domain input handling

**Issue:**
- Domain names are normalized but may not be fully sanitized
- Could contain unexpected characters

**Recommendation:**
- Add strict domain validation
- Whitelist allowed characters
- Reject invalid domains early

---

## Summary by Severity

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 4 | **MUST FIX** |
| 🟡 Medium | 12 | **SHOULD FIX** |
| 🟢 Low/Info | 5 | **CONSIDER FIXING** |
| **Total** | **21** | |

---

## Priority Fix Order

### Immediate (Critical)
1. ✅ VULN-6: Fix CORS wildcard in admin login
2. ✅ VULN-7: Implement rate limiting
3. ✅ VULN-8: Fix XSS in FAQ page
4. ✅ VULN-9: Fix cookie secret default

### High Priority (Medium)
5. ✅ VULN-10: Reduce information disclosure in logs
6. ✅ VULN-11: Remove admin xpub from error responses
7. ✅ VULN-13: Add security headers
8. ✅ VULN-14: Fix IP address handling

### Medium Priority
9. ✅ VULN-12: Add request body size limits
10. ✅ VULN-15: Reduce session cookie lifetime
11. ✅ VULN-16: Add CSRF protection
12. ✅ VULN-17: Add input length validation

---

## Testing Recommendations

1. **Rate Limiting:**
   - Send 100+ requests to `/api/auth/lnurl` in 1 minute
   - Verify rate limiting kicks in

2. **XSS:**
   - Test FAQ page with malicious HTML in answers
   - Verify script execution is prevented

3. **CORS:**
   - Try to call admin login from malicious origin
   - Verify request is blocked

4. **Cookie Secret:**
   - Test with default secret in production
   - Verify application fails to start

5. **Security Headers:**
   - Use securityheaders.com to test
   - Verify all headers are present

---

**Status:** ⚠️ **21 ADDITIONAL VULNERABILITIES IDENTIFIED**

**Next Steps:**
1. Review and prioritize fixes
2. Implement critical fixes first
3. Test fixes thoroughly
4. Consider security audit by third party

