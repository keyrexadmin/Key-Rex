# Domain Verification Implementation Plan

## Overview
This plan ensures domain verification is implemented comprehensively across all areas of the application, with special attention to:
1. Wizard/onboarding flow
2. Dashboard domain management
3. Public and dashboard page updates
4. Complete validation preventing unauthorized domain usage

---

## Phase 1: Data Model & Core Logic

### 1.1 Type Definitions

**File**: `types/index.ts`

```typescript
export interface DomainVerification {
  domain: string
  status: 'pending' | 'verified' | 'failed' | 'expired'
  verificationMethod: 'dns_txt'
  verificationToken: string // Unique token: keyrex-verification={random32chars}
  verifiedAt?: number // Timestamp when verified
  createdAt: number // When verification was initiated
  lastCheckedAt?: number // Last verification attempt
  errorMessage?: string // Last error if verification failed
}

export interface User {
  // ... existing fields
  allowedDomains?: string[] // Keep for backward compatibility
  domainVerifications?: Map<string, DomainVerification> // domain -> verification status
}
```

**Changes**:
- Add `DomainVerification` interface
- Add `domainVerifications` field to `User` type

---

### 1.2 Storage Functions

**File**: `lib/storage.ts`

**New Functions**:
```typescript
// Add domain verification
function addDomainVerification(
  xpub: string, 
  domain: string, 
  token: string
): DomainVerification

// Check domain verification status
function getDomainVerification(
  xpub: string, 
  domain: string
): DomainVerification | undefined

// Update domain verification status
function updateDomainVerification(
  xpub: string,
  domain: string,
  updates: Partial<DomainVerification>
): boolean

// Check if domain is verified (for use in isDomainAllowed)
function isDomainVerified(xpub: string, domain: string): boolean

// Get verified domains only
function getVerifiedDomains(xpub: string): string[]
```

**Modified Functions**:
- `addDomain()`: Now creates pending verification instead of adding directly
- `isDomainAllowed()`: **CRITICAL** - Must check verification status
- `getUserByXpub()`: Include domainVerifications in returned user

---

### 1.3 DNS Verification Logic

**File**: `lib/domain-verification.ts` (NEW)

```typescript
import dns from 'dns/promises'
import { isTestDomain } from './utils'

/**
 * Generate unique verification token
 */
export function generateVerificationToken(): string {
  const random = crypto.randomBytes(16).toString('hex')
  return `keyrex-verification=${random}`
}

/**
 * Verify domain ownership via DNS TXT record
 */
export async function verifyDomainDNS(
  domain: string,
  expectedToken: string
): Promise<{ verified: boolean; error?: string }> {
  // Skip verification for test domains
  if (isTestDomain(domain)) {
    return { verified: true }
  }
  
  try {
    const records = await dns.resolveTxt(domain)
    const txtRecords = records.flat()
    
    const verificationRecord = txtRecords.find(record => 
      record.includes('keyrex-verification=') && 
      record.includes(expectedToken)
    )
    
    if (verificationRecord) {
      return { verified: true }
    }
    
    return { 
      verified: false, 
      error: 'Verification token not found in DNS TXT records. Please ensure the record is added and DNS has propagated (may take 5-10 minutes).' 
    }
  } catch (error) {
    return { 
      verified: false, 
      error: `DNS lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}
