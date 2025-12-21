# Rate Limiting Analysis & Cost Protection

**Date:** $(date)  
**Status:** ⚠️ **NEEDS IMPROVEMENT FOR COST CONTROL**

---

## Current Rate Limit Status

### ✅ Endpoints WITH Rate Limiting

| Endpoint | Current Limit | Window | Requests/Hour |
|----------|---------------|--------|---------------|
| `/api/auth/callback` | 20/min | 1 minute | **1,200/hour** ⚠️ |
| `/api/auth/lnurl` | 10/min | 1 minute | 600/hour |
| `/api/auth/login` | 5/min | 1 minute | 300/hour |
| `/api/verify` | 10/min | 1 minute | 600/hour |
| `/api/contact` | 5/min | 1 minute | 300/hour |
| `/api/admin/auth/login` | 10/min | 1 minute | 600/hour |

### ❌ Endpoints WITHOUT Rate Limiting (Cost Risk)

**High-Traffic Endpoints:**
- `/api/user` - Called frequently by dashboard (every page load)
- `/api/usage` - Called frequently by dashboard (analytics)
- `/api/domains` - GET/POST/DELETE/PUT (domain management)
- `/api/integration/toggle` - Integration control
- `/api/embed` - **PUBLIC** - Embed script generation
- `/api/embed/config` - **PUBLIC** - Config API
- `/api/subscribe` - Subscription management
- `/api/disclaimer` - Disclaimer acceptance
- `/api/activity` - Activity logs
- `/api/delete` - Account deletion
- All admin endpoints (except login)

---

## Cost Analysis

### Vercel Serverless Function Pricing

**Hobby Plan:**
- 100GB-hours execution time
- 1,000,000 requests/month included
- $0.40 per million requests after limit

**Pro Plan:**
- 1,000GB-hours execution time
- 1,000,000 requests/month included
- $0.40 per million requests after limit

### Current Risk Scenarios

**Scenario 1: Single Attacker (Single IP)**
- `/api/auth/callback`: 20/min = **1,200/hour** = **28,800/day** = **864,000/month**
- `/api/embed`: No limit = **Unlimited** ⚠️
- `/api/user`: No limit = **Unlimited** ⚠️

**Scenario 2: Distributed Attack (Multiple IPs)**
- Current in-memory rate limiting **won't work** across serverless instances
- Each instance has separate rate limit store
- Attacker can bypass by hitting different instances

**Scenario 3: Legitimate High Traffic**
- Dashboard refreshes: `/api/user` called every few seconds
- Analytics updates: `/api/usage` called frequently
- No protection = **Unlimited costs**

---

## Critical Issues

### 1. ⚠️ In-Memory Rate Limiting Won't Work in Production

**Problem:**
- Vercel uses multiple serverless instances
- Each instance has separate memory
- Rate limit store is per-instance, not shared
- Attacker can bypass by hitting different instances

**Impact:** Rate limiting is **ineffective** in production

**Fix Required:** Use Redis or Vercel KV for shared rate limit store

### 2. ⚠️ Missing Rate Limits on High-Traffic Endpoints

**Problem:**
- `/api/user` - No limit (called every dashboard page load)
- `/api/usage` - No limit (called frequently for analytics)
- `/api/embed` - No limit (PUBLIC endpoint, can be abused)
- `/api/embed/config` - No limit (PUBLIC endpoint)

**Impact:** Unlimited requests = **Unlimited costs**

### 3. ⚠️ Rate Limits Too High for Cost Control

**Current Limits:**
- `/api/auth/callback`: 20/min = **1,200/hour per IP**
- `/api/auth/lnurl`: 10/min = **600/hour per IP**

**Recommendation:**
- `/api/auth/callback`: 10/min = 600/hour (sufficient for polling)
- `/api/auth/lnurl`: 5/min = 300/hour (sufficient for login attempts)

### 4. ⚠️ No Per-User Rate Limits

**Problem:**
- Authenticated endpoints have no per-user limits
- Single authenticated user could make unlimited requests
- Dashboard could refresh infinitely

**Impact:** Legitimate users could accidentally cause high costs

---

## Recommended Rate Limits

### Public Endpoints (Unauthenticated)

| Endpoint | Recommended | Reason |
|----------|-------------|--------|
| `/api/auth/lnurl` | **5/min** (down from 10) | Login attempts - 5 is sufficient |
| `/api/auth/login` | **5/min** | Login attempts - keep current |
| `/api/auth/callback` | **10/min** (down from 20) | Polling - 10 is sufficient |
| `/api/verify` | **10/min** | Authentication verification |
| `/api/contact` | **3/min** (down from 5) | Contact form - prevent spam |
| `/api/embed` | **30/min** | Public embed script - allow caching |
| `/api/embed/config` | **30/min** | Public config - allow caching |
| `/api/admin/auth/login` | **5/min** | Admin login attempts |

### Authenticated Endpoints (Per-User)

| Endpoint | Recommended | Reason |
|----------|-------------|--------|
| `/api/user` | **60/min** | Dashboard data - allow frequent refreshes |
| `/api/usage` | **30/min** | Analytics - allow periodic updates |
| `/api/domains` (GET) | **30/min** | Domain list - allow refreshes |
| `/api/domains` (POST/PUT/DELETE) | **10/min** | Domain changes - prevent abuse |
| `/api/integration/toggle` | **5/min** | Integration control - prevent rapid toggling |
| `/api/activity` | **30/min** | Activity logs - allow refreshes |
| `/api/subscribe` | **5/min** | Subscription changes |
| `/api/disclaimer` | **5/min** | Disclaimer acceptance |

