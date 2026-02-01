# Security Vulnerabilities - Implementation Plan

## Overview
This plan addresses 6 security vulnerabilities across 3 authentication paths (sign-in button, wizard, embed button).

**Priority:** Critical → Medium
**Estimated Time:** 2-3 days
**Risk Level:** Medium (requires careful testing to avoid breaking existing functionality)

---

## Phase 1: Critical Vulnerabilities (Days 1-2)

### Fix #1: CORS Wildcard Origin
**Priority:** 🔴 CRITICAL
**Files:** `app/api/auth/lnurl/route.ts`, `app/api/auth/callback/route.ts`, `app/api/embed/config/route.ts`

#### Implementation Steps:

1. **Create CORS validation utility** (`lib/cors.ts`)
   ```typescript
   export function validateOrigin(request: NextRequest, allowedDomains: string[]): boolean {
     const origin = request.headers.get('origin')
     if (!origin) return false
     
     try {
       const url = new URL(origin)
       const hostname = url.hostname
       
       // Check against allowed domains (exact match or subdomain)
       return allowedDomains.some(domain => {
         if (hostname === domain) return true
         if (hostname.endsWith('.' + domain)) return true
         return false
       })
     } catch {
       return false
     }
   }
   
   export function getCorsHeaders(origin: string | null): Record<string, string> {
     if (!origin) {
       return {} // No CORS headers if no origin
     }
     
     return {
       'Access-Control-Allow-Origin': origin,
       'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
       'Access-Control-Allow-Headers': 'Content-Type',
       'Access-Control-Allow-Credentials': 'true',
     }
   }
   ```

2. **Update `/api/auth/lnurl/route.ts`**
   - Remove `CORS_HEADERS` constant with `*`
   - Add origin validation
   - For dashboard logins: Allow BitPass domain only
   - For embed logins: Validate against user's allowed domains
   - Return appropriate CORS headers based on validation

3. **Update `/api/auth/callback/route.ts`**
   - Remove wildcard CORS headers
   - Validate origin before setting CORS headers
   - Allow BitPass domain for dashboard logins
   - Validate against user's allowed domains for embed logins

4. **Update `/api/embed/config/route.ts`**
   - Remove wildcard CORS headers
   - Validate origin against user's allowed domains
   - Return 403 if origin not allowed

5. **Update `/api/verify/route.ts`**
   - Add origin validation (already has domain check, enhance it)
   - Return appropriate CORS headers based on validation

#### Testing:
- ✅ Dashboard login from BitPass domain works
- ✅ Embed login from allowed domain works
- ✅ Embed login from unauthorized domain fails
- ✅ Direct API calls without origin fail
- ✅ CORS preflight requests work correctly

---

### Fix #2: Client-Side Cookies (XSS Vulnerable)
**Priority:** 🔴 CRITICAL
**Files:** `app/embed/route.ts`

#### Implementation Steps:

1. **Remove client-side cookie setting** (`app/embed/route.ts`)
   - Remove `document.cookie` calls for `bitpass_k1` and `bitpass_return_url`
   - These are only used for mobile redirect flow

2. **Create server-side cookie API** (`app/api/auth/store-k1/route.ts`)
   ```typescript
   export async function POST(request: NextRequest) {
     const { k1, returnUrl } = await request.json()
     const origin = request.headers.get('origin')
     
     // Validate origin
     if (!origin) {
       return NextResponse.json({ error: 'Missing origin' }, { status: 400 })
     }
     
     // Store k1 in httpOnly cookie
     const response = NextResponse.json({ success: true })
     response.cookies.set('bitpass_k1', k1, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'lax',
       maxAge: 300, // 5 minutes
     })
     
     // Store return URL in httpOnly cookie
     response.cookies.set('bitpass_return_url', returnUrl, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'lax',
       maxAge: 300,
     })
     
     // Set CORS headers
     const corsHeaders = getCorsHeaders(origin)
     Object.entries(corsHeaders).forEach(([key, value]) => {
       response.headers.set(key, value)
     })
     
     return response
   }
   ```

3. **Update embed script** (`app/embed/route.ts`)
   - Replace `document.cookie` calls with API call to `/api/auth/store-k1`
   - Update cookie retrieval to use server-side cookies (already httpOnly)