```

---

## Phase 2: API Endpoints

### 2.1 Modify Domain Addition Endpoint

**File**: `app/api/domains/route.ts`

**POST Handler Changes**:

```typescript
export async function POST(request: NextRequest) {
  // ... existing rate limiting and auth checks
  
  const normalized = normalizeDomain(domain)
  
  // Check if domain already exists
  if (user.allowedDomains?.includes(normalized)) {
    // If already exists, check if verified
    const verification = user.domainVerifications?.get(normalized)
    if (verification?.status === 'verified') {
      return NextResponse.json({ 
        error: 'Domain already added and verified' 
      }, { status: 400 })
    }
    // If pending, return existing verification token
    if (verification?.status === 'pending') {
      return NextResponse.json({
        domain: normalized,
        status: 'pending',
        verificationToken: verification.verificationToken,
        message: 'Domain already pending verification'
      })
    }
  }
  
  // Skip verification for test domains
  if (isTestDomain(normalized)) {
    // Add directly (test domains don't need verification)
    const updated = addDomain(xpub, normalized)
    return NextResponse.json({ 
      domains: updated.allowedDomains,
      verified: true // Test domains are auto-verified
    })
  }
  
  // Generate verification token
  const token = generateVerificationToken()
  
  // Create pending verification
  const verification: DomainVerification = {
    domain: normalized,
    status: 'pending',
    verificationMethod: 'dns_txt',
    verificationToken: token,
    createdAt: Date.now()
  }
  
  // Add domain with pending status (domain is in allowedDomains but not verified)
  addDomainVerification(xpub, normalized, token)
  
  // Also add to allowedDomains (will be filtered out if not verified in isDomainAllowed)
  const updated = addDomain(xpub, normalized)
  
  return NextResponse.json({
    domain: normalized,
    domains: updated.allowedDomains,
    status: 'pending',
    verificationToken: token,
    message: 'Domain added. Please verify ownership by adding DNS TXT record.'
  })
}
```

---

### 2.2 New Verification Check Endpoint

**File**: `app/api/domains/verify/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub } from '@/lib/storage'
import { verifyDomainDNS } from '@/lib/domain-verification'
import { rateLimitMiddleware } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limiting: 10 checks per minute
  const rateLimit = rateLimitMiddleware(request, 10, 60000)
  if (!rateLimit.allowed) {
    return rateLimit.response as NextResponse
  }
  
  const xpub = request.cookies.get('user_xpub')?.value
  if (!xpub) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  
  const body = await request.json()
  const { domain } = body
  
  const user = getUserByXpub(xpub)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  
  const verification = user.domainVerifications?.get(domain)
  if (!verification) {
    return NextResponse.json({ 
      error: 'Domain not found or verification not initiated' 
    }, { status: 404 })
  }
  
  // Check DNS
  const result = await verifyDomainDNS(domain, verification.verificationToken)
  
  if (result.verified) {
    // Update verification status
    updateDomainVerification(xpub, domain, {
      status: 'verified',
      verifiedAt: Date.now(),
      lastCheckedAt: Date.now(),
      errorMessage: undefined
    })
    
    return NextResponse.json({ 
      verified: true,
      domain,
      message: 'Domain verified successfully!' 
    })
  }
  
  // Update with error
  updateDomainVerification(xpub, domain, {
    lastCheckedAt: Date.now(),
    errorMessage: result.error,
    status: 'failed'
  })
  
  return NextResponse.json({ 
    verified: false,
    domain,
    error: result.error 
  })
}
```

---

### 2.3 Update GET Domains Endpoint

**File**: `app/api/domains/route.ts`

**GET Handler Changes**:

```typescript
export async function GET(request: NextRequest) {
  // ... existing code
  
  const user = getUserByXpub(xpub)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  
  // Return domains with verification status
  const domains = user.allowedDomains || []
  const domainsWithStatus = domains.map(domain => {
    const verification = user.domainVerifications?.get(domain)
    return {
      domain,
      verified: verification?.status === 'verified' || isTestDomain(domain),
      status: verification?.status || (isTestDomain(domain) ? 'verified' : 'pending'),
      verificationToken: verification?.status === 'pending' ? verification.verificationToken : undefined,
      errorMessage: verification?.errorMessage
    }
  })
  
  return NextResponse.json({ 
    domains,
    domainsWithStatus // Include verification info
  })
}
```

---

### 2.4 CRITICAL: Update Domain Validation in Authentication Endpoints

**File**: `app/api/verify/route.ts`

**Modify `isDomainAllowed()` check**:

```typescript
// Replace existing domain check with:
const allowedDomains = user.allowedDomains || []
if (allowedDomains.length > 0) {
  // CRITICAL: Only allow verified domains
  const verifiedDomains = getVerifiedDomains(user.xpub)
  if (!isDomainAllowed(requestDomain, verifiedDomains)) {
    return NextResponse.json({ 
      error: 'This domain is not verified. Please verify domain ownership in your dashboard.' 
    }, { status: 403 })
  }
}
```

**File**: `app/api/auth/callback/route.ts`

**Similar change needed** - Replace `isDomainAllowed()` check with verified domains check.

**File**: `lib/storage.ts`

**Modify `isDomainAllowed()` function**:

```typescript
export function isDomainAllowed(
  requestDomain: string | null,
  allowedDomains: string[]
): boolean {
  if (!requestDomain || allowedDomains.length === 0) {
    return allowedDomains.length === 0 // Allow if no restrictions
  }
  
  // For each allowed domain, check if it's verified (skip for test domains)
  // This function should only be called with verified domains now
  // But we'll add a safety check here too
  
  // Normalize request domain
  const normalizedRequest = requestDomain.toLowerCase().trim()
  
  for (const allowedDomain of allowedDomains) {
    const normalizedAllowed = allowedDomain.toLowerCase().trim()
    
    // Exact match
    if (normalizedRequest === normalizedAllowed) {
      return true
    }
    
    // Subdomain match: requestDomain.endsWith('.' + allowedDomain)
    if (normalizedRequest.endsWith('.' + normalizedAllowed)) {
      return true
    }
  }
  
  return false
}

