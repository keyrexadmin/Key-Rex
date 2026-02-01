# Domain Verification Implementation Recommendation

## Overview

Currently, users can add any domain without proving ownership, which creates a security vulnerability where attackers could redirect authentication to malicious sites. This document outlines the recommended approach to implement domain verification.

---

## 🎯 **Recommended Approach: DNS TXT Record Verification**

**Primary Method: DNS TXT Record Verification**
- **Security**: ⭐⭐⭐⭐⭐ (Highest - proves DNS control)
- **Ease of Use**: ⭐⭐⭐ (Moderate - requires DNS access)
- **Reliability**: ⭐⭐⭐⭐⭐ (Very reliable)

**Why DNS TXT Records?**
1. Proves actual DNS control (what we need for security)
2. Standard industry practice (used by Google, Microsoft, Cloudflare, etc.)
3. Cannot be easily spoofed
4. Works for all domain types (custom domains, subdomains)
5. No code changes needed on the user's website

---

## 📋 **Implementation Plan**

### Phase 1: Core Verification System

#### 1.1 Add Verification Status to User Type

```typescript
// types/index.ts
export interface DomainVerification {
  domain: string
  status: 'pending' | 'verified' | 'failed' | 'expired'
  verificationMethod: 'dns_txt' | 'html_file' | 'meta_tag'
  verificationToken: string // Unique token for this domain
  verifiedAt?: number
  expiresAt?: number // Optional: require re-verification after X days
  lastCheckedAt?: number
  errorMessage?: string
}

export interface User {
  // ... existing fields
  domainVerifications?: Map<string, DomainVerification> // domain -> verification
}
```

#### 1.2 Domain Addition Flow

**New Flow:**
1. User enters domain → Domain stored with status `pending`
2. System generates unique verification token
3. User is shown verification instructions
4. User adds DNS TXT record
5. System checks verification (polling or manual trigger)
6. Domain status changes to `verified` or `failed`

**Only verified domains are allowed to use the integration code.**

---

### Phase 2: Verification Implementation

#### 2.1 Generate Verification Token

```typescript
// lib/domain-verification.ts
import crypto from 'crypto'

export function generateVerificationToken(): string {
  // Generate a unique, random token
  // Format: keyrex-verification-{random32chars}
  const random = crypto.randomBytes(16).toString('hex')
  return `keyrex-verification=${random}`
}
```

**DNS TXT Record Format:**
```
keyrex-verification=abc123def456...
```

#### 2.2 DNS Verification Check

```typescript
// lib/domain-verification.ts
import dns from 'dns/promises'

export async function verifyDomainDNS(
  domain: string, 
  expectedToken: string
): Promise<{ verified: boolean; error?: string }> {
  try {
    // Query TXT records for the domain
    const records = await dns.resolveTxt(domain)
    
    // Flatten and search for our verification token
    const txtRecords = records.flat()
    const verificationRecord = txtRecords.find(record => 
      record.includes('keyrex-verification=') && 
      record.includes(expectedToken)
    )
    
    if (verificationRecord) {
      return { verified: true }
    }
    
    return { verified: false, error: 'Verification token not found in DNS TXT records' }
  } catch (error) {
    return { 
      verified: false, 
      error: `DNS lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}
