# Rate Limiting Improvements for Cost Control

**Date:** $(date)  
**Status:** ✅ **IMPROVEMENTS IMPLEMENTED**

---

## ✅ Changes Implemented

### 1. Lowered Existing Rate Limits

| Endpoint | Before | After | Reduction | Reason |
|----------|--------|-------|-----------|--------|
| `/api/auth/callback` | 20/min | **10/min** | 50% | Cost control - 10 is sufficient for polling |
| `/api/auth/lnurl` | 10/min | **5/min** | 50% | Cost control - 5 login attempts per minute is sufficient |
| `/api/contact` | 5/min | **3/min** | 40% | Cost control - prevent spam more aggressively |

**Cost Impact:**
- `/api/auth/callback`: Reduced from **1,200/hour** to **600/hour** per IP
- `/api/auth/lnurl`: Reduced from **600/hour** to **300/hour** per IP
- `/api/contact`: Reduced from **300/hour** to **180/hour** per IP

### 2. Added Rate Limiting to Missing Endpoints

**New Rate Limits Added:**

| Endpoint | Limit | Type | Reason |
|----------|-------|------|--------|
| `/api/user` | 60/min | Per-user | Dashboard data - allow frequent refreshes |
| `/api/usage` | 30/min | Per-user | Analytics - allow periodic updates |
| `/api/domains` (GET) | 30/min | Per-user | Domain list - allow refreshes |
| `/api/domains` (POST/PUT/DELETE) | 10/min | Per-user | Domain changes - prevent abuse |
| `/api/embed` | 30/min | Per-IP | Public endpoint - prevent abuse |
| `/api/embed/config` | 30/min | Per-IP | Public endpoint - prevent abuse |
| `/api/integration/toggle` | 5/min | Per-user | Integration control - prevent rapid toggling |
| `/api/activity` | 30/min | Per-user | Activity logs - allow refreshes |

### 3. Implemented Per-User Rate Limiting

**Enhancement:**
- Rate limiting now uses `xpub` (user identifier) for authenticated endpoints
- Falls back to IP address for unauthenticated requests
- Prevents single authenticated user from making unlimited requests

**Implementation:**
- Modified `rateLimitMiddleware()` to accept optional `identifier` parameter
- Authenticated endpoints use `xpub` as identifier
- Public endpoints use IP address as identifier

---

## 📊 Cost Protection Analysis

### Before Improvements

**Risk Level:** 🔴 **HIGH**

**Potential Costs:**
- Single attacker (1 IP): **~864,000 requests/month** on callback endpoint alone
- `/api/user` (no limit): **Unlimited** requests
- `/api/usage` (no limit): **Unlimited** requests
- `/api/embed` (no limit): **Unlimited** requests

**Estimated Cost if Attacked:**
- **$0.35+ per day** per attacker = **$10+ per month** per attacker
- Multiple attackers: Costs scale linearly

### After Improvements

**Risk Level:** 🟡 **MEDIUM** (will be LOW with Redis)

**Potential Costs:**
- Single attacker (1 IP): **~18,000 requests/hour** across all endpoints
- Per-user limits: Authenticated users limited to reasonable rates
- Public endpoints: Limited to 30/min per IP

**Estimated Cost if Attacked:**
- **~$0.01-0.05 per day** per attacker = **$0.30-1.50 per month** per attacker
- **Much better**, but still needs Redis for full protection

### With Redis (Recommended for Production)

**Risk Level:** ✅ **LOW**

**Protection:**
- Shared rate limit store across all serverless instances
- Distributed attacks limited (shared state)
- Legitimate traffic fully protected

**Estimated Cost if Attacked:**
- **Minimal** (rate limits enforced globally)
- Legitimate traffic: **Normal costs**

---

## ⚠️ Critical Issue: In-Memory Rate Limiting

### Problem

**Current Implementation:**
- Uses in-memory `Map` for rate limit storage
- Each serverless instance has separate memory
- Rate limit store is **per-instance, not shared**

