# End-to-End Testing Plan
## BitPass Website Visitor Journey

**Purpose:** Comprehensive testing plan for a website visitor setting up and using BitPass services.

**Scope:** Complete user journey from landing page to successful integration and ongoing usage.

---

## 🎯 Testing Status Overview

### ✅ Automated Tests (Completed)
**30/30 tests passing** - Run with: `npm run test:e2e`

These tests verify backend/API functionality, security, and basic page accessibility. All automated tests are passing.

**Coverage:**
- ✅ Landing page and public pages load correctly
- ✅ API endpoints require proper authentication
- ✅ Security protections (CORS, cookies, middleware) are active
- ✅ Error handling works correctly
- ✅ Performance meets requirements

### ⚠️ Manual Tests Required
The following test cases require manual testing with a browser and Lightning wallet. These cannot be automated due to:
- Visual verification requirements
- Wallet interaction (WebLN, QR code scanning)
- User experience and responsive design
- Interactive UI flows

**Estimated Manual Testing Time:** 2-3 hours

---

## 📋 Quick Reference: What to Test Manually

### Critical Path (Must Test)
1. **Complete Onboarding Wizard** (TC-2.1 through TC-2.6)
2. **Dashboard UI Navigation** (TC-3.1 through TC-3.3)
3. **Integration Code Setup** (TC-4.1 through TC-4.4)
4. **Domain Management UI** (TC-5.1 through TC-5.6)
5. **Client Site Integration** (TC-6.1 through TC-6.6)
6. **Wallet Authentication Flows** (WebLN and QR code)

### Important (Should Test)
7. **Analytics Display** (TC-7.1 through TC-7.3)
8. **Documentation & Troubleshooting UI** (TC-8.1 through TC-8.3)
9. **Settings UI** (TC-9.1 through TC-9.2)
10. **Returning User Flows** (TC-10.1 through TC-10.2)
11. **Mobile Experience** (TC-14.1 through TC-14.3)

### Nice to Have
12. **Edge Cases & Error Messages** (TC-11.1 through TC-11.5)
13. **Visual Design & Responsiveness** (throughout)

---

## Test Environment Setup

### Prerequisites
- BitPass server running on `http://localhost:3000`
- Fake client site server running on `http://localhost:3001` (optional, for integration testing)
- Lightning wallet installed (Alby extension or mobile wallet app)
- Browser with developer tools enabled
- Clear browser cookies and local storage before each test run

### Test Data
- **Test Wallet:** Use a development/test Lightning wallet (not production funds)
- **Test Domains:** Use `localhost`, `127.0.0.1`, or `test.example.com` for domain testing
- **Test Site ID:** Will be generated automatically during account creation

---

## Test Suite 1: Landing Page & Discovery

### TC-1.1: Landing Page Load
**Objective:** Verify landing page displays correctly and all elements are functional.

**Steps:**
1. Navigate to `http://localhost:3000`
2. Verify page loads without errors
3. Check all visual elements render correctly

**Expected Results:**
- ✅ Page loads successfully
- ✅ BitPass logo displays in navigation
- ✅ Hero section with "₿itPass" heading visible
- ✅ "Get Started" button visible and clickable
- ✅ Navigation links functional (How It Works, Why BitPass, Requirements, Documentation, FAQ, Support, etc.)
- ✅ Sign-in button visible in top-right (if not logged in)
- ✅ Footer displays correctly
- ✅ No console errors

**Validation:**
- Check browser console for errors
- Verify responsive design on mobile/tablet/desktop
- Test all navigation links

---

### TC-1.2: Get Started Button
**Objective:** Verify "Get Started" button opens onboarding wizard.

**Steps:**
1. Navigate to landing page
2. Click "Get Started" button in hero section
3. Verify wizard opens

**Expected Results:**
- ✅ Onboarding wizard modal opens
- ✅ Wizard displays Step 1 (Introduction)
- ✅ Close button (X) visible and functional
- ✅ Wizard can be closed and reopened

**Validation:**
- Click close button - wizard should close
- Click "Get Started" again - wizard should reopen
- Verify wizard state persists if page is refreshed while open

---

### ✅ TC-1.3: Navigation Links (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies all public pages are accessible.

**Automated Verification:**
- ✅ All public pages return HTTP 200
- ✅ Pages contain expected content

### ⚠️ TC-1.3: Navigation Links UI (MANUAL - REQUIRED)
**Objective:** Verify all public navigation links work correctly in the UI.

**Steps:**
1. Navigate to landing page
2. Click each navigation link:
   - How It Works
   - Why BitPass
   - Requirements
   - Documentation
   - FAQ
   - Support
   - Wallet Partnerships
   - Open Source
3. Verify each page loads correctly

**Expected Results:**
- ✅ All navigation links navigate to correct pages
- ✅ Each page loads without errors
- ✅ Content displays correctly
- ✅ Back navigation works
- ✅ Active page highlighted in navigation

**Validation:**
- Test on desktop and mobile navigation
- Verify sticky navigation works on scroll
- Check mobile hamburger menu (if applicable)

---

### TC-1.4: Sign-In Button (Unauthenticated)
**Objective:** Verify sign-in button behavior for new users.

**Steps:**
1. Navigate to landing page (ensure not logged in)
2. Click sign-in button in top-right navigation
3. Verify authentication flow initiates

**Expected Results:**
- ✅ Sign-in button visible and clickable
- ✅ Clicking button initiates Lightning wallet authentication
- ✅ If WebLN available: Wallet prompt appears
- ✅ If no WebLN: QR code page opens
- ✅ User can authenticate with wallet

**Validation:**
- Test with WebLN extension (Alby)
- Test without WebLN (QR code flow)
- Verify authentication redirects correctly

---

## Test Suite 2: Onboarding Wizard

### ✅ TC-2.2: LNURL Challenge Generation (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies LNURL endpoint works correctly.

**Automated Verification:**
- ✅ `/api/auth/lnurl` returns valid k1 and lnurl
- ✅ Response structure is correct

### ⚠️ TC-2.1: Wizard Step 1 - Introduction (MANUAL - REQUIRED)
**Objective:** Verify Step 1 displays correctly and navigation works.