4. **Update QR page** (`app/embed/qr/page.tsx`)
   - Read k1 from httpOnly cookie (server-side)
   - Read returnUrl from httpOnly cookie (server-side)

#### Testing:
- ✅ Mobile redirect flow works (k1 stored securely)
- ✅ QR code authentication works
- ✅ Cookies not accessible via JavaScript (httpOnly)
- ✅ Cookies only sent over HTTPS in production (Secure flag)

---

### Fix #3: Missing Origin Validation
**Priority:** 🔴 CRITICAL
**Files:** `app/api/verify/route.ts`

#### Implementation Steps:

1. **Enforce origin requirement** (`app/api/verify/route.ts`)
   - Remove the "allow it for now" fallback (lines 64-69)
   - Require origin/referer for ALL verify requests
   - Return 400 if origin missing

2. **Enhanced domain validation**
   - Use existing `isDomainAllowed` function
   - Validate origin against user's allowed domains
   - Return 403 if origin not allowed

3. **Update error messages**
   - Clear error: "Origin validation required"
   - Clear error: "Origin not authorized"

#### Testing:
- ✅ Verify request with valid origin works
- ✅ Verify request without origin fails (400)
- ✅ Verify request with unauthorized origin fails (403)
- ✅ First-use domain capture still works

---

## Phase 2: Medium Vulnerabilities (Day 3)

### Fix #4: k1 Cookie Security
**Priority:** ⚠️ MEDIUM
**Files:** `app/api/auth/callback/route.ts`

#### Implementation Steps:

1. **Set k1 cookies with security flags** (`app/api/auth/callback/route.ts`)
   - Currently: Cookie name is set but cookie may not have proper flags
   - Add explicit cookie setting with httpOnly, Secure, SameSite
   ```typescript
   response.cookies.set(k1CookieName, xpub, {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'lax',
     maxAge: 300, // 5 minutes
   })
   ```

2. **Verify cookie retrieval** (`app/api/auth/callback/route.ts`, `app/api/auth/set-session/route.ts`)
   - Ensure cookies are read correctly with proper flags
   - Test across serverless instances

#### Testing:
- ✅ k1 cookies are httpOnly (not accessible via JavaScript)
- ✅ k1 cookies are Secure in production
- ✅ k1 cookies persist across serverless instances
- ✅ k1 cookies expire after 5 minutes

---

### Fix #5: Session Fixation Risk
**Priority:** ⚠️ MEDIUM
**Files:** `app/api/auth/set-session/route.ts`, `app/api/auth/callback/route.ts`

#### Implementation Steps:

1. **Invalidate old sessions on new auth** (`app/api/auth/set-session/route.ts`)
   - Before setting new `user_xpub` cookie, delete old one
   - Clear any existing session cookies
   ```typescript
   // Delete old session cookie
   response.cookies.set('user_xpub', '', {
     expires: new Date(0),
     path: '/',
   })
   
   // Set new session cookie
   response.cookies.set('user_xpub', xpub, cookieOptions)
   ```

2. **Add session rotation** (optional enhancement)
   - Generate new session ID on each login
   - Store session ID in database with expiration
   - Validate session ID on each request

#### Testing:
- ✅ Old session invalidated on new login
- ✅ New session works correctly
- ✅ Multiple concurrent logins handled properly

---

### Fix #6: k1 Challenge Reuse
**Priority:** ⚠️ MEDIUM
**Files:** `app/api/auth/callback/route.ts`, `lib/storage.ts`

#### Implementation Steps:

1. **Add k1 expiration tracking** (`lib/storage.ts`)
   - Store k1 with timestamp
   - Check expiration (5 minutes) before use
   - Delete expired k1 entries

2. **Invalidate k1 after use** (`app/api/auth/callback/route.ts`)
   - After successful authentication, delete k1 from storage
   - Delete k1 cookie after use
   - Prevent reuse of same k1

3. **Add k1 validation** (`app/api/auth/set-session/route.ts`)
   - Check if k1 is expired
   - Check if k1 has already been used
   - Return 401 if k1 invalid/expired/used

#### Testing:
- ✅ k1 can only be used once
- ✅ Expired k1 rejected
- ✅ k1 deleted after successful auth
- ✅ Multiple auth attempts with same k1 fail

---

## Implementation Order

