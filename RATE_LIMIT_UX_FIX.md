# Rate Limit UX Fix: Ensuring Legitimate Users Aren't Impacted

**Date:** $(date)  
**Status:** ✅ **FIXED - Legitimate Users Protected**

---

## 🔧 Changes Made

### 1. Increased `/api/auth/callback` Rate Limit

**Before:** 10/min  
**After:** **60/min**

**Reason:**
- QR code authentication polls every 1 second for up to 60 seconds
- Requires up to 60 requests in 1 minute per authentication attempt
- Previous limit of 10/min would cause authentication to fail after 10 seconds
- New limit allows full authentication window while still preventing abuse

**Impact:**
- ✅ **Legitimate users:** Can complete QR authentication successfully
- ✅ **Attackers:** Still limited to 60 requests/min (reasonable for cost control)
- ⚠️ **Cost:** Slightly higher (~$1.04/month per attacker vs $0.17/month), but acceptable trade-off

### 2. Increased `/api/verify` Rate Limit

**Before:** 10/min  
**After:** **20/min**

**Reason:**
- WebLN authentication can make multiple rapid requests
- Previous limit was tight and could fail on slow networks
- New limit provides buffer while still preventing abuse

**Impact:**
- ✅ **Legitimate users:** More reliable WebLN authentication
- ✅ **Attackers:** Still limited to reasonable rate

---

## 📊 Final Rate Limit Summary

### Authentication Endpoints (Higher Limits for Polling)

| Endpoint | Limit | Requests/Hour | Reason |
|----------|-------|---------------|--------|
| `/api/auth/callback` | **60/min** | 3,600 | QR polling needs up to 60 requests in 60 seconds |
| `/api/verify` | **20/min** | 1,200 | WebLN polling can be rapid, needs buffer |
| `/api/auth/lnurl` | 5/min | 300 | Login attempts - 5 is sufficient |
| `/api/auth/login` | 5/min | 300 | Login attempts - 5 is sufficient |
| `/api/admin/auth/login` | 10/min | 600 | Admin login attempts |

### Dashboard Endpoints (Generous Limits)

| Endpoint | Limit | Requests/Hour | Normal Usage | Headroom |
|----------|-------|---------------|--------------|----------|
| `/api/user` | 60/min | 3,600 | 1-3/min | **20x** |
| `/api/usage` | 30/min | 1,800 | 1-2/min | **15x** |
| `/api/domains` (GET) | 30/min | 1,800 | 1-2/min | **15x** |
| `/api/domains` (POST/PUT/DELETE) | 10/min | 600 | 0-1/min | **10x** |
| `/api/integration/toggle` | 5/min | 300 | 0-1/min | **5x** |
| `/api/activity` | 30/min | 1,800 | 1-2/min | **15x** |

### Public Endpoints

| Endpoint | Limit | Requests/Hour | Reason |
|----------|-------|---------------|--------|
| `/api/embed` | 30/min | 1,800 | Public embed script - cached |
| `/api/embed/config` | 30/min | 1,800 | Public config - cached |
| `/api/contact` | 3/min | 180 | Contact form - prevent spam |

---

## ✅ Impact Assessment

### Legitimate Users

**Dashboard Usage:**
- ✅ **No impact** - Limits are 10-20x normal usage
- ✅ **Very generous** - Users can refresh frequently without issues

**Authentication:**
- ✅ **QR code authentication works** - Can poll for full 60 seconds
- ✅ **WebLN authentication works** - Has sufficient buffer
- ✅ **No rate limit errors** during normal authentication flows

### Attackers

**Cost Protection:**
- ✅ **Still rate limited** - Cannot make unlimited requests
- ✅ **Reasonable limits** - 60/min on callback is still reasonable
- ⚠️ **Slightly higher cost** - ~$1.04/month per attacker (vs $0.17/month)
- ✅ **Acceptable trade-off** - Ensuring legitimate users can authenticate is priority

**Attack Mitigation:**
- ✅ **Distributed attacks** - Still limited per IP (needs Redis for full protection)
- ✅ **Brute force** - Still prevented by rate limits
- ✅ **Cost abuse** - Still prevented by reasonable limits

---

## 🎯 Design Philosophy

**Priority Order:**
1. **Legitimate users must not be impacted** ✅
2. **Attackers must be rate limited** ✅
3. **Costs must be controlled** ✅

**Implementation:**
- **Authentication endpoints:** Higher limits to allow polling (60/min for callback)
- **Dashboard endpoints:** Very generous limits (20x normal usage)
- **Public endpoints:** Moderate limits (prevent abuse, allow caching)

**Result:**
- ✅ **Legitimate users:** Excellent experience, no rate limit issues
- ✅ **Attackers:** Still rate limited, costs controlled
- ✅ **Balance:** Achieved between security and UX

---

## 📋 Summary

**Status:** ✅ **FIXED**

**Changes:**
- ✅ Increased `/api/auth/callback` from 10/min to 60/min
- ✅ Increased `/api/verify` from 10/min to 20/min

**Impact:**
- ✅ **Legitimate users:** Can complete authentication successfully
- ✅ **Attackers:** Still rate limited (acceptable cost trade-off)
- ✅ **Dashboard:** No impact (limits remain very generous)

**Conclusion:** Rate limits now protect against abuse while ensuring legitimate users have an excellent experience. The slight increase in potential attack cost (~$1.04/month vs $0.17/month) is an acceptable trade-off to ensure authentication works reliably.