```

#### 2.3 API Endpoint for Verification Check

```typescript
// app/api/domains/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub } from '@/lib/storage'
import { verifyDomainDNS } from '@/lib/domain-verification'
import { rateLimitMiddleware } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limit verification checks (prevent abuse)
  const rateLimit = rateLimitMiddleware(request, 10, 60000) // 10 checks per minute
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
  
  // Get verification record for this domain
  const verification = user.domainVerifications?.get(domain)
  if (!verification) {
    return NextResponse.json({ error: 'Domain not found or not pending verification' }, { status: 404 })
  }
  
  // Check DNS
  const result = await verifyDomainDNS(domain, verification.verificationToken)
  
  if (result.verified) {
    // Update verification status
    verification.status = 'verified'
    verification.verifiedAt = Date.now()
    verification.lastCheckedAt = Date.now()
    
    // Save to storage
    // (implementation depends on your storage system)
    
    return NextResponse.json({ 
      verified: true, 
      message: 'Domain verified successfully!' 
    })
  }
  
  // Update last checked time
  verification.lastCheckedAt = Date.now()
  verification.errorMessage = result.error
  
  return NextResponse.json({ 
    verified: false, 
    error: result.error 
  })
}
```

---

### Phase 3: UI/UX Implementation

#### 3.1 Domain Manager Updates

**Add verification status indicator:**
- ✅ **Verified** (green) - Domain is verified and active
- ⏳ **Pending** (yellow) - Waiting for verification
- ❌ **Failed** (red) - Verification failed or expired
- 🔄 **Check** button - Manual verification trigger

#### 3.2 Verification Instructions Modal/Page

When user adds a domain, show clear instructions:

```
┌─────────────────────────────────────────────┐
│  Verify Domain Ownership                    │
├─────────────────────────────────────────────┤
│                                             │
│  To verify ownership of example.com,       │
│  add the following DNS TXT record:         │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ Type: TXT                             │ │
│  │ Name: @ (or leave blank)              │ │
│  │ Value: keyrex-verification=abc123...  │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  Steps:                                     │
│  1. Log in to your DNS provider            │
│  2. Add a new TXT record                   │
│  3. Use the value shown above              │
│  4. Save and wait 5-10 minutes             │
│  5. Click "Verify" button below            │
│                                             │
│  [Cancel]  [Verify Domain]                  │
└─────────────────────────────────────────────┘
```

#### 3.3 Integration Code Restriction

**Update embed code generation:**
- Only show integration code for **verified** domains
- Show warning message for unverified domains:
  - "Please verify this domain before using the integration code"

---

## 🔄 **Alternative Verification Methods (Optional)**

### Method 2: HTML File Verification

**Security**: ⭐⭐⭐ (Good - requires file system access)
**Ease of Use**: ⭐⭐⭐⭐ (Easy - just upload a file)

User uploads a file to `/.well-known/keyrex-verification.txt` containing the token.

**Pros:**
- Easier for users without DNS access
- Good for platforms like Vercel, Netlify

**Cons:**
- Less secure (could be tampered with if site is compromised)
- Requires file system/static file hosting

### Method 3: Meta Tag Verification

**Security**: ⭐⭐ (Lower - can be spoofed)
**Ease of Use**: ⭐⭐⭐⭐⭐ (Very easy)

User adds `<meta name="keyrex-verification" content="token">` to homepage.

**Pros:**
- Very easy to implement

**Cons:**
- Least secure (can be removed easily)
- Not recommended as primary method

**Recommendation**: Use DNS TXT as primary, HTML file as optional fallback.

---

## 🛡️ **Security Considerations**

### 1. **Token Uniqueness**
- Each domain gets a unique token
- Tokens are cryptographically random
- Tokens expire after 30 days if not verified (optional)

### 2. **Rate Limiting**
- Limit verification checks: 10 per minute per user
- Limit domain additions: 5 per hour per user (prevents spam)

### 3. **Re-verification**
- **Option A**: One-time verification (simpler, less secure)
- **Option B**: Periodic re-verification every 90 days (more secure)
- **Recommendation**: Start with Option A, add Option B later if needed

### 4. **Failed Verification Handling**
- Allow users to re-request verification if it fails
- Show clear error messages
- Log failed attempts for security monitoring

### 5. **Test Domain Exception**
- Test domains (localhost, *.test, etc.) don't require verification
- Already handled by `isTestDomain()` function

---

## 📊 **Database/Storage Changes**

### Storage Schema Addition

```typescript
// For in-memory storage (current)
domainVerifications: Map<string, DomainVerification>