### Day 1: Critical Fixes (Phase 1)
1. **Morning:** Fix #1 (CORS) - Most critical, affects all endpoints
2. **Afternoon:** Fix #2 (Client cookies) - High XSS risk
3. **End of Day:** Fix #3 (Origin validation) - Quick fix

### Day 2: Testing & Refinement
1. **Morning:** Comprehensive testing of Phase 1 fixes
2. **Afternoon:** Fix any issues found
3. **End of Day:** Deploy Phase 1 to staging

### Day 3: Medium Fixes (Phase 2)
1. **Morning:** Fix #4 (k1 cookie security)
2. **Afternoon:** Fix #5 (Session fixation) + Fix #6 (k1 reuse)
3. **End of Day:** Testing Phase 2 fixes

---

## Testing Checklist

### Phase 1 Testing:
- [ ] Dashboard login works (sign-in button)
- [ ] Wizard authentication works
- [ ] Embed button works on allowed domain
- [ ] Embed button fails on unauthorized domain
- [ ] Mobile redirect flow works (QR code)
- [ ] Desktop popup flow works
- [ ] WebLN authentication works
- [ ] CORS preflight requests work
- [ ] Direct API calls without origin fail
- [ ] Client cookies not accessible via JavaScript

### Phase 2 Testing:
- [ ] k1 cookies are httpOnly
- [ ] k1 cookies expire after 5 minutes
- [ ] Old sessions invalidated on new login
- [ ] k1 can only be used once
- [ ] Expired k1 rejected
- [ ] Session rotation works (if implemented)

---

## Rollout Strategy

### Pre-Deployment:
1. ✅ All fixes implemented
2. ✅ Comprehensive testing completed
3. ✅ Code review
4. ✅ Documentation updated

### Deployment:
1. **Staging:** Deploy Phase 1 → Test → Deploy Phase 2 → Test
2. **Production:** 
   - Deploy Phase 1 (monitor for 24 hours)
   - Deploy Phase 2 (monitor for 24 hours)
   - Full rollout

### Rollback Plan:
- Keep previous version tagged
- Monitor error rates
- Rollback if error rate > 1%

---

## Risk Mitigation

### Potential Breaking Changes:
1. **CORS restrictions** - May break legitimate clients
   - **Mitigation:** Whitelist known domains during transition
   - **Mitigation:** Provide clear error messages

2. **Client cookie removal** - May break mobile flow
   - **Mitigation:** Test mobile flow thoroughly
   - **Mitigation:** Keep fallback for 24 hours

3. **Origin validation** - May break direct API calls
   - **Mitigation:** Only enforce for embed logins
   - **Mitigation:** Dashboard logins use different endpoint

### Monitoring:
- Monitor error rates (should decrease)
- Monitor authentication success rates (should stay same)
- Monitor CORS errors (should increase for unauthorized)
- Monitor cookie-related errors (should decrease)

---

## Success Criteria

### Phase 1 (Critical):
- ✅ No wildcard CORS headers
- ✅ All client cookies are httpOnly
- ✅ Origin validation enforced
- ✅ Zero increase in authentication failures
- ✅ Zero XSS vulnerabilities in cookies

### Phase 2 (Medium):
- ✅ k1 cookies are secure
- ✅ Sessions invalidated on re-auth
- ✅ k1 challenges are single-use
- ✅ Zero session fixation vulnerabilities

---

## Files to Modify

### New Files:
- `lib/cors.ts` - CORS validation utility
- `app/api/auth/store-k1/route.ts` - Server-side k1 storage

### Modified Files:
- `app/api/auth/lnurl/route.ts`
- `app/api/auth/callback/route.ts`
- `app/api/embed/config/route.ts`
- `app/api/verify/route.ts`
- `app/embed/route.ts`
- `app/embed/qr/page.tsx`
- `app/api/auth/set-session/route.ts`
- `lib/storage.ts`

---

## Estimated Effort

- **Phase 1 (Critical):** 8-12 hours
- **Phase 2 (Medium):** 4-6 hours
- **Testing:** 4-6 hours
- **Total:** 16-24 hours (2-3 days)

---

## Notes

- All changes maintain backward compatibility where possible
- Error messages should be clear for debugging
- Logging should be enhanced for security monitoring
- Consider adding rate limiting in future (not in this plan)