**Steps:**
1. Open onboarding wizard (click "Get Started")
2. Verify Step 1 content displays
3. Check "Continue" button

**Expected Results:**
- ✅ Step 1 displays: "Welcome to ₿itPass"
- ✅ Introduction text visible
- ✅ "Continue" button visible
- ✅ Step indicator shows "Step 1 of 4"
- ✅ Close button (X) works

**Validation:**
- Verify step cannot be skipped without authentication
- Test closing and reopening wizard

---

### ⚠️ TC-2.2: Wizard Step 2 - Wallet Connection (WebLN) (MANUAL - REQUIRED)
**Objective:** Verify wallet connection via WebLN extension.

**Steps:**
1. Complete Step 1, click "Continue"
2. Verify Step 2 displays
3. Click "Connect Wallet" button
4. Approve connection in wallet extension (Alby)

**Expected Results:**
- ✅ Step 2 displays: "Connect Your Lightning Wallet"
- ✅ "Connect Wallet" button visible
- ✅ Wallet extension prompt appears
- ✅ After approval, wallet connects successfully
- ✅ Wallet connection status updates
- ✅ "Continue" button becomes enabled
- ✅ Automatically advances to Step 3

**Validation:**
- Test with Alby extension
- Verify wallet connection persists
- Test rejection of wallet connection
- Verify error handling if wallet unavailable

---

### ⚠️ TC-2.3: Wizard Step 2 - Wallet Connection (QR Code) (MANUAL - REQUIRED)
**Objective:** Verify wallet connection via QR code fallback.

**Steps:**
1. Disable WebLN extension or use browser without WebLN
2. Complete Step 1, click "Continue"
3. Click "Connect Wallet" button
4. Verify QR code page opens
5. Scan QR code with mobile wallet
6. Approve authentication in wallet

**Expected Results:**
- ✅ QR code page opens (`/embed/qr`)
- ✅ QR code displays clearly
- ✅ LNURL string visible for manual entry
- ✅ Instructions for scanning displayed
- ✅ After wallet approval, redirects back
- ✅ Wallet connection confirmed
- ✅ Advances to Step 3

**Validation:**
- Test QR code scanning with mobile wallet
- Test manual LNURL entry
- Verify timeout handling (5 minutes)
- Test cancellation flow

---

### ✅ TC-2.4: Domain Validation API (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies domain validation logic.

**Automated Verification:**
- ✅ Domain API requires authentication
- ✅ Invalid domain formats are rejected

### ⚠️ TC-2.4: Wizard Step 3 - Domain Entry UI (MANUAL - REQUIRED)
**Objective:** Verify domain entry and validation in the UI.

**Steps:**
1. Complete wallet connection (Step 2)
2. Verify Step 3 displays
3. Enter a valid domain (e.g., `example.com`)
4. Click "Continue"
5. Test invalid domain formats
6. Test multiple domains

**Expected Results:**
- ✅ Step 3 displays: "Add Your Domain"
- ✅ Domain input field visible
- ✅ Placeholder text shows example format
- ✅ Valid domain accepted (e.g., `example.com`, `login.yoursite.com`)
- ✅ Invalid formats rejected with error message:
  - ❌ `http://example.com` (protocol not allowed)
  - ❌ `example.com/path` (path not allowed)
  - ❌ `example.com:8080` (port not allowed)
  - ❌ Empty domain
- ✅ Test domains automatically recognized (`localhost`, `127.0.0.1`, `test.*`, `staging.*`, `dev.*`)
- ✅ Multiple domains can be added
- ✅ "Continue" button enabled after valid domain entry

**Validation:**
- Test all domain validation rules
- Verify test domain recognition
- Test adding/removing multiple domains
- Check error messages are clear

---

### TC-2.5: Wizard Step 4 - Disclaimer Acceptance
**Objective:** Verify disclaimer display and acceptance.

**Steps:**
1. Complete domain entry (Step 3)
2. Verify Step 4 displays
3. Read disclaimer content
4. Click "I Accept" button
5. Verify account creation

**Expected Results:**
- ✅ Step 4 displays: "Accept Disclaimer"
- ✅ Disclaimer text visible and scrollable
- ✅ "I Accept" button visible
- ✅ Button disabled until user scrolls to bottom (if required)
- ✅ After acceptance, account created successfully
- ✅ User redirected to dashboard
- ✅ `freeDisclaimerAccepted` flag set to `true`

**Validation:**
- Verify disclaimer content is complete
- Test acceptance without scrolling (if required)
- Verify redirect to dashboard
- Check user record in storage

---

### TC-2.6: Wizard Completion - Dashboard Access
**Objective:** Verify successful wizard completion grants dashboard access.

**Steps:**
1. Complete all 4 wizard steps
2. Verify redirect to dashboard
3. Check dashboard loads correctly

**Expected Results:**
- ✅ Redirects to `/dashboard`
- ✅ Dashboard loads without errors
- ✅ User data displays correctly
- ✅ All dashboard tabs accessible
- ✅ Integration code visible
- ✅ Domain(s) displayed in Domains tab
- ✅ No redirect back to wizard

**Validation:**
- Verify `freeDisclaimerAccepted` is `true`
- Check user session cookie is set
- Verify dashboard tabs are functional
- Test navigation between tabs

---

### TC-2.7: Wizard Incomplete - Dashboard Blocked
**Objective:** Verify incomplete wizard blocks dashboard access.

**Steps:**
1. Connect wallet (complete Step 2)
2. Manually navigate to `/dashboard` (bypass Step 3 and 4)
3. Verify redirect behavior

**Expected Results:**
- ✅ Attempting to access dashboard redirects to `/?wizard=true`
- ✅ Wizard reopens at appropriate step
- ✅ User cannot access dashboard until wizard complete
- ✅ Middleware protection active

**Validation:**
- Test direct URL access to `/dashboard`
- Verify middleware redirects correctly
- Check `freeDisclaimerAccepted` is `false`
- Verify wizard resumes at correct step

---

## Test Suite 3: Dashboard Navigation

### ✅ TC-3.1: Dashboard Route Protection (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies dashboard requires authentication.

**Automated Verification:**
- ✅ Dashboard route is protected
- ✅ Unauthenticated access is blocked/redirected

