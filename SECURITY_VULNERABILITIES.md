# Security Vulnerability Analysis

## Authentication Paths Analyzed
1. Sign-in button (top right navigation)
2. Wizard
3. Embed button (client websites)

---

## 🔴 CRITICAL VULNERABILITIES

### 1. **CORS: Wildcard Origin (`*`)**
**Location:** `app/api/auth/lnurl/route.ts`, `app/api/auth/callback/route.ts`, `app/api/embed/config/route.ts`

**Issue:** `Access-Control-Allow-Origin: '*'` allows ANY origin to make requests.

**Impact:** 
- Any malicious website can call your auth endpoints
- Could enable CSRF attacks
- Allows unauthorized sites to trigger authentication flows

**Fix:** Restrict to allowed domains or use origin validation.

---

### 2. **Client-Side Cookies (XSS Vulnerable)**
**Location:** `app/embed/route.ts` lines 239, 241, 269

**Issue:** Cookies set via `document.cookie` without `httpOnly`:
```javascript
document.cookie = 'bitpass_k1=' + challenge + '; path=/; max-age=300; SameSite=Lax';
document.cookie = 'bitpass_return_url=' + returnUrl + '; path=/; max-age=300; SameSite=Lax';
```

**Impact:**
- Accessible to JavaScript → XSS attacks can steal/forge
- No `httpOnly` flag → vulnerable to client-side tampering
- No `Secure` flag → sent over HTTP in development

**Fix:** Use httpOnly cookies set server-side, or minimize sensitive data in client cookies.

---

### 3. **Missing Origin Validation**
**Location:** `app/api/verify/route.ts` lines 64-69

**Issue:** Allows requests without origin/referer:
```typescript
} else {
  // If no origin/referer, we can't validate - this might be a direct API call
  // For security, we should require origin for embedded logins
  // But we'll allow it for now and log a warning
  console.warn('No origin/referer header in verify request for siteId:', siteId)
}
```

**Impact:**
- Direct API calls bypass domain validation
- Could allow unauthorized authentication attempts

**Fix:** Require origin for embedded logins, reject requests without origin.

---

## ⚠️ MEDIUM VULNERABILITIES

### 4. **k1 Challenge Cookie Security**
**Location:** `app/api/auth/callback/route.ts` line 177

**Issue:** `auth_k1_*` cookies may not have proper security flags.

**Impact:**
- If not httpOnly, vulnerable to XSS
- If not Secure in production, vulnerable to MITM

**Fix:** Ensure httpOnly, Secure (production), SameSite flags.

---

### 5. **Session Fixation Risk**
**Location:** `app/api/auth/set-session/route.ts`

**Issue:** No session invalidation on re-authentication.

**Impact:**
- Old sessions remain valid after new login
- Could allow session hijacking if old session compromised

**Fix:** Invalidate old sessions on new authentication.

---

### 6. **k1 Challenge Reuse**
**Location:** `app/api/auth/callback/route.ts`

**Issue:** k1 challenges may be reusable if not invalidated after use.

**Impact:**
- Replay attacks possible
- Multiple authentications with same challenge

**Fix:** Invalidate k1 after successful authentication.

---

## ✅ SECURE IMPLEMENTATIONS

### Signature Verification
- ✅ Cryptographic signature verification using secp256k1
- ✅ Proper hash verification (SHA256(k1))
- ✅ Multiple signature format support (DER, compact)

### Session Cookie Security
- ✅ `user_xpub` cookie: httpOnly, Secure (production), SameSite: 'lax'
- ✅ `auth_challenge` cookie: httpOnly, Secure (production), SameSite: 'lax'

### Domain Validation
- ✅ Domain whitelist checking in `/api/verify`
- ✅ First-use domain capture (prevents unauthorized use)

### k1 Verification
- ✅ `/api/auth/set-session` verifies k1 matches stored session
- ✅ xpub must match verified authentication

---

## Summary

**Critical Issues:** 3
**Medium Issues:** 3
**Secure:** Core authentication (signature verification, session cookies)

**Priority Fixes:**
1. Restrict CORS to allowed domains
2. Move client cookies to httpOnly server-side cookies
3. Require origin validation for embedded logins



