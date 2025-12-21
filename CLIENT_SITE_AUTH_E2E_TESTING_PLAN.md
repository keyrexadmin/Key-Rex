# End-to-End Testing Plan
## End-User Authentication on BitPass Customer Websites

**Purpose:** Comprehensive testing plan for end-users authenticating on websites that have integrated BitPass.

**Scope:** Complete end-user journey from visiting a customer's website to successfully authenticating with a Lightning wallet.

---

## 🎯 Testing Status Overview

### ✅ Automated Tests (To Be Implemented)
**0/0 tests passing** - Run with: `npm run test:client-auth`

These tests will verify backend/API functionality, security, and basic script loading. Automated tests are not yet implemented.

**Coverage:**
- Embed script loading
- Configuration API endpoints
- Authentication API endpoints
- Security protections (CORS, origin validation)
- Error handling
- Domain validation

### ⚠️ Manual Tests Required
The following test cases require manual testing with a browser and Lightning wallet. These cannot be fully automated due to:
- Visual verification requirements
- Wallet interaction (WebLN, QR code scanning)
- User experience and responsive design
- Interactive UI flows
- Cross-origin communication

**Estimated Manual Testing Time:** 2-3 hours

---

## 📋 Quick Reference: What to Test Manually

### Critical Path (Must Test)
1. **Embed Script Loading** (TC-CLIENT-1.1, TC-CLIENT-1.2, TC-CLIENT-1.3)
2. **BitPass Card Display** (TC-CLIENT-2.1, TC-CLIENT-2.2, TC-CLIENT-2.3)
3. **WebLN Authentication** (TC-CLIENT-3.1, TC-CLIENT-3.2, TC-CLIENT-3.3)
4. **QR Code Authentication** (TC-CLIENT-4.1, TC-CLIENT-4.2, TC-CLIENT-4.3)
5. **Success Callback** (TC-CLIENT-5.1, TC-CLIENT-5.2)
6. **Error Handling** (TC-CLIENT-6.1, TC-CLIENT-6.2)

### Important (Should Test)
7. **Integration Status** (TC-CLIENT-7.1, TC-CLIENT-7.2)
8. **Domain Validation** (TC-CLIENT-8.1, TC-CLIENT-8.2)
9. **Mobile Experience** (TC-CLIENT-9.1, TC-CLIENT-9.2)
10. **Multiple Authentication Attempts** (TC-CLIENT-10.1)

### Nice to Have
11. **Performance** (TC-CLIENT-11.1, TC-CLIENT-11.2)
12. **Accessibility** (TC-CLIENT-12.1)
13. **Browser Compatibility** (TC-CLIENT-13.1)

---

## Test Environment Setup

### Prerequisites
- BitPass server running on `http://localhost:3000`
- Fake client site running on `http://localhost:3001` (or use `npm run dev:client`)
- BitPass customer account created and wizard completed
- Valid `siteId` from BitPass dashboard
- Lightning wallet installed (Alby extension or mobile wallet app)
- Browser with developer tools enabled
- Clear browser cookies and local storage before each test run

### Test Data
- **Valid Site ID:** Use siteId from BitPass dashboard (e.g., `a252dfa1030706a49efab31af2fc29d6`)
- **Test Domain:** `localhost:3001` (for fake client site)
- **Lightning Wallet:** Alby extension (desktop) or mobile wallet app

### Client Site Setup
1. Navigate to fake client site: `http://localhost:3001`
2. Verify BitPass embed script is loaded
3. Verify BitPass card displays correctly

---

## Test Suite 1: Embed Script Loading

### ⚠️ TC-CLIENT-1.1: Embed Script Loads Successfully (MANUAL - REQUIRED)
**Objective:** Verify the BitPass embed script loads without errors.

**Steps:**
1. Navigate to a customer website with BitPass integrated
2. Open browser developer console
3. Verify script loads