### ✅ TC-3.1: User API Requires Authentication (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies `/api/user` requires authentication.

**Automated Verification:**
- ✅ `/api/user` returns 401 without authentication
- ✅ Authentication is enforced

### ⚠️ TC-3.1: Dashboard Load (Authenticated User) (MANUAL - REQUIRED)
**Objective:** Verify dashboard loads correctly for authenticated users.

**Steps:**
1. Complete onboarding wizard
2. Verify dashboard loads
3. Check all dashboard elements

**Expected Results:**
- ✅ Dashboard header displays: "Dashboard"
- ✅ Subtitle: "Manage your ₿itPass integration"
- ✅ Tab navigation visible (desktop and mobile)
- ✅ Default tab (Overview) displays
- ✅ User account information visible
- ✅ No console errors

**Validation:**
- Test on desktop and mobile
- Verify responsive design
- Check tab navigation works
- Verify user data loads correctly

---

### TC-3.2: Dashboard Tab Navigation
**Objective:** Verify all dashboard tabs are accessible and functional.

**Steps:**
1. Navigate to dashboard
2. Click each tab:
   - Overview
   - My Integration Code
   - Domains
   - Analytics
   - Documentation
   - Troubleshooting
   - Settings
3. Verify content for each tab

**Expected Results:**
- ✅ All 7 tabs visible and clickable
- ✅ Active tab highlighted
- ✅ Tab content switches correctly
- ✅ No page reload on tab switch
- ✅ Mobile menu works (hamburger menu)
- ✅ Tab state persists on refresh

**Validation:**
- Test desktop tab navigation
- Test mobile tab navigation
- Verify tab content loads correctly
- Check active tab indicator

---

### TC-3.3: Dashboard Overview Tab
**Objective:** Verify Overview tab displays correct information.

**Steps:**
1. Navigate to dashboard
2. Click "Overview" tab
3. Verify all sections display

**Expected Results:**
- ✅ Account Information box displays:
  - User xpub (truncated)
  - Site ID
  - Copy buttons functional
- ✅ Getting Started guide visible
- ✅ Integration Status visible
- ✅ Quick Actions section visible
- ✅ All links and buttons functional

**Validation:**
- Verify xpub and Site ID are correct
- Test copy buttons
- Check all links navigate correctly
- Verify integration status reflects current state

---

## Test Suite 4: Integration Code Setup

### ✅ TC-4.1: Embed Config API (AUTOMATED - PASSING)
**Status:** ✅ Automated tests verify embed config API works correctly.

**Automated Verification:**
- ✅ Config API handles invalid siteId correctly
- ✅ Config API handles missing siteId correctly
- ✅ Embed script route returns valid script

### ⚠️ TC-4.1: Integration Code Display (MANUAL - REQUIRED)
**Objective:** Verify integration code is displayed correctly.

**Steps:**
1. Navigate to dashboard
2. Click "My Integration Code" tab
3. Verify integration code displays

**Expected Results:**
- ✅ Integration Status toggle visible
- ✅ "How to Add BitPass to Your Website" section visible
- ✅ Integration code displayed in code block
- ✅ Code includes correct `siteId`
- ✅ Copy button functional
- ✅ Live Preview section displays button

**Validation:**
- Verify `siteId` in code matches user's Site ID
- Test copy button copies code correctly
- Verify live preview matches actual button
- Check code formatting is correct

---

### TC-4.2: Integration Code Copy
**Objective:** Verify integration code can be copied successfully.

**Steps:**
1. Navigate to "My Integration Code" tab
2. Click "Copy" button
3. Paste code into text editor
4. Verify code is correct

**Expected Results:**
- ✅ Copy button shows success feedback
- ✅ Code copied to clipboard correctly
- ✅ Code format is valid HTML/JavaScript
- ✅ Code includes correct embed script URL
- ✅ Code includes correct `siteId` parameter

**Validation:**
- Test copy functionality
- Verify clipboard content
- Check code syntax is valid
- Verify `siteId` matches user account

---

### TC-4.3: Integration Status Toggle
**Objective:** Verify integration toggle enables/disables authentication.

**Steps:**
1. Navigate to "My Integration Code" tab
2. Toggle "Integration Status" to OFF
3. Test authentication on client site
4. Toggle back to ON
5. Test authentication again

**Expected Results:**
- ✅ Toggle switches between ON/OFF
- ✅ When OFF: Authentication disabled message appears
- ✅ When OFF: Client site shows "authentication is currently disabled"
- ✅ When ON: Authentication works normally
- ✅ Toggle state persists

**Validation:**
- Test toggle functionality
- Verify API returns correct status
- Test authentication with toggle OFF
- Test authentication with toggle ON
- Check toggle state in user record

---

### TC-4.4: Live Preview
**Objective:** Verify live preview displays correctly.

**Steps:**
1. Navigate to "My Integration Code" tab
2. Scroll to "Live Preview" section
3. Verify preview displays

**Expected Results:**
- ✅ BitPass button displays in preview
- ✅ Button matches actual embed button
- ✅ Featured wallets section visible (if configured)
- ✅ Footer text displays (if configured)
- ✅ Preview is interactive (can click button)

**Validation:**
- Compare preview to actual embed
- Test button click in preview
- Verify styling matches
- Check featured wallets display

---

## Test Suite 5: Domain Management

### ✅ TC-5.2: Add Domain API - Requires Authentication (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies domain API requires authentication.

**Automated Verification:**
- ✅ Domain API returns 401 without authentication
- ✅ Invalid domain formats are rejected

### ✅ TC-5.5: Domain Validation - Invalid Formats (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies domain validation logic.

**Automated Verification:**
- ✅ Invalid domain formats are rejected
- ✅ Validation rules are enforced

### ⚠️ TC-5.1: Domain Display (MANUAL - REQUIRED)
**Objective:** Verify domains are displayed correctly in Domains tab.

**Steps:**
1. Navigate to dashboard
2. Click "Domains" tab
3. Verify domain list displays

**Expected Results:**
- ✅ "Your Domains" section visible at top
- ✅ All added domains listed
- ✅ Test domains marked with "TEST DOMAIN" badge
- ✅ Domain format displayed correctly
- ✅ Edit and Remove buttons visible (if applicable)