// NEW: Helper to get only verified domains
export function getVerifiedDomains(xpub: string): string[] {
  const user = getUserByXpub(xpub)
  if (!user) return []
  
  const allDomains = user.allowedDomains || []
  return allDomains.filter(domain => {
    // Test domains are always verified
    if (isTestDomain(domain)) return true
    
    // Check verification status
    const verification = user.domainVerifications?.get(domain)
    return verification?.status === 'verified'
  })
}
```

---

## Phase 3: Wizard/Onboarding Updates

### 3.1 Update OnboardingWizard Component

**File**: `components/OnboardingWizard.tsx`

**Changes Needed**:

1. **Add verification status state**:
```typescript
const [domainVerifications, setDomainVerifications] = useState<Map<string, DomainVerification>>(new Map())
const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null)
```

2. **Update domain submission**:
```typescript
// In handleSubmit or domain submission handler
const handleDomainSubmit = async (domains: string[]) => {
  // For each domain, initiate verification
  for (const domain of domains) {
    if (!isTestDomain(domain)) {
      // Call POST /api/domains to initiate verification
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ domain })
      })
      
      const data = await res.json()
      if (data.status === 'pending') {
        // Store verification token
        setDomainVerifications(prev => {
          const newMap = new Map(prev)
          newMap.set(domain, {
            domain,
            status: 'pending',
            verificationToken: data.verificationToken,
            // ... other fields
          })
          return newMap
        })
      }
    }
  }
}
```

3. **Add verification step/instructions**:
```typescript
// New step or section showing verification instructions
{domainVerifications.size > 0 && (
  <div className="verification-instructions">
    <h3>Verify Domain Ownership</h3>
    {Array.from(domainVerifications.entries()).map(([domain, verification]) => (
      <div key={domain}>
        <p>Domain: {domain}</p>
        <p>Add this DNS TXT record:</p>
        <code>{verification.verificationToken}</code>
        <button onClick={() => verifyDomain(domain)}>
          Verify {domain}
        </button>
      </div>
    ))}
  </div>
)}
```

4. **Handle test domains**: Test domains should skip verification and proceed normally

5. **Wizard completion**: 
   - For test domains: Complete wizard normally
   - For real domains: Require at least one domain to be verified OR allow proceeding with pending domains (user can verify later)

**Option A (Strict)**: Require at least one verified domain before completing wizard
**Option B (Flexible)**: Allow proceeding with pending domains, show warning

**Recommendation**: Option B (Flexible) - Users can complete wizard and verify later

---

### 3.2 Update Subscribe Endpoint (Used by Wizard)

**File**: `app/api/subscribe/route.ts`

**Check**: Ensure this endpoint doesn't bypass domain verification. It should use the same domain addition logic.

---

## Phase 4: Dashboard Updates

### 4.1 Domain Manager Component

**File**: `app/dashboard/page.tsx` - `DomainManager` component

**Changes Needed**:

1. **Load verification status**:
```typescript
const [domainVerifications, setDomainVerifications] = useState<Map<string, any>>(new Map())

useEffect(() => {
  loadDomains()
  loadVerificationStatus()
}, [user])