**Expected Results:**
- ✅ Embed script loads from `/embed?siteId=...`
- ✅ No console errors
- ✅ Script executes successfully
- ✅ `window.BitPass` object is available
- ✅ `window.BitPass.init` function exists
- ✅ `window.BitPass.onSuccess` can be set
- ✅ `window.BitPass.onError` can be set

**Validation:**
- Check browser console for errors
- Verify `window.BitPass` object structure
- Test script loading on different pages
- Test script loading with slow network

---

### ⚠️ TC-CLIENT-1.2: Embed Script with Invalid Site ID (MANUAL - REQUIRED)
**Objective:** Verify error handling for invalid site ID.

**Steps:**
1. Load embed script with invalid site ID
2. Open browser developer console
3. Verify error handling

**Expected Results:**
- ✅ Script loads (returns 200, not 404)
- ✅ Console error message displayed: "Invalid siteId"
- ✅ Error message includes instructions
- ✅ `window.BitPass.onError` called (if set)
- ✅ No BitPass card displayed
- ✅ Graceful degradation (no page crash)

**Validation:**
- Test with completely invalid site ID
- Test with site ID that doesn't exist
- Verify error messages are clear
- Check that page still functions

---

### ⚠️ TC-CLIENT-1.3: Embed Script Auto-Initialization (MANUAL - REQUIRED)
**Objective:** Verify embed script auto-initializes when DOM is ready.

**Steps:**
1. Load page with BitPass embed script
2. Wait for page to load
3. Verify auto-initialization

**Expected Results:**
- ✅ Script auto-initializes when DOM is ready
- ✅ BitPass card appears without manual `BitPass.init()` call
- ✅ Works on `DOMContentLoaded` event
- ✅ Works if DOM is already loaded when script executes
- ✅ No duplicate initialization

**Validation:**
- Test with slow-loading page
- Test with fast-loading page
- Test with script in `<head>` vs `<body>`
- Verify no duplicate cards

---

## Test Suite 2: BitPass Card Display

### ⚠️ TC-CLIENT-2.1: BitPass Card Renders Correctly (MANUAL - REQUIRED)
**Objective:** Verify the BitPass card displays all required elements.

**Steps:**
1. Navigate to customer website
2. Wait for BitPass card to load
3. Verify card display

**Expected Results:**
- ✅ BitPass card appears in container (`#bitpass-container` or `body`)
- ✅ BitPass logo button visible and clickable
- ✅ "Featured Wallets" label visible
- ✅ Featured wallet logos display (Alby, Phoenix, Zeus)
- ✅ Card styling is correct (border, shadow, padding)
- ✅ Card is responsive (mobile/tablet/desktop)
- ✅ No layout shifts or visual glitches

**Validation:**
- Verify card appears in correct container
- Check all visual elements render
- Test responsive design on different screen sizes
- Verify card doesn't break page layout

---

### ⚠️ TC-CLIENT-2.2: BitPass Card with Custom Container (MANUAL - REQUIRED)
**Objective:** Verify BitPass card renders in custom container element.

**Steps:**
1. Create custom container: `<div id="bitpass-container"></div>`
2. Load BitPass embed script
3. Verify card appears in custom container

**Expected Results:**
- ✅ Card appears in `#bitpass-container` if present
- ✅ Falls back to `body` if container not found
- ✅ Card styling remains consistent
- ✅ Card doesn't appear in both locations

**Validation:**
- Test with custom container
- Test without custom container
- Test with multiple containers (should use first)
- Verify fallback behavior

---

### ⚠️ TC-CLIENT-2.3: BitPass Card Loading State (MANUAL - REQUIRED)
**Objective:** Verify loading skeleton displays while configuration loads.

**Steps:**
1. Load page with BitPass embed script
2. Observe loading state
3. Verify transition to loaded state