**Validation:**
- Verify domains from wizard are displayed
- Check test domain badges
- Verify domain formatting
- Test with multiple domains

---

### TC-5.2: Add New Domain
**Objective:** Verify new domains can be added.

**Steps:**
1. Navigate to "Domains" tab
2. Enter new domain in input field (e.g., `newdomain.com`)
3. Click "Add Domain" button
4. Verify domain added

**Expected Results:**
- ✅ Domain input field visible
- ✅ Valid domain accepted
- ✅ Domain added to list
- ✅ Success message displayed
- ✅ Domain appears in list immediately
- ✅ Domain saved to user record

**Validation:**
- Test adding valid domains
- Test domain validation (reject invalid formats)
- Verify domain persists after refresh
- Check API response

---

### TC-5.3: Edit Domain
**Objective:** Verify existing domains can be edited.

**Steps:**
1. Navigate to "Domains" tab
2. Click "Edit" button on a domain
3. Modify domain value
4. Click "Save"
5. Verify domain updated

**Expected Results:**
- ✅ Edit mode activates
- ✅ Domain value editable in input field
- ✅ "Save" and "Cancel" buttons visible
- ✅ After save, domain updated in list
- ✅ Success message displayed
- ✅ Old domain removed, new domain added

**Validation:**
- Test editing to valid domain
- Test editing to invalid domain (should fail)
- Test cancel button
- Verify domain update persists

---

### TC-5.4: Remove Domain
**Objective:** Verify domains can be removed.

**Steps:**
1. Navigate to "Domains" tab
2. Ensure at least 2 domains exist
3. Click "Remove" button on a domain
4. Verify domain removed

**Expected Results:**
- ✅ "Remove" button visible (if multiple domains)
- ✅ Remove button disabled if only one domain
- ✅ After removal, domain disappears from list
- ✅ Success message displayed
- ✅ Domain removed from user record

**Validation:**
- Test removing domain
- Verify cannot remove last domain
- Check domain removal persists
- Verify API updates correctly

---

### TC-5.5: Domain Validation
**Objective:** Verify domain validation rules work correctly.

**Steps:**
1. Navigate to "Domains" tab
2. Test various domain formats:
   - Valid: `example.com`, `login.yoursite.com`, `subdomain.example.com`
   - Invalid: `http://example.com`, `example.com/path`, `example.com:8080`
3. Verify validation messages

**Expected Results:**
- ✅ Valid formats accepted
- ✅ Invalid formats rejected with clear error message
- ✅ Error message explains what's wrong
- ✅ Test domains automatically recognized
- ✅ Duplicate domains rejected

**Validation:**
- Test all validation rules
- Verify error messages are helpful
- Check test domain recognition
- Test duplicate prevention

---

### TC-5.6: Test Domain Recognition
**Objective:** Verify test domains are automatically recognized.

**Steps:**
1. Navigate to "Domains" tab
2. Add test domains:
   - `localhost`
   - `127.0.0.1`
   - `test.example.com`
   - `staging.example.com`
   - `dev.example.com`
3. Verify test domain badges

**Expected Results:**
- ✅ Test domains accepted without error
- ✅ Test domains marked with yellow "TEST DOMAIN" badge
- ✅ Test domains appear in "Correct Format Examples" section
- ✅ Test domains work for authentication

**Validation:**
- Verify all test domain patterns recognized
- Check badge styling
- Test authentication with test domains
- Verify test domains in examples section

---

## Test Suite 6: Integration Testing (Fake Client Site)

### ✅ TC-6.1: Embed Script Loads (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies embed script loads correctly.

**Automated Verification:**
- ✅ Embed script returns valid JavaScript
- ✅ Script contains required elements (BitPass.init, siteId)

### ✅ TC-6.5: Domain Authorization - CORS Validation (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies CORS protection.

**Automated Verification:**
- ✅ CORS wildcard is not allowed
- ✅ Invalid origins are rejected

### ✅ TC-6.6: Integration Toggle - Config API (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies integration toggle in config.

**Automated Verification:**
- ✅ Config API returns `integrationEnabled` field
- ✅ Field is boolean type

### ⚠️ TC-6.1: Embed Script Load (MANUAL - REQUIRED)
**Objective:** Verify embed script loads correctly on client site.

**Steps:**
1. Copy integration code from dashboard
2. Create test HTML page with embed code
3. Load page in browser
4. Verify script loads

**Expected Results:**
- ✅ Embed script loads without errors
- ✅ BitPass button appears on page
- ✅ Button is clickable
- ✅ No console errors
- ✅ Configuration fetched successfully

**Validation:**
- Check browser console for errors
- Verify script loads from correct URL
- Test with valid `siteId`
- Test with invalid `siteId` (should show error)

---

### TC-6.2: Authentication Flow (WebLN)
**Objective:** Verify authentication works via WebLN on client site.

**Steps:**
1. Load client site with embed code
2. Click BitPass button
3. Approve authentication in wallet (Alby)
4. Verify authentication success

**Expected Results:**
- ✅ Button click triggers authentication
- ✅ Wallet extension prompt appears
- ✅ After approval, authentication succeeds
- ✅ `onSuccess` callback fires with xpub
- ✅ Success message/redirect occurs
- ✅ xpub received correctly

**Validation:**
- Test with Alby extension
- Verify xpub format is correct
- Check callback execution
- Test error handling

---

### TC-6.3: Authentication Flow (QR Code - Desktop)
**Objective:** Verify QR code authentication works on desktop.

**Steps:**
1. Load client site without WebLN
2. Click BitPass button
3. Verify QR code popup opens
4. Scan QR code with mobile wallet
5. Approve authentication
6. Verify success

**Expected Results:**
- ✅ QR code popup opens
- ✅ QR code displays clearly
- ✅ LNURL string visible
- ✅ After scanning and approval, popup closes
- ✅ Authentication succeeds
- ✅ xpub received via callback

**Validation:**
- Test QR code scanning
- Verify popup closes after auth
- Check callback receives xpub
- Test timeout handling

---

### TC-6.4: Authentication Flow (QR Code - Mobile)
**Objective:** Verify QR code redirect flow works on mobile.

