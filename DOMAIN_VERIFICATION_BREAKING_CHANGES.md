# Domain Verification - Breaking Changes Analysis

## Overview
This document analyzes what might break when implementing domain verification, and how to handle those changes.

---

## ✅ **What Will NOT Break**

### 1. Test Domains
- **Status**: ✅ Safe
- **Reason**: Test domains (localhost, *.test, staging.*, etc.) are auto-verified and bypass verification
- **Impact**: None - test domains work immediately as before

### 2. Authentication Flow Logic
- **Status**: ✅ Safe
- **Reason**: The authentication signature verification and LNURL-auth flow remain unchanged
- **Impact**: None - only domain validation changes

### 3. User Creation & Login
- **Status**: ✅ Safe
- **Reason**: User creation, wallet authentication, and session management unchanged
- **Impact**: None

---

## ⚠️ **What WILL Change (Breaking Changes)**

### 1. **New User Onboarding Flow** ⚠️ CRITICAL

**Current Behavior:**
- User completes wizard → Adds domain → Domain immediately active → Can use integration code

**New Behavior:**
- User completes wizard → Adds domain → Domain marked "pending" → Must verify DNS → Then can use integration code

**Breaking Impact:**
- ❌ **New users cannot use Key-Rex immediately after onboarding**
- ❌ **Users must wait 5-10 minutes for DNS propagation before verification**
- ❌ **Users must add DNS TXT record (requires DNS access)**

