# Rate Limit UX Analysis: Impact on Legitimate Users

**Date:** $(date)  
**Status:** ⚠️ **CRITICAL ISSUE FOUND - NEEDS FIX**

---

## 🔍 Usage Pattern Analysis

### Dashboard Usage (Legitimate Users)

**Normal Usage Patterns:**
- `/api/user`: Called **once on page load**, **once on tab switch**, **once on refresh**
  - **Typical:** 1-3 requests per minute
  - **Current limit:** 60/min ✅ **VERY GENEROUS** (20x normal usage)
  
- `/api/usage`: Called **once on page load**, **periodically for analytics**
  - **Typical:** 1-2 requests per minute
  - **Current limit:** 30/min ✅ **VERY GENEROUS** (15x normal usage)
  
- `/api/domains` (GET): Called **once on page load**, **once when managing domains**
  - **Typical:** 1-2 requests per minute
  - **Current limit:** 30/min ✅ **VERY GENEROUS** (15x normal usage)
  
- `/api/domains` (POST/PUT/DELETE): Called **only when user adds/edits/deletes domains**
  - **Typical:** 0-1 requests per minute (only when actively managing)
  - **Current limit:** 10/min ✅ **GENEROUS** (10x normal usage)

### Authentication Flow (Legitimate Users)

**QR Code Authentication:**
- User scans QR code → Wallet authenticates → QR page polls for result
- **Polling pattern:** Every 1 second for up to 60 seconds
- **Total requests:** Up to **60 requests in 1 minute** per authentication attempt
- **Current limit:** 10/min ❌ **TOO RESTRICTIVE - WILL BREAK AUTHENTICATION!**

**WebLN Authentication:**
- User clicks button → WebLN authenticates → Script polls callback
- **Polling pattern:** Every 500ms for up to 10 retries (5 seconds total)
- **Total requests:** Up to **10 requests in 5 seconds** per authentication attempt
- **Current limit:** 10/min ✅ **ACCEPTABLE** (but tight)

---

## ⚠️ CRITICAL ISSUE: QR Authentication Will Fail

### Problem

**QR Code Authentication Flow:**
1. User scans QR code
2. QR page polls `/api/auth/callback` every 1 second
3. Polls for up to 60 seconds (60 requests)
4. **Current rate limit:** 10/min = **Rate limit hit after 10 seconds**
5. **Authentication fails** even though user successfully authenticated with wallet

**Impact:**
- ❌ **Legitimate users cannot complete authentication**
- ❌ **QR code flow is broken**
- ❌ **Mobile users (who use QR codes) are blocked**

### Solution Required

**Option 1: Increase `/api/auth/callback` limit (Recommended)**
- Current: 10/min
- **Recommended:** 60/min (allows full 60-second polling window)
- **Alternative:** 30/min (allows 30-second polling, still reasonable)

**Option 2: Implement per-session rate limiting**
- Track `k1` challenge identifier
- Allow higher limits for active authentication sessions
- More complex but more precise

**Option 3: Reduce polling frequency**
- Change polling from 1 second to 2 seconds
- Reduces requests to 30 in 60 seconds
- **Not recommended** - slower UX for legitimate users

---

## ✅ Current Limits Analysis

### Limits That Are Good (Don't Impact Legitimate Users)

| Endpoint | Limit | Normal Usage | Headroom | Status |
|----------|-------|--------------|----------|--------|
| `/api/user` | 60/min | 1-3/min | 20x | ✅ Excellent |
| `/api/usage` | 30/min | 1-2/min | 15x | ✅ Excellent |
| `/api/domains` (GET) | 30/min | 1-2/min | 15x | ✅ Excellent |
| `/api/domains` (POST/PUT/DELETE) | 10/min | 0-1/min | 10x | ✅ Excellent |
| `/api/embed` | 30/min | 1/min (cached) | 30x | ✅ Excellent |
| `/api/embed/config` | 30/min | 1/min (cached) | 30x | ✅ Excellent |
| `/api/integration/toggle` | 5/min | 0-1/min | 5x | ✅ Good |
| `/api/activity` | 30/min | 1-2/min | 15x | ✅ Excellent |
| `/api/auth/lnurl` | 5/min | 1-2/min | 2.5x | ✅ Good |
| `/api/auth/login` | 5/min | 1/min | 5x | ✅ Good |
| `/api/contact` | 3/min | 0-1/min | 3x | ✅ Good |

### Limits That Need Adjustment

| Endpoint | Current | Issue | Recommended | Reason |
|----------|---------|-------|-------------|--------|
| `/api/auth/callback` | 10/min | ❌ **Breaks QR auth** | **60/min** | QR polling needs 60 requests in 60 seconds |
| `/api/verify` | 10/min | ⚠️ Tight for WebLN | **20/min** | WebLN polling can hit 10 requests quickly |

---

## 📊 Impact Assessment

### Before Fix (Current State)

**Legitimate Users:**
- ❌ **QR authentication fails** after 10 seconds (rate limited)
- ⚠️ **WebLN authentication** may fail if slow network (rate limited)
- ✅ **Dashboard usage** - No impact (limits very generous)

**Attackers:**
- ✅ **Limited to 10 requests/min** on callback endpoint
- ✅ **Limited to reasonable rates** on other endpoints

### After Fix (Recommended)

**Legitimate Users:**
- ✅ **QR authentication works** (60 requests allowed in 60 seconds)
- ✅ **WebLN authentication works** (20 requests allowed, sufficient)
- ✅ **Dashboard usage** - No impact (limits remain generous)

**Attackers:**
- ⚠️ **Limited to 60 requests/min** on callback endpoint (still reasonable)
- ✅ **Limited to reasonable rates** on other endpoints

**Cost Impact:**
- **Before:** 10/min = 600/hour = 14,400/day = 432,000/month per IP
- **After:** 60/min = 3,600/hour = 86,400/day = 2,592,000/month per IP
- **Still reasonable** - 60 requests/min is not excessive for a polling endpoint
- **Cost:** ~$1.04/month per attacker (vs $0.17/month before)
- **Trade-off:** Acceptable to ensure legitimate users can authenticate

---

## 🎯 Recommended Changes

### Immediate Fix (Required)

1. **Increase `/api/auth/callback` limit:**
   - From: 10/min
   - To: **60/min**
   - Reason: QR code polling requires up to 60 requests in 60 seconds

2. **Increase `/api/verify` limit:**
   - From: 10/min
   - To: **20/min**
   - Reason: WebLN polling can hit 10 requests quickly, add buffer

### Optional Improvements

1. **Implement per-session rate limiting** (future enhancement)
   - Track active authentication sessions by `k1`
   - Allow higher limits for active sessions
   - More precise but more complex

2. **Add rate limit headers** to responses
   - Help clients understand remaining requests
   - Better UX for legitimate users

---

## ✅ Summary

**Current Status:**
- ✅ **Dashboard limits:** Excellent - no impact on legitimate users
- ❌ **Authentication limits:** **CRITICAL ISSUE** - QR auth will fail
- ⚠️ **WebLN limits:** Tight but acceptable

**Required Action:**
1. **URGENT:** Increase `/api/auth/callback` to 60/min
2. **RECOMMENDED:** Increase `/api/verify` to 20/min

**Impact After Fix:**
- ✅ **Legitimate users:** No negative impact, authentication works
- ✅ **Attackers:** Still rate limited, costs remain reasonable
- ✅ **Cost protection:** Maintained while ensuring good UX

---

**Conclusion:** Current limits are **too restrictive for authentication flows** but **very generous for dashboard usage**. Need to increase authentication endpoint limits to ensure legitimate users can complete authentication.