**Steps:**
1. Load client site on mobile device
2. Click BitPass button
3. Verify redirect to QR code page
4. Scan QR code with wallet app
5. Approve authentication
6. Verify redirect back to client site

**Expected Results:**
- ✅ Redirects to `/embed/qr` page
- ✅ QR code displays on mobile
- ✅ After approval, redirects back to client site
- ✅ xpub appended to return URL (`?xpub=...`)
- ✅ Client site receives xpub

**Validation:**
- Test on mobile device
- Verify redirect URL includes xpub
- Check return URL is correct
- Test timeout and cancellation

---

### TC-6.5: Domain Authorization
**Objective:** Verify domain authorization works correctly.

**Steps:**
1. Add domain `example.com` to dashboard
2. Load embed script on `example.com`
3. Test authentication (should work)
4. Load embed script on `unauthorized.com`
5. Test authentication (should fail)

**Expected Results:**
- ✅ Authentication works on authorized domain
- ✅ Authentication fails on unauthorized domain
- ✅ Error message: "This domain is not authorized — add it in your dashboard"
- ✅ Error message is clear and actionable

**Validation:**
- Test with authorized domain
- Test with unauthorized domain
- Verify error messages
- Test with test domains (should work automatically)

---

### TC-6.6: Integration Toggle Impact
**Objective:** Verify integration toggle affects client site authentication.

**Steps:**
1. Set integration toggle to ON
2. Test authentication on client site (should work)
3. Set integration toggle to OFF
4. Test authentication on client site (should fail)
5. Set toggle back to ON

**Expected Results:**
- ✅ When ON: Authentication works normally
- ✅ When OFF: Authentication disabled message appears
- ✅ Error message: "₿itPass authentication is currently disabled"
- ✅ Toggle change takes effect immediately

**Validation:**
- Test toggle ON state
- Test toggle OFF state
- Verify error message
- Check API returns correct status

---

## Test Suite 7: Analytics & Usage

### ✅ TC-7.1: Usage API Requires Authentication (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies usage API requires authentication.

**Automated Verification:**
- ✅ `/api/usage` returns 401 without authentication
- ✅ Authentication is enforced

### ⚠️ TC-7.1: Analytics Tab Display (MANUAL - REQUIRED)
**Objective:** Verify Analytics tab displays correctly.

**Steps:**
1. Navigate to dashboard
2. Click "Analytics" tab
3. Verify analytics data displays

**Expected Results:**
- ✅ Analytics tab loads without errors
- ✅ Usage statistics visible:
  - This Month
  - All Time
- ✅ Charts/graphs display (if implemented)
- ✅ Login data visible
- ✅ Wallet breakdown visible
- ✅ Browser/device breakdown visible

**Validation:**
- Verify data loads correctly
- Check calculations are accurate
- Test with no data (new account)
- Test with multiple logins

---

### TC-7.2: Usage Statistics
**Objective:** Verify usage statistics are accurate.

**Steps:**
1. Perform multiple authentications on client site
2. Navigate to Analytics tab
3. Verify statistics update

**Expected Results:**
- ✅ Login count increments correctly
- ✅ Monthly statistics accurate
- ✅ All-time statistics accurate
- ✅ Statistics update in real-time (or after refresh)
- ✅ Data persists across sessions

**Validation:**
- Perform test logins
- Verify counts match
- Check monthly reset (if applicable)
- Test with multiple wallets

---

### TC-7.3: Analytics Data Breakdown
**Objective:** Verify analytics breakdowns display correctly.

**Steps:**
1. Perform authentications with different wallets/browsers
2. Navigate to Analytics tab
3. Check breakdown sections

**Expected Results:**
- ✅ Wallet breakdown shows different wallets
- ✅ Browser breakdown shows different browsers
- ✅ Device breakdown shows different devices
- ✅ Data is accurate and up-to-date

**Validation:**
- Test with multiple wallets
- Test with different browsers
- Test on mobile and desktop
- Verify data accuracy

---

## Test Suite 8: Documentation & Troubleshooting

### ✅ TC-8.1: Documentation Page Loads (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies documentation page is accessible.

**Automated Verification:**
- ✅ `/docs` page loads successfully
- ✅ Page contains expected content

### ⚠️ TC-8.1: Documentation Tab (MANUAL - REQUIRED)
**Objective:** Verify Documentation tab is accessible and complete.

**Steps:**
1. Navigate to dashboard
2. Click "Documentation" tab
3. Verify all sections display

**Expected Results:**
- ✅ Documentation tab loads
- ✅ All sections visible:
  - Quick Start Guide
  - Integration Checklist
  - Integration Guide
  - Framework Examples
  - Backend Integration
  - Authentication Flow
  - API Reference
  - Configuration
  - Best Practices
  - Testing & Debugging
  - Error Handling
  - FAQ
- ✅ Code examples are accurate
- ✅ Links work correctly

**Validation:**
- Verify all sections present
- Check code examples match actual implementation
- Test all links
- Verify content is up-to-date

---

### TC-8.2: Troubleshooting Tab
**Objective:** Verify Troubleshooting tab provides helpful information.

**Steps:**
1. Navigate to dashboard
2. Click "Troubleshooting" tab
3. Verify troubleshooting content

**Expected Results:**
- ✅ Troubleshooting tab loads
- ✅ Common issues listed
- ✅ Solutions provided
- ✅ Integration Checker tool visible
- ✅ Debug commands provided
- ✅ Links to support/resources

**Validation:**
- Verify content is helpful
- Test Integration Checker
- Check debug commands are accurate
- Verify links work

---

### TC-8.3: Integration Checker
**Objective:** Verify Integration Checker tool works correctly.

**Steps:**
1. Navigate to "Troubleshooting" tab
2. Find Integration Checker section
3. Run integration check
4. Verify results

**Expected Results:**
- ✅ Integration Checker tool visible
- ✅ Can run diagnostics
- ✅ Results display clearly
- ✅ Issues identified (if any)
- ✅ Recommendations provided

**Validation:**
- Test with valid integration
- Test with invalid integration
- Verify diagnostics are accurate
- Check recommendations are helpful

---

## Test Suite 9: Settings

### ✅ TC-9.1: Settings Access Requires Authentication (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies settings require authentication.