### Admin Endpoints

| Endpoint | Recommended | Reason |
|----------|-------------|--------|
| `/api/admin/stats` | **30/min** | Admin dashboard data |
| `/api/admin/users` | **30/min** | User management |
| `/api/admin/analytics` | **30/min** | Analytics data |
| `/api/admin/contacts` | **30/min** | Contact management |
| `/api/admin/wallets` | **10/min** | Wallet management |

---

## Implementation Recommendations

### 1. Lower Current Limits

**Priority: HIGH**
- Reduce `/api/auth/callback` from 20/min to 10/min
- Reduce `/api/auth/lnurl` from 10/min to 5/min
- Reduce `/api/contact` from 5/min to 3/min

### 2. Add Rate Limiting to Missing Endpoints

**Priority: HIGH**
- Add to `/api/user` (60/min per user)
- Add to `/api/usage` (30/min per user)
- Add to `/api/domains` (30/min GET, 10/min POST/PUT/DELETE)
- Add to `/api/embed` (30/min per IP)
- Add to `/api/embed/config` (30/min per IP)
- Add to all other authenticated endpoints

### 3. Implement Per-User Rate Limiting

**Priority: MEDIUM**
- For authenticated endpoints, use `xpub` as identifier instead of IP
- Prevents single user from making unlimited requests
- More accurate for cost control

### 4. Use Redis/Vercel KV for Production

**Priority: HIGH**
- Current in-memory storage won't work across instances
- Use Vercel KV (Redis-compatible) for shared rate limit store
- Required for production deployment

### 5. Add Global Rate Limit

**Priority: MEDIUM**
- Limit total requests per IP across all endpoints
- Example: 100 requests/minute per IP globally
- Prevents distributed attacks

---

## Cost Protection Strategy

### Immediate Actions (Before Production)

1. ✅ **Lower high limits** (callback, lnurl, contact)
2. ✅ **Add rate limiting to missing endpoints**
3. ✅ **Document current limits**

### Before Production Deployment

1. ⏭️ **Implement Redis/Vercel KV** for shared rate limit store
2. ⏭️ **Add per-user rate limiting** for authenticated endpoints
3. ⏭️ **Add global rate limit** per IP
4. ⏭️ **Monitor and alert** on rate limit violations
5. ⏭️ **Set up cost alerts** in Vercel dashboard

### Production Monitoring

1. Monitor rate limit hits (429 responses)
2. Monitor API request volumes
3. Set up Vercel cost alerts
4. Track per-endpoint costs
5. Adjust limits based on actual usage

---

## Estimated Cost Impact

### Current Setup (No Additional Limits)

**Risk:** High
- Single attacker: Could generate **864,000+ requests/month** on callback endpoint alone
- Distributed attack: Unlimited (in-memory rate limiting ineffective)
- Legitimate traffic: No protection = unlimited costs

**Potential Cost:**
- If attacked: **$0.40+ per million requests** = **$0.35+ per day** = **$10+ per month** per attacker
- Multiple attackers: Costs scale linearly

### With Recommended Limits

**Protection:** Medium
- Single attacker: Limited to **~18,000 requests/hour** across all endpoints
- Distributed attack: Still possible (needs Redis)
- Legitimate traffic: Protected from accidental abuse

**Potential Cost:**
- If attacked: **~$0.01-0.05 per day** = **$0.30-1.50 per month** per attacker
- Much better, but still needs Redis for full protection

### With Redis + Recommended Limits

**Protection:** High
- Single attacker: Limited across all instances
- Distributed attack: Limited (shared rate limit store)
- Legitimate traffic: Fully protected

**Potential Cost:**
- If attacked: **Minimal** (rate limits enforced globally)
- Legitimate traffic: **Normal costs**

---

## Recommended Action Plan

### Phase 1: Immediate (Before Production)

1. ✅ Lower current high limits
2. ✅ Add rate limiting to critical missing endpoints
3. ✅ Document all rate limits

### Phase 2: Pre-Production

1. ⏭️ Implement Vercel KV for shared rate limit store
2. ⏭️ Add per-user rate limiting
3. ⏭️ Add global rate limit
4. ⏭️ Test rate limiting across multiple instances

### Phase 3: Production

1. ⏭️ Monitor rate limit effectiveness
2. ⏭️ Set up cost alerts
3. ⏭️ Adjust limits based on actual usage
4. ⏭️ Document rate limit policies

---

## Summary

**Current Status:** ⚠️ **PARTIALLY PROTECTED**

**Issues:**
- ❌ In-memory rate limiting won't work in production
- ❌ Many endpoints have no rate limiting
- ❌ Some limits are too high for cost control
- ❌ No per-user rate limiting

**Recommendations:**
1. **Lower limits** on high-traffic endpoints
2. **Add rate limiting** to missing endpoints
3. **Implement Redis/Vercel KV** before production
4. **Add per-user limits** for authenticated endpoints

**Cost Risk:** ⚠️ **MEDIUM-HIGH** without improvements

**Cost Risk:** ✅ **LOW** with recommended improvements

---

**Next Steps:** Implement recommended rate limit changes and Redis integration.