const loadVerificationStatus = async () => {
  const res = await fetch('/api/domains', { credentials: 'include' })
  if (res.ok) {
    const data = await res.json()
    // data.domainsWithStatus contains verification info
    const verifications = new Map()
    data.domainsWithStatus?.forEach((item: any) => {
      verifications.set(item.domain, {
        verified: item.verified,
        status: item.status,
        verificationToken: item.verificationToken,
        errorMessage: item.errorMessage
      })
    })
    setDomainVerifications(verifications)
  }
}
```

2. **Update domain list display**:
```typescript
// Show verification status badge
{domains.map((domain) => {
  const verification = domainVerifications.get(domain)
  const isVerified = verification?.verified || isTestDomain(domain)
  
  return (
    <div key={domain}>
      <span>{domain}</span>
      {isVerified ? (
        <span className="badge verified">✓ Verified</span>
      ) : (
        <span className="badge pending">⏳ Pending Verification</span>
      )}
      {verification?.status === 'pending' && (
        <button onClick={() => showVerificationModal(domain, verification.verificationToken)}>
          Verify
        </button>
      )}
    </div>
  )
})}
```

3. **Add verification modal/instructions**:
```typescript
const [showVerifyModal, setShowVerifyModal] = useState(false)
const [verifyDomain, setVerifyDomain] = useState<string | null>(null)
const [verifyToken, setVerifyToken] = useState<string>('')

const handleVerify = async (domain: string) => {
  setVerifyingDomain(domain)
  try {
    const res = await fetch('/api/domains/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ domain })
    })
    
    const data = await res.json()
    if (data.verified) {
      toast.showSuccess(`Domain ${domain} verified successfully!`)
      loadVerificationStatus() // Reload status
    } else {
      toast.showError(data.error || 'Verification failed')
    }
  } catch (err) {
    toast.showError('Failed to verify domain')
  } finally {
    setVerifyingDomain(null)
  }
}
```

4. **Update domain addition handler**:
```typescript
const handleAddDomain = async () => {
  // ... existing validation
  
  const res = await fetch('/api/domains', {
    method: 'POST',
    // ... existing code
  })
  
  const data = await res.json()
  
  if (data.status === 'pending') {
    // Show verification instructions
    setShowVerifyModal(true)
    setVerifyDomain(data.domain)
    setVerifyToken(data.verificationToken)
    toast.showInfo('Domain added. Please verify ownership.')
  } else if (data.verified) {
    // Test domain or already verified
    toast.showSuccess('Domain added successfully!')
  }
  
  // Reload domains and verification status
  loadDomains()
  loadVerificationStatus()
}
```

5. **Update domain editing**: When editing a domain, if it was verified, new domain needs new verification

6. **Update domain removal**: No changes needed - just remove from both allowedDomains and domainVerifications

---

### 4.2 Integration Code Display

**File**: `app/dashboard/page.tsx` - Integration code section

**Changes Needed**:

```typescript
// Only show integration code if at least one domain is verified
const hasVerifiedDomain = domains.some(domain => {
  const verification = domainVerifications.get(domain)
  return verification?.verified || isTestDomain(domain)
})

if (!hasVerifiedDomain) {
  return (
    <div className="warning">
      <p>⚠️ Please verify at least one domain before using the integration code.</p>
      <p>Unverified domains cannot be used for authentication.</p>
    </div>
  )
}

// Show integration code normally
```

---

## Phase 5: Authentication Validation (CRITICAL)

### 5.1 Update isDomainAllowed Usage

**Files to Update**:
- `app/api/verify/route.ts`
- `app/api/auth/callback/route.ts`
- Any other endpoint that checks `isDomainAllowed()`

**Pattern**:

```typescript
// OLD:
const allowedDomains = user.allowedDomains || []
if (allowedDomains.length > 0 && !isDomainAllowed(requestDomain, allowedDomains)) {
  return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 })
}

// NEW:
const verifiedDomains = getVerifiedDomains(user.xpub)
if (verifiedDomains.length > 0 && !isDomainAllowed(requestDomain, verifiedDomains)) {
  return NextResponse.json({ 
    error: 'This domain is not verified. Please verify domain ownership in your dashboard.' 
  }, { status: 403 })
}
```

**CRITICAL**: This ensures NO unverified domains can be used for authentication.

### 5.2 Update validateEmbedOrigin Function

**File**: `lib/cors.ts`

**Changes Needed**:

```typescript
// OLD:
export function validateEmbedOrigin(request: NextRequest, allowedDomains: string[]): boolean {
  return validateOrigin(request, allowedDomains)
}

// NEW:
export function validateEmbedOrigin(
  request: NextRequest, 
  allowedDomains: string[],
  xpub?: string // Optional: if provided, check verification status
): boolean {
  // If xpub provided, filter to verified domains only
  // Note: This requires getVerifiedDomains to be synchronous
  // If it needs to be async, callers should get verified domains first
  if (xpub) {
    const { getVerifiedDomains } = require('./storage')
    const verifiedDomains = getVerifiedDomains(xpub)
    return validateOrigin(request, verifiedDomains)
  }
  
  // Fallback: use provided domains (for backward compatibility)
  return validateOrigin(request, allowedDomains)
}
```

**Update call sites**:

**File**: `app/api/auth/callback/route.ts` (2 locations)

```typescript
// OLD:
if (allowedDomains.length > 0 && origin) {
  if (!validateEmbedOrigin(request, allowedDomains)) {
    // ... error
  }
}