**Expected Results:**
- ✅ Loading skeleton appears immediately
- ✅ Skeleton shows placeholder for logo and wallets
- ✅ Smooth transition to actual card
- ✅ No flash of unstyled content
- ✅ Loading state is visually clear

**Validation:**
- Test with slow network (throttle in DevTools)
- Test with fast network
- Verify skeleton animation
- Check transition smoothness

---

## Test Suite 3: WebLN Authentication

### ⚠️ TC-CLIENT-3.1: WebLN Authentication - Successful (MANUAL - REQUIRED)
**Objective:** Verify WebLN authentication works with browser extension.

**Steps:**
1. Navigate to customer website
2. Click BitPass logo button
3. Approve authentication in Alby extension
4. Verify authentication success

**Expected Results:**
- ✅ Clicking logo button triggers WebLN authentication
- ✅ Alby extension prompt appears
- ✅ After approval, authentication succeeds
- ✅ `window.BitPass.onSuccess(xpub)` is called
- ✅ Success notification appears (if implemented)
- ✅ No error messages
- ✅ Authentication completes quickly (< 3 seconds)

**Validation:**
- Test with Alby extension
- Verify xpub is correct format
- Check success callback timing
- Verify no console errors

---

### ⚠️ TC-CLIENT-3.2: WebLN Authentication - User Rejects (MANUAL - REQUIRED)
**Objective:** Verify error handling when user rejects WebLN authentication.

**Steps:**
1. Navigate to customer website
2. Click BitPass logo button
3. Reject authentication in Alby extension
4. Verify error handling

**Expected Results:**
- ✅ User can reject authentication
- ✅ Error message displayed (if implemented)
- ✅ `window.BitPass.onError(error)` is called
- ✅ User can retry authentication
- ✅ No page crash or infinite loops
- ✅ Error message is clear and helpful

**Validation:**
- Test rejection flow
- Verify error callback
- Check error message clarity
- Test retry functionality

---

### ⚠️ TC-CLIENT-3.3: WebLN Authentication - Extension Not Installed (MANUAL - REQUIRED)
**Objective:** Verify fallback to QR code when WebLN is not available.

**Steps:**
1. Navigate to customer website (without WebLN extension)
2. Click BitPass logo button
3. Verify QR code fallback

**Expected Results:**
- ✅ WebLN detection works correctly
- ✅ Falls back to QR code automatically
- ✅ QR code popup opens (desktop) or redirect occurs (mobile)
- ✅ No error messages about missing WebLN
- ✅ User experience is smooth

**Validation:**
- Test without WebLN extension
- Verify automatic fallback
- Check QR code appears correctly
- Test on different browsers

---

## Test Suite 4: QR Code Authentication

### ⚠️ TC-CLIENT-4.1: QR Code Authentication - Desktop Popup (MANUAL - REQUIRED)
**Objective:** Verify QR code authentication works in popup window on desktop.

**Steps:**
1. Navigate to customer website (desktop, no WebLN)
2. Click BitPass logo button
3. QR code popup opens
4. Scan QR code with mobile wallet
5. Approve authentication
6. Verify authentication success

**Expected Results:**
- ✅ QR code popup opens in new window
- ✅ Popup is properly sized and centered
- ✅ QR code is clear and scannable
- ✅ Instructions are visible
- ✅ After scanning and approval, popup closes
- ✅ `window.BitPass.onSuccess(xpub)` is called
- ✅ Success notification appears on parent window
- ✅ Authentication completes successfully

**Validation:**
- Test popup opening
- Verify QR code quality
- Test scanning with different wallets
- Check popup closing behavior
- Verify postMessage communication

---

### ⚠️ TC-CLIENT-4.2: QR Code Authentication - Mobile Redirect (MANUAL - REQUIRED)
**Objective:** Verify QR code authentication works with full redirect on mobile.

**Steps:**
1. Navigate to customer website on mobile device
2. Click BitPass logo button
3. Full redirect to QR code page
4. Scan QR code or use "Open in Wallet" button
5. Approve authentication
6. Return to customer website
7. Verify authentication success