**Mitigation:**
1. **Wizard Flow Update**: 
   - Show clear instructions that verification is required
   - Allow wizard completion with pending domains (don't block)
   - Show verification instructions prominently after domain addition
   - Display verification status clearly

2. **User Experience:**
   - Provide clear, step-by-step DNS instructions
   - Show helpful error messages if verification fails
   - Allow "Verify" button in dashboard to retry

3. **Documentation:**
   - Update FAQ with verification instructions
   - Add troubleshooting guide

**Recommendation**: ✅ Acceptable - This is a security requirement, but UX should be optimized.

---

### 2. **Integration Code Display** ⚠️ CRITICAL

**Current Behavior:**
```typescript
// Integration code always shown if user has domains
if (user.allowedDomains && user.allowedDomains.length > 0) {
  // Show integration code
}
```

**New Behavior:**
```typescript
// Integration code only shown if verified domains exist
const hasVerifiedDomain = domains.some(domain => {
  const verification = domainVerifications.get(domain)
  return verification?.verified || isTestDomain(domain)
})

if (!hasVerifiedDomain) {
  // Show warning instead of code
}
```

**Breaking Impact:**
- ❌ **Users with pending domains won't see integration code**
- ❌ **Users must verify domain before seeing code**

**Mitigation:**
1. **Clear Messaging**:
   - Show prominent warning: "Please verify at least one domain to use the integration code"
   - Link to verification instructions
   - Show pending domains with "Verify" buttons

2. **Alternative Display**:
   - Show integration code but disable it with warning
   - Or show code with warning that it won't work until verified

**Recommendation**: ✅ Acceptable - Prevents confusion from non-working code.

---

### 3. **Domain Addition API Response** ⚠️ MEDIUM

**Current Behavior:**
```typescript
// POST /api/domains
// Returns: { domains: string[] }

const res = await fetch('/api/domains', { method: 'POST', ... })
const data = await res.json()
setDomains(data.domains) // Frontend expects 'domains' array
```

**New Behavior:**
```typescript
// POST /api/domains
// Returns: { 
//   domain: string,
//   domains: string[],  // Still included for backward compatibility
//   status: 'pending' | 'verified',
//   verificationToken?: string,
//   message: string
// }
```

**Breaking Impact:**
- ⚠️ **Frontend code expecting only `domains` array** - May break if not updated
- ⚠️ **New fields in response** - Frontend must handle new structure

**Files to Check:**
- `app/dashboard/page.tsx` - `DomainManager.handleAddDomain()`
- `components/OnboardingWizard.tsx` - Domain submission handlers

**Mitigation:**
1. **Backward Compatibility**:
   - Keep `domains` array in response (don't remove)
   - Add new fields alongside (non-breaking)

2. **Update Frontend**:
   - Check for new `status` field
   - Handle `verificationToken` if present
   - Show verification instructions if status is 'pending'

**Recommendation**: ✅ Safe - Can maintain backward compatibility.

---

### 4. **GET Domains API Response** ⚠️ LOW

**Current Behavior:**
```typescript
// GET /api/domains
// Returns: { domains: string[] }

const res = await fetch('/api/domains')
const data = await res.json()
setDomains(data.domains) // Frontend expects 'domains' array
```

**New Behavior:**
```typescript
// GET /api/domains
// Returns: { 
//   domains: string[],  // Still included
//   domainsWithStatus: Array<{
//     domain: string,
//     verified: boolean,
//     status: 'pending' | 'verified' | 'failed',
//     verificationToken?: string,
//     errorMessage?: string
//   }>
// }
```

**Breaking Impact:**
- ✅ **Non-breaking** - `domains` array still included
- ⚠️ **Frontend can optionally use `domainsWithStatus`** for enhanced UI

**Mitigation:**
1. **Backward Compatibility**:
   - Keep `domains` array (existing code still works)
   - Add `domainsWithStatus` as additional data

2. **Progressive Enhancement**:
   - Frontend can use `domainsWithStatus` if available
   - Falls back to `domains` if not

**Recommendation**: ✅ Safe - Fully backward compatible.

---

### 5. **Authentication Endpoints - Domain Validation** ⚠️ CRITICAL

**Current Behavior:**
```typescript
// app/api/verify/route.ts
const allowedDomains = user.allowedDomains || []
if (allowedDomains.length > 0 && !isDomainAllowed(requestDomain, allowedDomains)) {
  return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 })
}
```

**New Behavior:**
```typescript
// app/api/verify/route.ts
const verifiedDomains = getVerifiedDomains(user.xpub)
if (verifiedDomains.length > 0 && !isDomainAllowed(requestDomain, verifiedDomains)) {
  return NextResponse.json({ 
    error: 'This domain is not verified. Please verify domain ownership in your dashboard.' 
  }, { status: 403 })
}
```

**Breaking Impact:**
- ❌ **Existing integrations will stop working if domains aren't verified**
- ❌ **Error message changes** - Frontend error handling might break
- ⚠️ **Since no existing users**: This doesn't break anything, but future integrations require verification

**Mitigation:**
1. **Error Message Handling**:
   - Update frontend error handling if it checks specific error messages
   - Make error messages clear and actionable

2. **Documentation**:
   - Clearly document that verification is required
   - Provide troubleshooting steps

**Recommendation**: ✅ Safe - Since no existing users, no breaking impact. Future integrations will require verification (as intended).

---

### 6. **Domain Editing** ⚠️ LOW

**Current Behavior:**
- User edits domain → Domain updated in-place → Continues working

**New Behavior:**
- User edits domain → Old domain removed, new domain added → New domain requires verification → Integration stops working until verified

**Breaking Impact:**
- ⚠️ **Editing a verified domain to a new domain requires new verification**
- ⚠️ **Integration code will stop working until new domain is verified**

**Mitigation:**
1. **User Warning**:
   - Warn users when editing: "Changing this domain will require re-verification"
   - Confirm before proceeding

2. **Alternative Approach**:
   - Consider allowing domain editing without changing the domain name (just updating other properties)
   - Only require verification if the actual domain name changes

**Recommendation**: ✅ Acceptable - Expected behavior for security.

---

### 7. **Auto-Add Domain Logic Removal** ⚠️ LOW

**Current Behavior:**
```typescript
// app/api/verify/route.ts - Lines 59-71
// First-use domain capture: Auto-adds domain from origin if user has no domains
if ((!user.allowedDomains || user.allowedDomains.length === 0) && requestDomain) {
  const normalizedDomain = normalizeDomain(requestDomain)
  updateUser(user.xpub, {
    allowedDomains: [normalizedDomain]
  })
}
```

**New Behavior:**
- This logic is **removed entirely**
- Domains must be explicitly added through dashboard

**Breaking Impact:**
- ⚠️ **First-time authentication from a domain won't auto-add the domain**
- ⚠️ **Users must explicitly add domain in dashboard first**

**Mitigation:**
1. **User Experience**:
   - Clear error message: "Domain not found. Please add this domain in your dashboard first."
   - Link to dashboard/domains tab
   - Clear instructions in documentation

2. **Documentation**:
   - Update setup instructions to emphasize adding domains first
   - Show workflow: Add domain → Verify → Use integration code

**Recommendation**: ✅ Safe - Actually improves security (prevents unauthorized domain addition).

---

### 8. **CORS Validation** ⚠️ LOW

**Current Behavior:**
```typescript
// lib/cors.ts
export function validateEmbedOrigin(request: NextRequest, allowedDomains: string[]): boolean {
  return validateOrigin(request, allowedDomains)
}
```

**New Behavior:**
```typescript
// lib/cors.ts
export function validateEmbedOrigin(
  request: NextRequest, 
  allowedDomains: string[],
  xpub?: string
): boolean {
  if (xpub) {
    const { getVerifiedDomains } = require('./storage')
    const verifiedDomains = getVerifiedDomains(xpub)
    return validateOrigin(request, verifiedDomains)
  }
  return validateOrigin(request, allowedDomains)
}
```

**Breaking Impact:**
- ⚠️ **Function signature changes** - Adds optional `xpub` parameter
- ✅ **Backward compatible** - `xpub` is optional, falls back to old behavior
- ⚠️ **Call sites must be updated** to pass `xpub` for verification checking

**Files to Update:**
- `app/api/auth/callback/route.ts` (2 call sites)
- `app/api/embed/config/route.ts` (1 call site)

**Mitigation:**
1. **Optional Parameter**:
   - `xpub` is optional - maintains backward compatibility
   - Existing call sites without `xpub` still work (but won't check verification)

2. **Update Call Sites**:
   - All authentication endpoints should pass `xpub`
   - Non-authentication endpoints can omit `xpub` if not needed

**Recommendation**: ✅ Safe - Backward compatible, but call sites should be updated.

---

## 📋 **Summary of Breaking Changes**

### Critical (Must Handle):
1. ❌ **New user onboarding** - Cannot use Key-Rex immediately (requires verification)
2. ❌ **Integration code display** - Only shown for verified domains
3. ❌ **Authentication endpoints** - Only work with verified domains

### Medium (Should Handle):
4. ⚠️ **Domain addition API response** - New fields added (backward compatible but frontend should update)
5. ⚠️ **Domain editing** - Requires new verification

### Low (Nice to Handle):
6. ⚠️ **GET domains API response** - New optional fields (fully backward compatible)
7. ⚠️ **Auto-add domain removal** - Users must explicitly add domains
8. ⚠️ **CORS validation** - Function signature change (backward compatible)

---

## ✅ **Migration Strategy (No Grandfathering Needed)**

Since there are **no existing users**, we don't need grandfathering logic.

**Simplified Approach:**
1. ✅ All new domains require verification (no exceptions)
2. ✅ Test domains are auto-verified (already handled by `isTestDomain()`)
3. ✅ No migration logic needed
4. ✅ Clean implementation without legacy code

**Benefits:**
- Simpler codebase
- No migration edge cases
- Consistent behavior for all users
- Easier to maintain

---

## 🎯 **Recommended Approach**

### Phase 1: Update APIs (Backend First)
1. Add verification types and storage functions
2. Update domain addition to create pending verification
3. Add verification check endpoint
4. Update authentication endpoints to check verified domains
5. **Test**: All API endpoints work correctly

### Phase 2: Update Frontend
1. Update dashboard to handle verification status
2. Update wizard to show verification instructions
3. Update integration code display logic
4. **Test**: UI displays correctly, user can verify domains

### Phase 3: Remove Legacy Code
1. Remove auto-add domain logic (first-use capture)
2. Clean up any grandfathering code (if any)
3. **Test**: No broken functionality

---

## ⚠️ **Key Risks**

### 1. User Friction
**Risk**: Users frustrated by verification requirement
**Mitigation**: 
- Clear instructions
- Helpful error messages
- Good UX for verification flow

### 2. DNS Propagation Delays
**Risk**: Users add DNS record but verification fails due to propagation delay
**Mitigation**:
- Clear messaging about 5-10 minute wait
- Allow retry mechanism
- Show helpful error messages

### 3. DNS Access Required
**Risk**: Some users don't have DNS access (e.g., using hosting providers)
**Mitigation**:
- Consider alternative verification methods in future (HTML file, meta tag)
- Clear documentation
- Support resources

---

## ✅ **Conclusion**

**Most breaking changes are intentional and necessary for security.**

The main impact is:
1. ✅ **New users must verify domains** - Acceptable security requirement
2. ✅ **Integration code only shown for verified domains** - Prevents confusion
3. ✅ **All API responses maintain backward compatibility** - Safe to deploy

Since there are **no existing users**, we can implement cleanly without migration concerns.

**Recommendation**: ✅ **Proceed with implementation** - Breaking changes are acceptable and necessary for security.


