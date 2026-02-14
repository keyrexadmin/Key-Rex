# Disclaimer Acceptance Storage Audit

## ✅ Metrics Captured

The disclaimer acceptance API (`/api/disclaimer`) correctly captures all required metrics:

1. **User Master xpub** ✅
   - Source: `request.cookies.get('user_xpub')?.value`
   - Stored in: User object (primary key)

2. **Timestamp** ✅
   - Source: `Date.now()` (milliseconds since epoch)
   - Stored in: `user.freeDisclaimerAcceptedAt`
   - Also logged in ISO format for readability

3. **IP Address** ✅
   - Source: `x-forwarded-for` header (first IP) or `x-real-ip` header
   - Fallback: `'unknown'` if neither header is present
   - Stored in: `user.freeDisclaimerAcceptedIp`

4. **Acceptance Status** ✅
   - Stored in: `user.freeDisclaimerAccepted` (boolean: `true`)

5. **User Agent** ✅
   - Captured in audit logs: `request.headers.get('user-agent')`
   - Currently logged but not stored in user object

## 📍 Storage Location

### Current Implementation: In-Memory Storage ⚠️

**Location**: `lib/storage.ts`
- Uses JavaScript `Map<string, User>` for storage
- Data is stored in memory only
- **NOT PERMANENT** - Data is lost on server restart or serverless function cold start

**Code Reference**:
```typescript
let storage: StorageData = {
  users: new Map(),
  usage: new Map(),
}
```

### Backup Cookie Storage ✅

**Location**: Signed HTTP-only cookie `user_subscription_backup`
- Includes disclaimer acceptance data
- Cryptographically signed (HMAC-SHA256) to prevent tampering
- HttpOnly: true (prevents client-side access)
- MaxAge: 1 year
- Provides persistence across serverless function invocations
- **Still not permanent** - cookie expires after 1 year

**Stored Fields in Cookie**:
- `freeDisclaimerAccepted: true`
- `freeDisclaimerAcceptedAt: timestamp`
- `freeDisclaimerAcceptedIp: ip`

## ⚠️ CRITICAL: Not Permanent Database Storage

**Current Status**: The disclaimer acceptance data is:
- ✅ Correctly captured with all required metrics
- ✅ Stored in in-memory Map (temporary)
- ✅ Backed up in signed cookie (1 year expiration)
- ❌ **NOT stored in a permanent database**

**Impact**: 
- Data persists during server uptime
- Data persists across serverless function invocations (via backup cookie)
- Data is **LOST** on:
  - Server restart
  - Serverless function cold start (if cookie also expired)
  - Cookie expiration (1 year)

## 🔧 Required for Permanent Storage

To make disclaimer acceptance data permanent, you need to:

1. **Migrate to Vercel KV** (recommended for Vercel deployments)
   - Replace `Map` storage with Vercel KV operations
   - Update `updateUser()` to write to KV
   - Update `getUserByXpub()` to read from KV

2. **Or use a proper database** (PostgreSQL, MongoDB, etc.)
   - Set up database connection
   - Create users table with disclaimer fields
   - Update storage functions to use database

3. **Audit Logging** (recommended)
   - Currently logs to console (lines 134-140 in `app/api/disclaimer/route.ts`)
   - Should be stored in separate audit log table/database
   - Enables compliance and legal tracking

## 📋 Current Storage Code

**File**: `app/api/disclaimer/route.ts`

```typescript
// Lines 53-65: Captures all metrics
const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
const timestamp = Date.now()

const updated = updateUser(xpub, {
  freeDisclaimerAccepted: true,
  freeDisclaimerAcceptedAt: timestamp,
  freeDisclaimerAcceptedIp: ip,
})
```

**File**: `lib/storage.ts`

```typescript
// Lines 120-161: updateUser() function
// Stores in memory Map - NOT permanent
storage.users.set(xpub, updated)
```

## ✅ Verification Checklist

- [x] xpub captured from cookie
- [x] Timestamp captured (milliseconds since epoch)
- [x] IP address captured from headers
- [x] Acceptance status stored as boolean
- [x] Data stored in user object
- [x] Data backed up in signed cookie
- [x] Audit logging to console
- [ ] **Data stored in permanent database** ❌
- [ ] **Audit logs stored in permanent log** ❌

## 🎯 Recommendation

**Immediate Action Required**: Migrate storage from in-memory Map to permanent database (Vercel KV or PostgreSQL) to ensure disclaimer acceptance data is never lost.