**Expected Results:**
- ✅ Full redirect occurs (not popup)
- ✅ QR code page loads correctly
- ✅ "Open in Wallet" button visible (if applicable)
- ✅ After approval, redirects back to customer site
- ✅ xpub passed in URL parameter
- ✅ `window.BitPass.onSuccess(xpub)` is called
- ✅ URL parameter cleaned up (removed from URL)
- ✅ Authentication completes successfully

**Validation:**
- Test on actual mobile device
- Verify redirect flow
- Check URL parameter handling
- Test return to customer site
- Verify success callback

---

### ⚠️ TC-CLIENT-4.3: QR Code Authentication - Popup Blocked (MANUAL - REQUIRED)
**Objective:** Verify fallback when popup is blocked by browser.

**Steps:**
1. Enable popup blocker in browser
2. Navigate to customer website (desktop, no WebLN)
3. Click BitPass logo button
4. Verify fallback behavior

**Expected Results:**
- ✅ Popup blocked detection works
- ✅ Falls back to full redirect
- ✅ User is redirected to QR code page
- ✅ After authentication, redirects back to customer site
- ✅ Authentication completes successfully
- ✅ No error messages about popup blocking

**Validation:**
- Test with popup blocker enabled
- Verify fallback behavior
- Check redirect flow
- Test return to customer site

---

## Test Suite 5: Success Callback

### ⚠️ TC-CLIENT-5.1: Success Callback - onSuccess Called (MANUAL - REQUIRED)
**Objective:** Verify `onSuccess` callback is called with correct xpub.

**Steps:**
1. Set up `window.BitPass.onSuccess` callback
2. Complete authentication (WebLN or QR code)
3. Verify callback is called

**Expected Results:**
- ✅ `onSuccess(xpub)` is called after successful authentication
- ✅ xpub is correct format (string, starts with "xpub")
- ✅ Callback is called only once
- ✅ Callback receives valid xpub
- ✅ Customer site can use xpub for session management

**Validation:**
- Test with WebLN authentication
- Test with QR code authentication
- Verify xpub format
- Check callback timing
- Test multiple authentications

---

### ⚠️ TC-CLIENT-5.2: Success Callback - Customer Site Integration (MANUAL - REQUIRED)
**Objective:** Verify customer site can integrate with success callback.

**Steps:**
1. Set up custom `onSuccess` callback
2. Complete authentication
3. Verify customer site receives xpub
4. Test customer site session management

**Expected Results:**
- ✅ Customer site can set custom `onSuccess` callback
- ✅ Callback receives xpub parameter
- ✅ Customer site can send xpub to backend
- ✅ Customer site can create user session
- ✅ Customer site can redirect to protected page
- ✅ Integration works smoothly

**Validation:**
- Test custom callback implementation
- Verify xpub delivery to backend
- Test session creation
- Check redirect behavior
- Test protected page access

---

## Test Suite 6: Error Handling

### ⚠️ TC-CLIENT-6.1: Error Callback - onError Called (MANUAL - REQUIRED)
**Objective:** Verify `onError` callback is called on authentication failures.

**Steps:**
1. Set up `window.BitPass.onError` callback
2. Trigger authentication error (reject, network error, etc.)
3. Verify callback is called

**Expected Results:**
- ✅ `onError(error)` is called on authentication failures
- ✅ Error object contains useful information
- ✅ Error message is clear and helpful
- ✅ Customer site can handle errors gracefully
- ✅ User can retry authentication

**Validation:**
- Test with user rejection
- Test with network errors
- Test with invalid site ID
- Test with disabled integration
- Verify error message clarity

---

### ⚠️ TC-CLIENT-6.2: Error Handling - Network Failures (MANUAL - REQUIRED)
**Objective:** Verify error handling for network failures.