**Impact:**
- In production (Vercel), multiple serverless instances run simultaneously
- Attacker can bypass rate limits by hitting different instances
- Rate limiting is **ineffective** in production

### Solution Required

**Before Production Deployment:**
1. ⏭️ **Implement Vercel KV** (Redis-compatible) for shared rate limit store
2. ⏭️ **Update `lib/rate-limit.ts`** to use KV instead of in-memory Map
3. ⏭️ **Test rate limiting** across multiple instances

**Example Implementation:**
```typescript
// lib/rate-limit.ts (with Vercel KV)
import { kv } from '@vercel/kv'

export async function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
) {
  const key = `ratelimit:${identifier}`
  const record = await kv.get<RateLimitRecord>(key)
  // ... rest of logic using KV instead of Map
}
```

---

## 📋 Current Rate Limit Summary

### Public Endpoints (Unauthenticated)

| Endpoint | Limit | Requests/Hour | Cost Protection |
|----------|-------|---------------|-----------------|
| `/api/auth/lnurl` | 5/min | 300 | ✅ Good |
| `/api/auth/login` | 5/min | 300 | ✅ Good |
| `/api/auth/callback` | 10/min | 600 | ✅ Good |
| `/api/verify` | 10/min | 600 | ✅ Good |
| `/api/contact` | 3/min | 180 | ✅ Good |
| `/api/embed` | 30/min | 1,800 | ✅ Good |
| `/api/embed/config` | 30/min | 1,800 | ✅ Good |
| `/api/admin/auth/login` | 5/min | 300 | ✅ Good |

### Authenticated Endpoints (Per-User)

| Endpoint | Limit | Requests/Hour | Cost Protection |
|----------|-------|---------------|-----------------|
| `/api/user` | 60/min | 3,600 | ✅ Good |
| `/api/usage` | 30/min | 1,800 | ✅ Good |
| `/api/domains` (GET) | 30/min | 1,800 | ✅ Good |
| `/api/domains` (POST/PUT/DELETE) | 10/min | 600 | ✅ Good |
| `/api/integration/toggle` | 5/min | 300 | ✅ Good |
| `/api/activity` | 30/min | 1,800 | ✅ Good |

---

## 🎯 Recommendations

### Immediate (Done)

- ✅ Lowered high rate limits
- ✅ Added rate limiting to critical missing endpoints
- ✅ Implemented per-user rate limiting

### Before Production (Required)

1. ⏭️ **Implement Vercel KV** for shared rate limit store
2. ⏭️ **Test rate limiting** across multiple instances
3. ⏭️ **Add global rate limit** (e.g., 100 requests/minute per IP across all endpoints)
4. ⏭️ **Set up cost alerts** in Vercel dashboard

### Optional Improvements

1. ⏭️ **Add rate limit headers** to all responses (X-RateLimit-*)
2. ⏭️ **Implement exponential backoff** for rate-limited clients
3. ⏭️ **Add rate limit bypass** for trusted IPs (if needed)
4. ⏭️ **Monitor rate limit effectiveness** in production

---

## 📊 Cost Protection Summary

**Before:**
- ❌ Many endpoints had no rate limiting
- ❌ Some limits too high (20/min = 1,200/hour)
- ❌ In-memory storage won't work in production
- **Risk:** 🔴 **HIGH** - Unlimited costs possible

**After:**
- ✅ All critical endpoints have rate limiting
- ✅ Limits reduced for cost control
- ✅ Per-user rate limiting implemented
- ⚠️ Still needs Redis for production
- **Risk:** 🟡 **MEDIUM** (will be LOW with Redis)

---

## ✅ Status

**Rate Limiting:** ✅ **IMPROVED FOR COST CONTROL**

- Limits lowered on high-traffic endpoints
- Rate limiting added to missing endpoints
- Per-user rate limiting implemented
- ⚠️ **Redis/Vercel KV required before production**

**Next Step:** Implement Vercel KV for shared rate limit store before production deployment.