// For future database migration
interface DomainVerificationDB {
  id: string
  userId: string // xpub
  domain: string
  status: 'pending' | 'verified' | 'failed' | 'expired'
  verificationMethod: 'dns_txt' | 'html_file'
  verificationToken: string
  verifiedAt?: number
  expiresAt?: number
  lastCheckedAt?: number
  errorMessage?: string
  createdAt: number
  updatedAt: number
}
```

---

## 🚀 **Implementation Steps**

### Step 1: Core Verification Logic (2-3 hours)
1. Create `lib/domain-verification.ts` with DNS checking logic
2. Add verification status to User type
3. Update storage functions to handle verifications

### Step 2: API Endpoints (2-3 hours)
1. Modify `/api/domains` POST to create pending verification
2. Create `/api/domains/verify` for verification checks
3. Update domain list/get endpoints to include verification status

### Step 3: UI Updates (3-4 hours)
1. Add verification status indicators to domain list
2. Create verification instructions modal
3. Add "Verify" button with polling status
4. Update integration code display logic

### Step 4: Testing (2 hours)
1. Test DNS TXT record verification
2. Test with various DNS providers
3. Test error handling
4. Test rate limiting

**Total Estimated Time: 9-12 hours**

---

## 📝 **Migration Strategy**

### For Existing Users

**Option 1: Grandfather Existing Domains (Recommended)**
- Existing domains remain active without verification
- New domains require verification
- Allow users to verify existing domains if they want

**Option 2: Require Verification for All**
- Mark all existing domains as "needs verification"
- Users must verify within 30 days or domains are disabled
- More secure but may cause disruption

**Recommendation**: Option 1 (grandfather existing) to avoid disrupting current users.

---

## 🔍 **Example Implementation Snippet**

```typescript
// When user adds a domain
async function addDomain(xpub: string, domain: string) {
  // Skip verification for test domains
  if (isTestDomain(domain)) {
    // Add directly without verification
    return addDomainDirectly(xpub, domain)
  }
  
  // Generate verification token
  const token = generateVerificationToken()
  
  // Create pending verification
  const verification: DomainVerification = {
    domain,
    status: 'pending',
    verificationMethod: 'dns_txt',
    verificationToken: token,
    lastCheckedAt: Date.now()
  }
  
  // Store verification (domain not active yet)
  storeDomainVerification(xpub, verification)
  
  // Return verification instructions
  return {
    domain,
    status: 'pending',
    verificationToken: token,
    instructions: `Add DNS TXT record: keyrex-verification=${token}`
  }
}

// Check if domain can be used
function canUseDomain(user: User, domain: string): boolean {
  // Test domains always allowed
  if (isTestDomain(domain)) return true
  
  const verification = user.domainVerifications?.get(domain)
  return verification?.status === 'verified'
}
```

---

## ✅ **Success Criteria**

1. ✅ Users cannot use unverified domains in integration code
2. ✅ DNS TXT record verification works reliably
3. ✅ Clear UI/UX for verification process
4. ✅ Rate limiting prevents abuse
5. ✅ Error messages are helpful and actionable
6. ✅ Existing domains continue to work (grandfathered)

---

## 📚 **References**

- **DNS TXT Record Format**: RFC 1464
- **DNS Resolution in Node.js**: https://nodejs.org/api/dns.html
- **Similar Implementations**: 
  - Google Search Console (site verification)
  - Microsoft Azure (domain verification)
  - Cloudflare (domain ownership)

---

## 🎯 **Final Recommendation**

**Implement DNS TXT record verification as the primary (and initially only) method.**

**Rationale:**
1. Highest security (proves DNS control)
2. Industry standard approach
3. Good balance of security and usability
4. Can add HTML file verification later if needed

**Start Simple:**
- One verification method (DNS TXT)
- One-time verification (no expiration)
- Grandfather existing domains
- Add complexity later if needed

This approach provides strong security while maintaining reasonable usability.