**Steps:**
1. Disable network connection
2. Attempt authentication
3. Verify error handling

**Expected Results:**
- ✅ Network errors detected
- ✅ Error message displayed
- ✅ `onError` callback called
- ✅ User can retry after network restored
- ✅ No application crashes
- ✅ Graceful degradation

**Validation:**
- Test with network disabled
- Test with slow network
- Test with intermittent network
- Verify error messages
- Check retry functionality

---

## Test Suite 7: Integration Status

### ⚠️ TC-CLIENT-7.1: Integration Disabled - Card Display (MANUAL - REQUIRED)
**Objective:** Verify card displays correctly when integration is disabled.

**Steps:**
1. Disable integration in BitPass dashboard
2. Navigate to customer website
3. Verify card display

**Expected Results:**
- ✅ Card displays disabled message
- ✅ Message: "₿itPass authentication is currently disabled"
- ✅ Logo button is not clickable (or shows error)
- ✅ Clear instructions to contact website owner
- ✅ No authentication can be attempted

**Validation:**
- Test with integration disabled
- Verify message clarity
- Check button behavior
- Test error handling

---

### ⚠️ TC-CLIENT-7.2: Integration Disabled - Authentication Attempt (MANUAL - REQUIRED)
**Objective:** Verify error handling when attempting authentication with disabled integration.

**Steps:**
1. Disable integration in BitPass dashboard
2. Navigate to customer website
3. Attempt authentication (if button is clickable)
4. Verify error handling

**Expected Results:**
- ✅ Authentication attempt is blocked
- ✅ Error message: "₿itPass authentication is currently disabled"
- ✅ `onError` callback called with appropriate error
- ✅ User cannot authenticate
- ✅ Clear instructions displayed

**Validation:**
- Test authentication attempt
- Verify error message
- Check callback behavior
- Test user experience

---

## Test Suite 8: Domain Validation

### ⚠️ TC-CLIENT-8.1: First-Use Domain Capture (MANUAL - REQUIRED)
**Objective:** Verify first-use domain is automatically captured.

**Steps:**
1. Create new BitPass account (no domains configured)
2. Navigate to customer website
3. Complete authentication
4. Check BitPass dashboard
5. Verify domain was captured

**Expected Results:**
- ✅ First authentication from new domain captures domain
- ✅ Domain appears in BitPass dashboard
- ✅ Domain is normalized correctly
- ✅ No manual domain entry required
- ✅ Subsequent authentications work

**Validation:**
- Test with new account
- Verify domain capture
- Check domain normalization
- Test subsequent authentications

---

### ⚠️ TC-CLIENT-8.2: Unauthorized Domain - Authentication Blocked (MANUAL - REQUIRED)
**Objective:** Verify authentication is blocked for unauthorized domains.

**Steps:**
1. Configure allowed domains in BitPass dashboard
2. Attempt authentication from unauthorized domain
3. Verify authentication is blocked

**Expected Results:**
- ✅ Authentication attempt from unauthorized domain is blocked
- ✅ Error message: "This domain is not authorized — add it in your dashboard"
- ✅ `onError` callback called
- ✅ User cannot authenticate
- ✅ Clear instructions displayed

**Validation:**
- Test with unauthorized domain
- Verify error message
- Check callback behavior
- Test authorized domain (should work)

---

## Test Suite 9: Mobile Experience

### ⚠️ TC-CLIENT-9.1: Mobile Card Display (MANUAL - REQUIRED)
**Objective:** Verify BitPass card displays correctly on mobile devices.

**Steps:**
1. Navigate to customer website on mobile device
2. Verify card display
3. Test responsive design

**Expected Results:**
- ✅ Card displays correctly on mobile
- ✅ Card is responsive (stacks vertically on small screens)
- ✅ Logo button is appropriately sized
- ✅ Featured wallets are visible
- ✅ Card doesn't break page layout
- ✅ Touch interactions work correctly