**Automated Verification:**
- ✅ Settings (dashboard) route is protected
- ✅ Unauthenticated access is blocked

### ⚠️ TC-9.1: Settings Tab Display (MANUAL - REQUIRED)
**Objective:** Verify Settings tab displays correctly.

**Steps:**
1. Navigate to dashboard
2. Click "Settings" tab
3. Verify all settings sections

**Expected Results:**
- ✅ Settings tab loads
- ✅ Account Information section visible
- ✅ All user data displays correctly
- ✅ Copy buttons functional
- ✅ Account actions visible (if any)

**Validation:**
- Verify all sections present
- Check data accuracy
- Test copy functionality
- Verify settings persist

---

### TC-9.2: Account Information
**Objective:** Verify account information displays and can be copied.

**Steps:**
1. Navigate to "Settings" tab
2. Verify account information displays
3. Test copy buttons

**Expected Results:**
- ✅ xpub displays (truncated for readability)
- ✅ Full xpub accessible via copy button
- ✅ Site ID displays
- ✅ Site ID can be copied
- ✅ Copy buttons show success feedback

**Validation:**
- Verify xpub matches user's wallet
- Test copy functionality
- Check Site ID is correct
- Verify copy feedback

---

## Test Suite 10: Returning User Flows

### ✅ TC-10.3: Session Cookie Security (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies cookie security flags.

**Automated Verification:**
- ✅ Cookies have HttpOnly flag (XSS protection)
- ✅ Cookies have SameSite flag (CSRF protection)

### ⚠️ TC-10.1: Returning User - Sign In Button (MANUAL - REQUIRED)
**Objective:** Verify returning users can sign in via top-right button.

**Steps:**
1. Complete onboarding wizard (create account)
2. Sign out (clear cookies)
3. Navigate to landing page
4. Click sign-in button
5. Authenticate with wallet
6. Verify redirect to dashboard

**Expected Results:**
- ✅ Sign-in button visible
- ✅ Authentication works
- ✅ After authentication, redirects to dashboard
- ✅ Dashboard loads correctly
- ✅ No wizard prompt (user already completed)

**Validation:**
- Test with completed account
- Verify redirect to dashboard
- Check wizard doesn't reopen
- Verify user data loads

---

### TC-10.2: Returning User - Wizard Re-entry
**Objective:** Verify returning users can re-enter wizard if needed.

**Steps:**
1. Complete onboarding wizard
2. Navigate to `/?wizard=true`
3. Verify wizard behavior

**Expected Results:**
- ✅ Wizard opens
- ✅ Recognizes user is authenticated
- ✅ Skips to appropriate step (domain entry or disclaimer)
- ✅ Can complete wizard again
- ✅ Redirects to dashboard after completion

**Validation:**
- Test wizard re-entry
- Verify step detection
- Check completion flow
- Verify redirect

---

### TC-10.3: Session Persistence
**Objective:** Verify user session persists across page refreshes.

**Steps:**
1. Complete onboarding wizard
2. Access dashboard
3. Refresh page
4. Verify session persists

**Expected Results:**
- ✅ Session cookie set correctly
- ✅ Dashboard accessible after refresh
- ✅ User data loads correctly
- ✅ No re-authentication required
- ✅ Session persists for 1 year

**Validation:**
- Test page refresh
- Test browser close/reopen
- Verify cookie expiration
- Check session security

---

## Test Suite 11: Error Handling & Edge Cases

### ✅ TC-11.1: Invalid Site ID Handling (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies invalid siteId handling.

**Automated Verification:**
- ✅ Invalid siteId returns appropriate response (404 or default config in dev)
- ✅ Error handling works correctly

### ✅ TC-11.2: Network Error Handling - Invalid Endpoint (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies error handling for invalid endpoints.

**Automated Verification:**
- ✅ Invalid endpoints return 404/405 (not 500)
- ✅ Server handles errors gracefully

### ✅ TC-11.4: Expired Challenge Handling (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies expired challenge handling.

**Automated Verification:**
- ✅ Expired challenges don't cause server errors
- ✅ Error handling works correctly

### ⚠️ TC-11.1: Invalid Site ID (MANUAL - REQUIRED)
**Objective:** Verify error handling for invalid site ID.

**Steps:**
1. Use embed script with invalid `siteId`
2. Verify error handling

**Expected Results:**
- ✅ Error message displays: "Invalid siteId"
- ✅ Error message is clear
- ✅ No console errors
- ✅ User can identify the issue

**Validation:**
- Test with invalid site ID
- Test with missing site ID
- Verify error messages
- Check error handling

---

### TC-11.2: Network Errors
**Objective:** Verify error handling for network failures.

**Steps:**
1. Disable network connection
2. Attempt authentication
3. Verify error handling

**Expected Results:**
- ✅ Network error detected
- ✅ Error message displayed
- ✅ User can retry
- ✅ No application crash

**Validation:**
- Test network failure scenarios
- Verify error messages
- Check retry functionality
- Test recovery

---

### TC-11.3: Wallet Rejection
**Objective:** Verify handling when user rejects wallet authentication.

**Steps:**
1. Initiate authentication
2. Reject in wallet
3. Verify error handling

**Expected Results:**
- ✅ Rejection detected
- ✅ Error message displayed
- ✅ User can retry
- ✅ No application crash

**Validation:**
- Test wallet rejection
- Verify error messages
- Check retry flow
- Test user experience

---

### TC-11.4: Expired Challenge
**Objective:** Verify handling of expired authentication challenges.

**Steps:**
1. Generate authentication challenge
2. Wait 5+ minutes
3. Attempt authentication
4. Verify error handling

**Expected Results:**
- ✅ Expired challenge detected
- ✅ Error message displayed
- ✅ New challenge generated
- ✅ User can retry

**Validation:**
- Test challenge expiration
- Verify timeout handling
- Check error messages
- Test retry flow

---

### TC-11.5: Concurrent Authentication
**Objective:** Verify handling of concurrent authentication attempts.

**Steps:**
1. Initiate multiple authentication attempts simultaneously
2. Verify handling

**Expected Results:**
- ✅ Only one authentication succeeds
- ✅ Others are handled gracefully
- ✅ No race conditions
- ✅ User experience remains smooth

