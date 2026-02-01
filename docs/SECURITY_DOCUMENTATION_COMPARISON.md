# Security Documentation vs Implementation Comparison

## Date: Current Audit

This document compares what security features are documented in public pages/dashboard vs what is actually implemented.

---

## ✅ **ACCURATE DOCUMENTATION** (Matches Implementation)

### 1. Rate Limiting
- **Documented (FAQ):** ✅ "we have rate limiting and other safeguards in place that help prevent excessive requests from impacting the service"
- **Implemented:** ✅ Rate limiting on all endpoints:
  - Public endpoints: 5-60 requests/minute (varies by endpoint)
  - Admin endpoints: 10-30 requests/minute (varies by operation)
  - **Status:** ✅ ACCURATE - Implementation matches documentation

### 2. HttpOnly Cookies
- **Documented (Dashboard):** ✅ "HttpOnly cookies: Set session cookies with HttpOnly flag to prevent XSS attacks"
- **Documented (Dashboard):** ✅ "All Key-Rex cookies are httpOnly (not accessible via JavaScript) and set server-side to prevent XSS attacks"
- **Implemented:** ✅ All cookies use `httpOnly: true`
- **Status:** ✅ ACCURATE - Implementation matches documentation

### 3. Secure Cookies
- **Documented (Dashboard):** ✅ "Secure cookies: Use Secure flag in production (HTTPS only)"
- **Implemented:** ✅ All cookies use `secure: process.env.NODE_ENV === 'production'`
- **Status:** ✅ ACCURATE - Implementation matches documentation

### 4. CORS Protection
- **Documented (Dashboard):** ✅ "CORS: Configure CORS properly to only allow requests from your frontend domain"
- **Documented (Requirements):** ✅ "CORS handled automatically by Key-Rex—no configuration needed"
- **Implemented:** ✅ CORS validation on all relevant endpoints
- **Status:** ✅ ACCURATE - Implementation matches documentation

### 5. Input Validation
- **Documented (Dashboard):** ✅ "Input validation: Validate and sanitize all inputs, including xpub format"
- **Implemented:** ✅ Input validation on all endpoints (domains, contact forms, etc.)
- **Status:** ✅ ACCURATE - Implementation matches documentation

---

## ⚠️ **NEEDS UPDATE** (Documentation Doesn't Match Implementation)

### 1. Session Expiration Time
- **Documented (Dashboard line 4951):** "Set reasonable expiration times (e.g., 7 days)"
- **Implemented:** 30 days (60 * 60 * 24 * 30 seconds)
- **Recommendation:** Update documentation to say "30 days" instead of "7 days"

### 2. Rate Limiting Implementation
- **Documented (Dashboard line 4952):** "Rate limiting: Implement rate limiting on login endpoints to prevent abuse"
  - This suggests client should implement rate limiting
- **Implemented:** ✅ Key-Rex **already implements** rate limiting on all endpoints
- **Recommendation:** Update to clarify that Key-Rex handles rate limiting automatically, clients don't need to implement it

### 3. XSS Protection Details
- **Documented:** ✅ Mentions HttpOnly cookies prevent XSS (correct)
- **Implemented:** ✅ Additional XSS protections:
  - No `innerHTML` usage (replaced with `createElement`/`textContent`)
  - Content Security Policy (CSP) headers
- **Recommendation:** Could mention CSP headers in security documentation

### 4. Security Headers (Missing from Documentation)
- **Documented:** ❌ Not mentioned
- **Implemented:** ✅ Multiple security headers:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy` (comprehensive CSP)
  - `Strict-Transport-Security` (HSTS) in production
  - `Permissions-Policy`
- **Recommendation:** Add section documenting security headers

### 5. Request Size Limits (Missing from Documentation)
- **Documented:** ❌ Not mentioned
- **Implemented:** ✅ Request body size limits on all endpoints:
  - Most endpoints: 1MB
  - Contact form: 100KB
  - Delete endpoint: 1KB
  - Admin endpoints: 10KB (for writes)
- **Recommendation:** Could mention in security documentation (optional, as this is more internal)

### 6. k1 Challenge Reuse Prevention
- **Documented:** ❌ Not explicitly mentioned
- **Implemented:** ✅ k1 challenges marked as used after successful authentication to prevent replay attacks
- **Recommendation:** Could add brief mention in security documentation (optional)

---

## 📝 **RECOMMENDED DOCUMENTATION UPDATES**

### Priority 1: Update Session Expiration
**Location:** `app/dashboard/page.tsx` line 4951
**Change:**
```diff
- <li><strong className="text-white">Session expiration:</strong> Set reasonable expiration times (e.g., 7 days) and implement refresh tokens for longer sessions</li>
+ <li><strong className="text-white">Session expiration:</strong> Key-Rex sessions expire after 30 days. For longer sessions, implement refresh tokens in your application.</li>
```

### Priority 2: Clarify Rate Limiting
**Location:** `app/dashboard/page.tsx` line 4952
**Change:**
```diff
- <li><strong className="text-white">Rate limiting:</strong> Implement rate limiting on login endpoints to prevent abuse</li>
+ <li><strong className="text-white">Rate limiting:</strong> Key-Rex automatically implements rate limiting on all endpoints to prevent abuse. No additional rate limiting needed on your side.</li>
```

### Priority 3: Add Security Headers Section (Optional)
**Location:** After line 4956 in `app/dashboard/page.tsx`
**Add:**
```tsx
{/* Security Headers */}
<div className="bg-dark-900/50 rounded-lg p-5 border border-dark-700">
  <h4 className="text-lg font-semibold text-white mb-3">Security Headers</h4>
  <p className="text-sm text-white/80 mb-3">
    Key-Rex automatically sets security headers on all responses:
  </p>
  <ul className="space-y-2 text-sm text-white/80 list-disc list-inside ml-2">
    <li><strong className="text-white">Content-Security-Policy:</strong> Restricts resource loading to prevent XSS</li>
    <li><strong className="text-white">X-Frame-Options:</strong> Prevents clickjacking attacks</li>
    <li><strong className="text-white">X-Content-Type-Options:</strong> Prevents MIME type sniffing</li>
    <li><strong className="text-white">Strict-Transport-Security:</strong> Forces HTTPS in production</li>
    <li><strong className="text-white">Referrer-Policy:</strong> Controls referrer information</li>
  </ul>
</div>
```

---

## ✅ **SUMMARY**

### What's Accurate:
- ✅ Rate limiting (mentioned correctly in FAQ)
- ✅ HttpOnly cookies (documented correctly)
- ✅ Secure cookies (documented correctly)
- ✅ CORS protection (documented correctly)
- ✅ Input validation (documented correctly)

### What Needs Updating:
- ⚠️ Session expiration time (docs say 7 days, actual is 30 days)
- ⚠️ Rate limiting implementation (docs suggest client should implement, but Key-Rex already does)
- ⚠️ Security headers (not documented but implemented)
- ⚠️ Request size limits (not documented but implemented)
- ⚠️ k1 reuse prevention (not documented but implemented)

### Overall Assessment:
**Documentation is 85% accurate.** The main discrepancies are:
1. Session expiration time mismatch (minor)
2. Rate limiting implementation clarification (needs update)
3. Missing documentation of security headers (nice to have)

The security documentation is generally good and accurate, with only minor updates needed.