**Validation:**
- Test on actual mobile device
- Test on different screen sizes
- Verify responsive design
- Check touch interactions

---

### ⚠️ TC-CLIENT-9.2: Mobile Authentication Flow (MANUAL - REQUIRED)
**Objective:** Verify complete authentication flow on mobile devices.

**Steps:**
1. Navigate to customer website on mobile device
2. Click BitPass logo button
3. Complete authentication (QR code or deep link)
4. Verify authentication success

**Expected Results:**
- ✅ Mobile authentication flow works correctly
- ✅ QR code redirect works
- ✅ Deep link to wallet works (if applicable)
- ✅ Return to customer site works
- ✅ Success callback is called
- ✅ User experience is smooth

**Validation:**
- Test on actual mobile device
- Test with different mobile wallets
- Verify redirect flow
- Check return behavior

---

## Test Suite 10: Multiple Authentication Attempts

### ⚠️ TC-CLIENT-10.1: Multiple Authentications - Same User (MANUAL - REQUIRED)
**Objective:** Verify multiple authentication attempts work correctly.

**Steps:**
1. Complete authentication successfully
2. Log out (if customer site has logout)
3. Authenticate again
4. Verify behavior

**Expected Results:**
- ✅ Multiple authentications work correctly
- ✅ Same xpub returned for same wallet
- ✅ No errors or conflicts
- ✅ Success callback called each time
- ✅ Customer site can handle multiple authentications

**Validation:**
- Test multiple authentications
- Verify xpub consistency
- Check callback behavior
- Test session management

---

## Test Suite 11: Performance

### ⚠️ TC-CLIENT-11.1: Script Load Performance (MANUAL - REQUIRED)
**Objective:** Verify embed script loads quickly.

**Steps:**
1. Navigate to customer website
2. Measure script load time
3. Verify performance

**Expected Results:**
- ✅ Script loads in < 1 second
- ✅ Card appears quickly
- ✅ No unnecessary requests
- ✅ Good user experience

**Validation:**
- Measure load times
- Check network requests
- Verify performance metrics
- Test with slow network

---

### ⚠️ TC-CLIENT-11.2: Authentication Performance (MANUAL - REQUIRED)
**Objective:** Verify authentication completes quickly.

**Steps:**
1. Start authentication
2. Measure time to completion
3. Verify performance

**Expected Results:**
- ✅ WebLN authentication completes in < 3 seconds
- ✅ QR code authentication completes in < 30 seconds (user-dependent)
- ✅ No unnecessary delays
- ✅ Good user experience

**Validation:**
- Measure authentication times
- Check network requests
- Verify performance metrics
- Test with different wallets

---

## Test Suite 12: Accessibility

### ⚠️ TC-CLIENT-12.1: Accessibility - Keyboard Navigation (MANUAL - REQUIRED)
**Objective:** Verify BitPass card is accessible via keyboard.

**Steps:**
1. Navigate to customer website
2. Use keyboard to navigate to BitPass card
3. Verify keyboard accessibility

**Expected Results:**
- ✅ Logo button is keyboard accessible
- ✅ Tab navigation works correctly
- ✅ Enter/Space activates button
- ✅ Focus indicators are visible
- ✅ Screen reader compatible

**Validation:**
- Test keyboard navigation
- Verify focus indicators
- Test with screen reader
- Check ARIA attributes

---

## Test Suite 13: Browser Compatibility

### ⚠️ TC-CLIENT-13.1: Browser Compatibility - Major Browsers (MANUAL - REQUIRED)
**Objective:** Verify BitPass works on major browsers.

**Steps:**
1. Test on Chrome
2. Test on Firefox
3. Test on Safari
4. Test on Edge
5. Verify functionality

**Expected Results:**
- ✅ Works on Chrome (latest)
- ✅ Works on Firefox (latest)
- ✅ Works on Safari (latest)
- ✅ Works on Edge (latest)
- ✅ No browser-specific issues

