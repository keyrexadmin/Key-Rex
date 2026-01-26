# Phase 1 Security Fixes - Testing Plan

## Test Categories

### 1. CORS Validation Tests
### 2. Server-Side Cookie Tests
### 3. Origin Validation Tests
### 4. Authentication Flow Tests
### 5. Integration Tests

---

## Test Execution Checklist

### ✅ CORS Validation

#### Test 1.1: Dashboard Login - Valid Origin
- [ ] Sign-in button works from BitPass domain
- [ ] Wizard authentication works from BitPass domain
- [ ] CORS headers include correct origin (not `*`)

#### Test 1.2: Embed Login - Valid Origin
- [ ] Embed button works from allowed domain
- [ ] Config API returns config for allowed domain
- [ ] CORS headers include correct origin (not `*`)

#### Test 1.3: Embed Login - Invalid Origin
- [ ] Embed button fails from unauthorized domain
- [ ] Config API returns 403 for unauthorized domain
- [ ] Verify API returns 403 for unauthorized domain

#### Test 1.4: CORS Preflight
- [ ] OPTIONS requests work for valid origins
- [ ] OPTIONS requests fail for invalid origins

---

### ✅ Server-Side Cookies

#### Test 2.1: Cookie Storage
- [ ] `/api/auth/store-k1` stores cookies with httpOnly flag
- [ ] Cookies are not accessible via `document.cookie`
- [ ] Cookies have Secure flag in production

#### Test 2.2: Cookie Retrieval
- [ ] `/api/auth/get-k1` reads httpOnly cookies correctly
- [ ] QR page can retrieve returnUrl from httpOnly cookie
- [ ] Mobile redirect flow works with httpOnly cookies

#### Test 2.3: Cookie Security
- [ ] Cookies expire after 5 minutes
- [ ] Cookies have SameSite=Lax
- [ ] Cookies have httpOnly=true

---

### ✅ Origin Validation

#### Test 3.1: Verify API - Valid Origin
- [ ] Verify API accepts requests with valid origin
- [ ] First-use domain capture works
- [ ] Domain validation works for existing domains

#### Test 3.2: Verify API - Missing Origin
- [ ] Verify API rejects requests without origin (400 error)
- [ ] Error message is clear

#### Test 3.3: Verify API - Invalid Origin
- [ ] Verify API rejects requests from unauthorized domains (403 error)
- [ ] Error message is clear

---

### ✅ Authentication Flows

#### Test 4.1: Dashboard Login Flow
- [ ] Sign-in button → Authentication → Dashboard
- [ ] Wizard → Authentication → Dashboard
- [ ] WebLN authentication works
- [ ] QR code authentication works

#### Test 4.2: Embed Login Flow
- [ ] Embed button on allowed domain works
- [ ] WebLN authentication works
- [ ] QR code authentication works
- [ ] Mobile redirect flow works
- [ ] Desktop popup flow works

#### Test 4.3: Cross-Domain Security
- [ ] Embed button on unauthorized domain fails
- [ ] Config API on unauthorized domain fails
- [ ] Verify API on unauthorized domain fails

---

### ✅ Integration Tests

#### Test 5.1: End-to-End Dashboard Login
- [ ] Complete flow: Home → Sign-in → Wallet → Dashboard
- [ ] Complete flow: Home → Wizard → Wallet → Dashboard
- [ ] Session persists correctly

#### Test 5.2: End-to-End Embed Login
- [ ] Complete flow: Client site → Button → Wallet → Success
- [ ] xpub delivered correctly
- [ ] onSuccess callback fires

#### Test 5.3: Error Handling
- [ ] Invalid origin errors are clear
- [ ] Missing origin errors are clear
- [ ] CORS errors are handled gracefully

---

## Manual Testing Steps

### Setup
1. Start BitPass server (localhost:3000)
2. Start fake client site (localhost:3001)
3. Create test account with domain: `localhost:3001`

### Test Execution

#### CORS Tests
```bash
# Test 1: Valid origin (should work)
curl -H "Origin: http://localhost:3001" http://localhost:3000/api/embed/config?siteId=YOUR_SITE_ID

# Test 2: Invalid origin (should fail)
curl -H "Origin: http://evil.com" http://localhost:3000/api/embed/config?siteId=YOUR_SITE_ID

# Test 3: Missing origin (should fail for verify)
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"k1":"test","sig":"test","key":"test","siteId":"YOUR_SITE_ID"}'
```

#### Cookie Tests
```bash
# Test: Store k1 cookie
curl -X POST http://localhost:3000/api/auth/store-k1 \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3001" \
  -H "Cookie: user_xpub=test" \
  -d '{"k1":"test123","returnUrl":"http://localhost:3001"}'

# Test: Get k1 cookie
curl http://localhost:3000/api/auth/get-k1 \
  -H "Origin: http://localhost:3001" \
  -H "Cookie: bitpass_k1=test123"
```

---

## Automated Test Script

See `test-phase1.js` for automated testing.

---

## Success Criteria

- ✅ All CORS tests pass
- ✅ All cookie tests pass
- ✅ All origin validation tests pass
- ✅ All authentication flows work
- ✅ No XSS vulnerabilities in cookies
- ✅ No wildcard CORS headers
- ✅ Origin validation enforced

---

## Known Issues / Edge Cases

- [ ] Document any issues found during testing
- [ ] Document any edge cases that need special handling