// NEW:
if (allowedDomains.length > 0 && origin) {
  if (!validateEmbedOrigin(request, allowedDomains, user.xpub)) {
    // ... error
  }
}
```

**File**: `app/api/embed/config/route.ts`

```typescript
// OLD:
if (allowedDomains.length > 0 && !validateEmbedOrigin(request, allowedDomains)) {
  // ... error
}

// NEW:
if (allowedDomains.length > 0 && !validateEmbedOrigin(request, allowedDomains, user.xpub)) {
  // ... error
}
```

**This ensures CORS validation also checks domain verification status in all authentication and config endpoints.**

---

### 5.3 Update Domain Capture Logic

**File**: `app/api/verify/route.ts`

**First-use domain capture** - This currently auto-adds domains. We need to change this:

```typescript
// OLD (lines 59-71):
if ((!user.allowedDomains || user.allowedDomains.length === 0) && requestDomain) {
  const normalizedDomain = normalizeDomain(requestDomain)
  updateUser(user.xpub, {
    allowedDomains: [normalizedDomain]
  })
}

// NEW:
// REMOVE THIS ENTIRE BLOCK
// Don't auto-add domains - require explicit addition and verification
// This prevents attackers from auto-adding domains they don't own
// Users must explicitly add domains through the dashboard and verify them
```

**This is a security-critical change** - Prevents attackers from auto-adding domains they don't own.

### 5.4 Update validateOrigin Helper (if used directly)

**File**: `lib/cors.ts`

**Check if `validateOrigin` is used directly anywhere** - If so, those call sites also need to use verified domains.

**Search for**: `validateOrigin(` to find all usages.

---

## Phase 6: Public & Dashboard Page Updates

### 6.1 FAQ Page

**File**: `app/faq/page.tsx`

**Add FAQ entry** (if not exists):

```typescript
{
  q: 'How do I verify my domain?',
  a: 'After adding a domain, you'll receive a DNS TXT record to add. Add this record to your domain's DNS settings, then click "Verify" in your dashboard. Verification typically takes 5-10 minutes after adding the DNS record. Test domains (like localhost) don't require verification.'
}
```

---

### 6.2 Dashboard Documentation Tab

**File**: `app/dashboard/page.tsx` - Documentation section

**Add domain verification documentation**:

```typescript
// Add section explaining domain verification
{
  title: 'Domain Verification',
  content: `
    <h3>Why Verify Domains?</h3>
    <p>Domain verification ensures you own the domains you're using with Key-Rex, preventing unauthorized use.</p>
    
    <h3>How to Verify</h3>
    <ol>
      <li>Add your domain in the Domains tab</li>
      <li>Copy the DNS TXT record shown</li>
      <li>Add it to your domain's DNS settings</li>
      <li>Wait 5-10 minutes for DNS propagation</li>
      <li>Click "Verify" in your dashboard</li>
    </ol>
    
    <h3>Test Domains</h3>
    <p>Test domains (localhost, *.test, staging.*, etc.) don't require verification and work immediately.</p>
  `
}
```

---

### 6.3 Support Page

**File**: `app/support/page.tsx`

**Add troubleshooting section**:

```typescript
{
  title: 'Domain Verification Issues',
  content: `
    <h3>Verification Not Working?</h3>
    <ul>
      <li>Ensure the DNS TXT record is added exactly as shown</li>
      <li>Wait 5-10 minutes for DNS propagation</li>
      <li>Check that your DNS provider supports TXT records</li>
      <li>Verify the record using online DNS lookup tools</li>
    </ul>
  `
}
```

---

## Phase 7: Migration Strategy

### 7.1 No Existing Users - Clean Implementation

**Since there are no existing users, no migration/grandfathering logic is needed.**

**Benefits:**
- ✅ Simpler codebase - no legacy code to maintain
- ✅ Consistent behavior for all users
- ✅ No migration edge cases to handle
- ✅ Easier to test and maintain

**Implementation:**
- All new domains require verification (except test domains)
- Test domains are auto-verified via `isTestDomain()` check
- No grandfathering logic needed
- Clean, straightforward implementation

---

### 7.2 Future Database Migration (If Needed)

If migrating to database in future:
- Add migration to create `domain_verifications` table
- All existing domains in database would already have verification records
- No special migration needed since we're starting fresh

---

## Phase 8: Testing Checklist

### 8.1 Functional Tests

- [ ] Add new domain → Creates pending verification
- [ ] Add test domain → Auto-verified, no verification needed
- [ ] Verify domain with correct DNS record → Status changes to verified
- [ ] Verify domain with incorrect DNS record → Status shows error
- [ ] Verify domain without DNS record → Status shows error
- [ ] Remove domain → Removes from both allowedDomains and verifications
- [ ] Edit domain → Requires new verification for new domain
- [ ] Integration code shown only for verified domains
- [ ] Authentication fails for unverified domains
- [ ] Authentication works for verified domains
- [ ] Authentication works for test domains (auto-verified)

### 8.2 Security Tests

- [ ] Cannot use unverified domain for authentication
- [ ] Cannot bypass verification by manipulating API calls
- [ ] Rate limiting works on verification checks
- [ ] DNS verification actually checks DNS (not just accepts any value)
- [ ] Test domains bypass verification correctly

### 8.3 UI/UX Tests

- [ ] Wizard shows verification instructions
- [ ] Dashboard shows verification status badges
- [ ] Verification modal shows correct instructions
- [ ] Error messages are clear and helpful
- [ ] Loading states during verification checks
- [ ] Success/error toasts display correctly

### 8.4 Migration Tests

- [ ] Existing users' domains are grandfathered (marked verified)
- [ ] New users require verification
- [ ] No disruption to existing users

---

## Phase 9: Implementation Order

### Step 1: Core Logic (2-3 hours)
1. Create `lib/domain-verification.ts`
2. Add types to `types/index.ts`
3. Add storage functions to `lib/storage.ts`
4. Update `isDomainAllowed()` to use verified domains

### Step 2: API Endpoints (2-3 hours)
1. Modify `POST /api/domains` to create pending verification
2. Create `POST /api/domains/verify` endpoint
3. Update `GET /api/domains` to include verification status
4. Update authentication endpoints to use verified domains only

### Step 3: Dashboard UI (3-4 hours)
1. Update DomainManager component
2. Add verification status display
3. Add verification modal/instructions
4. Update integration code display logic

### Step 4: Wizard Updates (2-3 hours)
1. Update OnboardingWizard component
2. Add verification step/instructions
3. Handle test domains correctly
4. Allow proceeding with pending domains

### Step 5: Documentation & Pages (1-2 hours)
1. Update FAQ page
2. Update dashboard documentation
3. Update support page

### Step 6: Testing & Migration (2-3 hours)
1. Implement grandfathering logic
2. Test all scenarios
3. Fix any issues

**Total Estimated Time: 12-18 hours**

---

## Phase 10: Validation Checklist

### ✅ No User Can Use Key-Rex on Unverified Domain

**Validation Points**:

1. ✅ **API Level**: `isDomainAllowed()` only checks verified domains
2. ✅ **Storage Level**: `getVerifiedDomains()` filters to verified only
3. ✅ **Authentication Endpoints**: All use `getVerifiedDomains()` instead of `allowedDomains`
4. ✅ **Integration Code**: Only shown for verified domains
5. ✅ **Domain Addition**: Creates pending verification, doesn't add directly (except test domains)
6. ✅ **Auto-add Logic Removed**: First-use domain capture removed

**Test Cases**:
- Add domain → Status is 'pending' → Authentication fails
- Verify domain → Status is 'verified' → Authentication works
- Add test domain → Status is 'verified' immediately → Authentication works
- Unverified domain in allowedDomains → Not in verifiedDomains → Authentication fails

---

## Success Criteria

1. ✅ All new domains require verification
2. ✅ No authentication possible on unverified domains
3. ✅ Wizard handles verification flow
4. ✅ Dashboard displays verification status clearly
5. ✅ Verification process is user-friendly
6. ✅ Existing users are not disrupted (grandfathered)
7. ✅ Test domains work without verification
8. ✅ Clear error messages and instructions
9. ✅ Security validation prevents unauthorized domain usage

---

This plan ensures comprehensive coverage of all areas while maintaining security and user experience.