**Validation:**
- Test on each browser
- Verify all features work
- Check for browser-specific bugs
- Test WebLN support (varies by browser)

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] BitPass server running on `http://localhost:3000`
- [ ] Fake client site running on `http://localhost:3001`
- [ ] BitPass customer account created
- [ ] Valid `siteId` obtained from dashboard
- [ ] Lightning wallet installed (Alby or mobile wallet)
- [ ] Browser developer tools enabled
- [ ] Cookies and local storage cleared

### Test Execution Order
**Focus on critical authentication flows:**

1. **Embed Script Loading** (TC-CLIENT-1.1, TC-CLIENT-1.2, TC-CLIENT-1.3)
2. **BitPass Card Display** (TC-CLIENT-2.1, TC-CLIENT-2.2, TC-CLIENT-2.3)
3. **WebLN Authentication** (TC-CLIENT-3.1, TC-CLIENT-3.2, TC-CLIENT-3.3)
4. **QR Code Authentication** (TC-CLIENT-4.1, TC-CLIENT-4.2, TC-CLIENT-4.3)
5. **Success Callback** (TC-CLIENT-5.1, TC-CLIENT-5.2)
6. **Error Handling** (TC-CLIENT-6.1, TC-CLIENT-6.2)
7. **Integration Status** (TC-CLIENT-7.1, TC-CLIENT-7.2)
8. **Domain Validation** (TC-CLIENT-8.1, TC-CLIENT-8.2)
9. **Mobile Experience** (TC-CLIENT-9.1, TC-CLIENT-9.2)
10. **Multiple Authentications** (TC-CLIENT-10.1)
11. **Performance** (TC-CLIENT-11.1, TC-CLIENT-11.2)
12. **Accessibility** (TC-CLIENT-12.1)
13. **Browser Compatibility** (TC-CLIENT-13.1)

### Test Results Template

For each test case, record:
- **Test Case ID:** (e.g., TC-CLIENT-1.1)
- **Date:** [Date]
- **Tester:** [Name]
- **Browser:** [Browser and version]
- **Wallet:** [Wallet name and version]
- **Status:** ✅ Pass / ❌ Fail / ⚠️ Partial
- **Notes:**
- **Screenshots:** (if applicable)
- **Issues Found:** (if any)

---

## Success Criteria

### Critical Path (Must Test Manually)
- ⚠️ Embed script loads successfully
- ⚠️ BitPass card displays correctly
- ⚠️ WebLN authentication works
- ⚠️ QR code authentication works (popup and redirect)
- ⚠️ Success callback receives correct xpub
- ⚠️ Error handling works gracefully
- ⚠️ Integration status check works
- ⚠️ Domain validation works

### Important (Should Test Manually)
- ⚠️ Mobile experience functional
- ⚠️ Multiple authentications work
- ⚠️ Performance acceptable
- ⚠️ Accessibility features work

### Nice to Have (Manual Testing)
- ⚠️ All browsers supported
- ⚠️ Optimal performance
- ⚠️ Perfect accessibility

---

## Known Limitations & Workarounds

### In-Memory Storage
- **Issue:** User data resets on server restart
- **Workaround:** Use persistent storage in production
- **Impact:** Test data may be lost between restarts

### WebLN Support
- **Note:** WebLN support varies by browser and wallet
- **Impact:** Some browsers may not support WebLN, will fall back to QR code

### QR Code Scanning
- **Note:** Many wallets don't currently support QR code scanning for LNURL-auth
- **Impact:** Users may need to use WebLN or copy LNURL manually

### CORS Configuration
- **Note:** CORS is handled automatically by BitPass
- **Impact:** No manual CORS configuration needed

---

**Document Version:** 1.0  
**Last Updated:** [Current Date]  
**Maintained By:** Development Team


