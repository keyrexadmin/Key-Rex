# Returning User Flow Verification

## Analysis Date: Implementation Review
## Status: ⚠️ ISSUE FOUND - NEEDS FIX

---

## User Requirements

1. **Sign-in button in top right navigation** - Should authenticate and redirect to dashboard for returning users
2. **Re-going through wizard** - Should recognize user has account and redirect to dashboard

---

## Current Code Analysis

### ✅ Test 1: Sign-In Button (Top Right Navigation)
**File:** `components/LoginButton.tsx` (lines 38-57)

**Current Behavior:**
- User clicks sign-in button
- `handleLoginSuccess()` is called
- Checks `freeDisclaimerAccepted` flag
- If `true` → Redirects to `/dashboard` ✅
- If `false` → Shows modal

**Status:** ✅ **CORRECT** - Works as expected for returning users

---

### ⚠️ Test 2: Re-Going Through Wizard
**File:** `components/OnboardingWizard.tsx`

**Current Behavior:**
- When wizard opens, no check is performed for existing completed account
- User can go through all 4 steps again
- Only redirects to dashboard at the END (line 292) after accepting disclaimer again

**Issue Found:**
- Line 48: Only checks `freeDisclaimerAccepted && !isOpen` - this means it only redirects if wizard is CLOSED
- Lines 85-88: When wizard is OPEN, it ALWAYS proceeds through the flow, even if user already completed wizard
- **Problem:** Returning users who open the wizard will be forced to go through all steps again

**Expected Behavior:**
- When wizard opens, check if user has `freeDisclaimerAccepted = true`
- If yes, immediately redirect to dashboard (don't show wizard)
- If no, show wizard normally

**Status:** ⚠️ **NEEDS FIX** - Does not recognize returning users when wizard opens

---

## Required Fix

### Fix: Check Wizard Completion When Wizard Opens
**File:** `components/OnboardingWizard.tsx`

**Add useEffect to check completion status when wizard opens:**

```typescript
// Check if user has already completed wizard when wizard opens
useEffect(() => {
  if (isOpen && currentStep === 1) {
    const checkExistingAccount = async () => {
      try {
        const res = await fetch('/api/user', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (res.ok) {
          const userData = await res.json()
          if (userData.freeDisclaimerAccepted) {
            // User already completed wizard - redirect to dashboard
            console.log('User already completed wizard - redirecting to dashboard')
            onClose()
            router.push('/dashboard')
          }
        }
      } catch (error) {
        // On error, allow wizard to proceed (don't block)
        console.error('Error checking existing account:', error)
      }
    }
    checkExistingAccount()
  }
}, [isOpen, currentStep, router, onClose])
```

---

## Summary

### ✅ Confirmed Working:
1. **Sign-in button** - Correctly redirects returning users to dashboard

### ⚠️ Needs Fix:
2. **Wizard re-opening** - Does NOT recognize returning users, forces them through all steps again

---

## Recommendation

**Implement the fix above** to check wizard completion status when the wizard opens. This will ensure returning users are immediately redirected to their dashboard instead of being forced through the wizard again.