**Validation:**
- Test concurrent requests
- Verify no conflicts
- Check error handling
- Test user experience

---

## Test Suite 12: Security & Access Control

### ✅ TC-12.1: Dashboard Middleware Protection (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies dashboard middleware protection.

**Automated Verification:**
- ✅ Dashboard route is protected
- ✅ Unauthenticated access is blocked/redirected

### ✅ TC-12.3: CORS Protection - Invalid Origin (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies CORS protection.

**Automated Verification:**
- ✅ Invalid origins are not allowed
- ✅ CORS wildcard is not used

### ✅ TC-12.4: Cookie Security Flags (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies cookie security.

**Automated Verification:**
- ✅ Cookies have HttpOnly flag
- ✅ Cookies have SameSite flag

### ✅ TC-12.4: Verify API Origin Requirement (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies verify API origin validation.

**Automated Verification:**
- ✅ Verify API requires origin
- ✅ Origin validation is enforced

### ⚠️ TC-12.1: Unauthenticated Dashboard Access (MANUAL - REQUIRED)
**Objective:** Verify dashboard is protected from unauthenticated access.

**Steps:**
1. Clear all cookies
2. Navigate directly to `/dashboard`
3. Verify protection

**Expected Results:**
- ✅ Middleware intercepts request
- ✅ Redirects to `/?wizard=true`
- ✅ Cannot access dashboard
- ✅ Wizard opens for authentication

**Validation:**
- Test direct URL access
- Verify middleware protection
- Check redirect behavior
- Test with no cookies

---

### TC-12.2: Incomplete Wizard - Dashboard Blocked
**Objective:** Verify incomplete wizard blocks dashboard access.

**Steps:**
1. Connect wallet (complete Step 2)
2. Manually navigate to `/dashboard`
3. Verify blocking

**Expected Results:**
- ✅ Dashboard access blocked
- ✅ Redirects to wizard
- ✅ Wizard resumes at correct step
- ✅ Cannot bypass wizard

**Validation:**
- Test incomplete wizard state
- Verify redirect
- Check wizard step detection
- Test bypass attempts

---

### TC-12.3: CORS Protection
**Objective:** Verify CORS protection works correctly.

**Steps:**
1. Attempt API call from unauthorized domain
2. Verify CORS rejection

**Expected Results:**
- ✅ Unauthorized domains rejected
- ✅ CORS error returned
- ✅ Only authorized domains allowed
- ✅ Error message is clear

**Validation:**
- Test from unauthorized domain
- Test from authorized domain
- Verify CORS headers
- Check error responses

---

### TC-12.4: Cookie Security
**Objective:** Verify cookies are set with proper security flags.

**Steps:**
1. Complete authentication
2. Inspect cookies in browser
3. Verify security flags

**Expected Results:**
- ✅ `user_xpub` cookie set with:
  - `httpOnly: true`
  - `secure: true` (in production)
  - `sameSite: 'lax'`
- ✅ `auth_challenge` cookie set with:
  - `httpOnly: true`
  - `secure: true` (in production)
  - `sameSite: 'lax'`
  - `maxAge: 300` (5 minutes)

**Validation:**
- Inspect cookie flags
- Verify httpOnly prevents XSS
- Check secure flag in production
- Verify sameSite prevents CSRF

---

## Test Suite 13: Public Pages

### ✅ TC-13.1: Public Documentation Accessible (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies public documentation is accessible.

**Automated Verification:**
- ✅ `/docs` page loads successfully

### ✅ TC-13.2: FAQ Page Accessible (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies FAQ page is accessible.

**Automated Verification:**
- ✅ `/faq` page loads successfully
- ✅ Page contains expected content

### ✅ TC-13.3: Support Page Accessible (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies support page is accessible.

**Automated Verification:**
- ✅ `/support` page loads successfully
- ✅ Page contains expected content

### ⚠️ TC-13.1: Public Documentation Page (MANUAL - REQUIRED)
**Objective:** Verify public documentation page is accessible.

**Steps:**
1. Navigate to `/docs` (without authentication)
2. Verify page loads
3. Check all sections

**Expected Results:**
- ✅ Page loads without authentication
- ✅ All documentation sections visible
- ✅ Navigation sidebar works
- ✅ Code examples display correctly
- ✅ Links functional

**Validation:**
- Test without authentication
- Verify all sections
- Check navigation
- Test links

---

### TC-13.2: FAQ Page
**Objective:** Verify FAQ page is helpful and accurate.

**Steps:**
1. Navigate to `/faq`
2. Verify all FAQs display
3. Check answers are accurate

**Expected Results:**
- ✅ FAQ page loads
- ✅ All questions visible
- ✅ Answers are accurate
- ✅ Links work correctly
- ✅ Content matches current implementation

**Validation:**
- Verify all FAQs present
- Check answer accuracy
- Test links
- Verify content is current

---

### TC-13.3: Support Page
**Objective:** Verify support page and contact form work.

**Steps:**
1. Navigate to `/support`
2. Verify all sections display
3. Test contact form

**Expected Results:**
- ✅ Support page loads
- ✅ All sections visible:
  - Service Availability
  - Support Model
  - Data Retention & Privacy
  - Custom Solutions
  - Contact Form
- ✅ Contact form functional
- ✅ Form submission works

**Validation:**
- Verify all sections
- Test form submission
- Check form validation
- Verify success message

---

## Test Suite 14: Mobile Experience

### TC-14.1: Mobile Landing Page
**Objective:** Verify landing page works on mobile devices.

**Steps:**
1. Load landing page on mobile device
2. Verify responsive design
3. Test all interactions

**Expected Results:**
- ✅ Page displays correctly on mobile
- ✅ Text is readable
- ✅ Buttons are touch-friendly
- ✅ Navigation works
- ✅ No horizontal scrolling

**Validation:**
- Test on various mobile devices
- Verify responsive breakpoints
- Check touch targets
- Test navigation

---

### TC-14.2: Mobile Wizard
**Objective:** Verify onboarding wizard works on mobile.

**Steps:**
1. Open wizard on mobile device
2. Complete all steps
3. Verify functionality

**Expected Results:**
- ✅ Wizard displays correctly
- ✅ All steps accessible
- ✅ QR code scanning works
- ✅ Form inputs work
- ✅ Buttons are touch-friendly

**Validation:**
- Test on mobile device
- Verify QR code flow
- Check form inputs
- Test completion

---

### TC-14.3: Mobile Dashboard
**Objective:** Verify dashboard works on mobile devices.

**Steps:**
1. Access dashboard on mobile
2. Navigate between tabs
3. Verify all functionality

**Expected Results:**
- ✅ Dashboard displays correctly
- ✅ Mobile menu works
- ✅ Tabs accessible
- ✅ All features functional
- ✅ Responsive design works

**Validation:**
- Test on mobile device
- Verify mobile menu
- Check tab navigation
- Test all features

---

## Test Suite 15: Performance & Load

### ✅ TC-15.1: Landing Page Load Time (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies page load performance.

**Automated Verification:**
- ✅ Landing page loads in < 5 seconds
- ✅ Performance meets requirements

### ✅ TC-15.2: API Response Times (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies API response times.

**Automated Verification:**
- ✅ API endpoints respond in < 2 seconds
- ✅ Performance meets requirements

### ⚠️ TC-15.1: Page Load Performance (MANUAL - REQUIRED)
**Objective:** Verify pages load quickly.

**Steps:**
1. Measure page load times
2. Check resource loading
3. Verify performance

**Expected Results:**
- ✅ Landing page loads in < 2 seconds
- ✅ Dashboard loads in < 2 seconds
- ✅ Images optimized
- ✅ No unnecessary requests
- ✅ Good Lighthouse scores

**Validation:**
- Measure load times
- Check network requests
- Verify image optimization
- Run Lighthouse audit

---

### TC-15.2: API Response Times
**Objective:** Verify API endpoints respond quickly.

**Steps:**
1. Test all API endpoints
2. Measure response times
3. Verify performance

**Expected Results:**
- ✅ API responses in < 500ms
- ✅ No timeouts
- ✅ Efficient queries
- ✅ Proper caching

**Validation:**
- Test all endpoints
- Measure response times
- Check for timeouts
- Verify caching

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] BitPass server running on `localhost:3000`
- [ ] Fake client site running on `localhost:3001` (optional)
- [ ] Lightning wallet installed and configured
- [ ] Browser cookies and storage cleared
- [ ] Developer tools open for console monitoring

### Test Execution Order
1. **Landing Page & Discovery** (TC-1.1 through TC-1.4)
2. **Onboarding Wizard** (TC-2.1 through TC-2.7)
3. **Dashboard Navigation** (TC-3.1 through TC-3.3)
4. **Integration Code Setup** (TC-4.1 through TC-4.4)
5. **Domain Management** (TC-5.1 through TC-5.6)
6. **Integration Testing** (TC-6.1 through TC-6.6)
7. **Analytics & Usage** (TC-7.1 through TC-7.3)
8. **Documentation & Troubleshooting** (TC-8.1 through TC-8.3)
9. **Settings** (TC-9.1 through TC-9.2)
10. **Returning User Flows** (TC-10.1 through TC-10.3)
11. **Error Handling** (TC-11.1 through TC-11.5)
12. **Security & Access Control** (TC-12.1 through TC-12.4)
13. **Public Pages** (TC-13.1 through TC-13.3)
14. **Mobile Experience** (TC-14.1 through TC-14.3)
15. **Performance & Load** (TC-15.1 through TC-15.2)

### Test Results Template

For each test case, record:
- **Test Case ID:** (e.g., TC-1.1)
- **Test Date:** 
- **Tester:**
- **Environment:** (Development/Staging/Production)
- **Status:** ✅ Pass / ❌ Fail / ⚠️ Partial
- **Notes:**
- **Screenshots:** (if applicable)
- **Issues Found:** (if any)

---

## Known Limitations & Workarounds

### Development Mode Storage
- **Issue:** In-memory storage resets on server restart
- **Workaround:** Use `/api/create-user` or `/api/restore-user` endpoints to restore user state
- **Impact:** Test data may be lost between test runs

### Test Domains
- **Note:** Test domains (`localhost`, `127.0.0.1`, `test.*`, `staging.*`, `dev.*`) are automatically recognized
- **Impact:** No need to explicitly add test domains for development testing

### WebLN Support
- **Note:** WebLN support varies by wallet
- **Workaround:** Use QR code flow if WebLN unavailable
- **Impact:** Test both WebLN and QR code flows

---

## Success Criteria

### ✅ Automated Tests (Completed)
- ✅ 30/30 automated tests passing
- ✅ All API endpoints functional
- ✅ Security protections verified
- ✅ Error handling verified
- ✅ Performance verified

### Critical Path (Must Test Manually)
- ⚠️ Complete onboarding wizard successfully
- ⚠️ Access dashboard after wizard completion
- ⚠️ Copy and use integration code
- ⚠️ Add and manage domains
- ⚠️ Authenticate on client site successfully
- ⚠️ View analytics data
- ⚠️ Access all dashboard tabs

### Important (Should Test Manually)
- ⚠️ All public pages load correctly (UI verification)
- ⚠️ Error handling works gracefully (UI verification)
- ⚠️ Security protections active (UI verification)
- ⚠️ Mobile experience functional
- ⚠️ Performance acceptable (UI verification)

### Nice to Have (Manual Testing)
- ⚠️ All edge cases handled
- ⚠️ Comprehensive error messages
- ⚠️ Optimal performance
- ⚠️ Perfect mobile experience

---

## Test Reporting

### Daily Test Summary
- Total test cases executed
- Pass/Fail counts
- Critical issues found
- Blockers identified

### Final Test Report
- Executive summary
- Test coverage analysis
- Issues found and severity
- Recommendations
- Sign-off status

---

## Maintenance

### Test Plan Updates
- Update test cases when features change
- Add new test cases for new features
- Remove obsolete test cases
- Update expected results based on implementation changes

### Test Data Management
- Maintain test wallet credentials
- Keep test domains list updated
- Document test user accounts
- Track test data cleanup needs

---

**Document Version:** 1.0  
**Last Updated:** [Current Date]  
**Maintained By:** Development Team

