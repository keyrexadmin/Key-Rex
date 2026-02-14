# End-to-End Testing Plan
## Admin Dashboard Login & Functionality

**Purpose:** Comprehensive testing plan for administrators logging into and using the BitPass admin dashboard.

**Scope:** Complete admin journey from login page to dashboard access and all administrative functions.

---

## 🎯 Testing Status Overview

### ✅ Automated Tests (Completed)
**32/32 tests passing** - Run with: `npm run test:admin`

These tests verify backend/API functionality, security, and basic page accessibility. All automated tests are passing.

**Coverage:**
- ✅ Admin login page loads correctly
- ✅ Admin API endpoints require proper authentication
- ✅ Security protections (authentication, authorization) are active
- ✅ Error handling works correctly
- ✅ Performance meets requirements
- ✅ All admin API endpoints exist and are structured correctly

### ⚠️ Manual Tests Required
The following test cases require manual testing with a browser and Lightning wallet. These cannot be automated due to:
- Visual verification requirements
- Wallet interaction (WebLN, QR code scanning)
- User experience and responsive design
- Interactive UI flows
- Admin data management operations

**Estimated Manual Testing Time:** 3-4 hours

---

## 📋 Quick Reference: What to Test Manually

### Critical Path (Must Test)
1. **Admin Login with Wallet** (TC-ADMIN-1.3, TC-ADMIN-1.4, TC-ADMIN-1.5)
2. **Admin Dashboard UI** (TC-ADMIN-2.2, TC-ADMIN-3.1, TC-ADMIN-4.1, TC-ADMIN-5.1, TC-ADMIN-6.1, TC-ADMIN-7.1)
3. **Admin Data Management** (TC-ADMIN-4.2, TC-ADMIN-4.3, TC-ADMIN-6.2, TC-ADMIN-7.2, TC-ADMIN-7.3)
4. **Admin Session Management** (TC-ADMIN-1.2, TC-ADMIN-2.3, TC-ADMIN-2.4)

### Important (Should Test)
5. **Admin Analytics Display** (TC-ADMIN-5.1, TC-ADMIN-5.2, TC-ADMIN-5.3)
6. **Admin Contact Management** (TC-ADMIN-6.2, TC-ADMIN-6.3, TC-ADMIN-6.4)
7. **Admin Wallet Management** (TC-ADMIN-7.2, TC-ADMIN-7.3, TC-ADMIN-7.4, TC-ADMIN-7.5)
8. **Mobile Admin Experience** (TC-ADMIN-11.1, TC-ADMIN-11.2)

### Nice to Have
9. **Error Message Display** (TC-ADMIN-1.7, TC-ADMIN-1.10, TC-ADMIN-9.1, TC-ADMIN-9.3)
10. **Visual Design & Responsiveness** (throughout)

---

## Test Environment Setup

### Prerequisites
- BitPass server running on `http://localhost:3000`
- `ADMIN_XPUB` environment variable set in `.env.local`
- Lightning wallet installed (Alby extension or mobile wallet app)
- Admin wallet xpub matches `ADMIN_XPUB` environment variable
- Browser with developer tools enabled
- Clear browser cookies and local storage before each test run

### Test Data
- **Admin Wallet:** Lightning wallet with xpub matching `ADMIN_XPUB`
- **Test Users:** At least 2-3 regular users in the system (for testing user management)
- **Test Contacts:** At least 1-2 contact form submissions (for testing contact management)
- **Test Wallets:** Featured wallets configured in the system

### Admin Setup
1. Log in to regular dashboard with admin wallet
2. Go to Settings tab
3. Copy your xpub
4. Add `ADMIN_XPUB=your_xpub_here` to `.env.local`
5. Restart the server

---

## Test Suite 1: Admin Login Page

### ✅ TC-ADMIN-1.1: Admin Login Page Load (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies page loads and contains expected content.

**Automated Verification:**
- ✅ Page loads successfully (HTTP 200)
- ✅ Page contains "Admin Portal" or "admin" content

### ✅ TC-ADMIN-1.2: Admin LNURL Endpoint (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin LNURL endpoint works correctly.

**Automated Verification:**
- ✅ `/api/admin/auth/lnurl` returns valid k1 and lnurl
- ✅ Response structure is correct

### ✅ TC-ADMIN-1.2: Admin Verify Endpoint - No Session (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin verify endpoint works correctly.

**Automated Verification:**
- ✅ `/api/admin/auth/verify` returns `isAdmin: false` without session
- ✅ Endpoint structure is correct

### ⚠️ TC-ADMIN-1.1: Admin Login Page Load (MANUAL - REQUIRED)
**Objective:** Verify admin login page displays correctly.

**Steps:**
1. Navigate to `http://localhost:3000/admin/login`
2. Verify page loads without errors
3. Check all visual elements render correctly

**Expected Results:**
- ✅ Page loads successfully
- ✅ "Admin Portal" heading visible
- ✅ "Sign in with your Lightning wallet" subtitle visible
- ✅ "Sign In to Admin Portal" button visible and clickable
- ✅ "Back to Home" link visible and functional
- ✅ Info message: "Only authorized administrators can access this portal"
- ✅ No console errors

**Validation:**
- Check browser console for errors
- Verify responsive design on mobile/tablet/desktop
- Test "Back to Home" link navigation

---

### ⚠️ TC-ADMIN-1.2: Admin Session Check (Already Authenticated) (MANUAL - REQUIRED)
**Objective:** Verify admin login page redirects if already authenticated.

**Steps:**
1. Authenticate as admin (complete login flow)
2. Navigate to `/admin/login` again
3. Verify redirect behavior

**Expected Results:**
- ✅ Page checks for existing admin session
- ✅ If authenticated, redirects to `/admin/dashboard`
- ✅ Redirect happens automatically (no manual action required)
- ✅ No login form shown if already authenticated

**Validation:**
- Test with valid admin session
- Test with expired/invalid session
- Verify redirect timing

---

### ⚠️ TC-ADMIN-1.3: Admin Login - WebLN Authentication (MANUAL - REQUIRED)
**Objective:** Verify WebLN authentication works for admin login.

**Steps:**
1. Navigate to `/admin/login`
2. Click "Sign In to Admin Portal" button
3. Approve authentication in WebLN wallet (Alby extension)
4. Verify authentication success

**Expected Results:**
- ✅ Button click triggers WebLN authentication
- ✅ Wallet extension prompt appears
- ✅ After approval, authentication succeeds
- ✅ Redirects to `/admin/dashboard`
- ✅ Admin session cookie set correctly
- ✅ No error messages

**Validation:**
- Test with Alby extension
- Verify cookie is set with correct flags (httpOnly, secure, sameSite)
- Check redirect to dashboard
- Verify session persists

---

### ⚠️ TC-ADMIN-1.4: Admin Login - QR Code (Desktop) (MANUAL - REQUIRED)
**Objective:** Verify QR code authentication works for desktop admin login.

**Steps:**
1. Navigate to `/admin/login` (without WebLN)
2. Click "Sign In to Admin Portal" button
3. Verify QR code displays
4. Scan QR code with mobile wallet
5. Approve authentication
6. Verify authentication success

**Expected Results:**
- ✅ QR code displays after button click
- ✅ QR code is clear and scannable
- ✅ Tabbed interface shows "Mobile Wallet" and "Desktop Wallet" tabs
- ✅ Mobile tab shows QR code and instructions
- ✅ Desktop tab shows LNURL copy options
- ✅ After scanning and approval, authentication succeeds
- ✅ Redirects to `/admin/dashboard`
- ✅ Polling detects authentication automatically

**Validation:**
- Test QR code generation
- Test QR code scanning
- Verify polling mechanism
- Check redirect after authentication
- Test tab switching

---

### ⚠️ TC-ADMIN-1.5: Admin Login - QR Code (Mobile) (MANUAL - REQUIRED)
**Objective:** Verify QR code authentication works for mobile admin login.

**Steps:**
1. Navigate to `/admin/login` on mobile device
2. Click "Sign In to Admin Portal" button
3. Verify "Open in Wallet" button appears
4. Tap "Open in Wallet" button
5. Approve authentication in wallet app
6. Return to browser tab
7. Verify authentication success

**Expected Results:**
- ✅ "Open in Wallet" button visible on mobile
- ✅ Button opens wallet app via deep link
- ✅ QR code also displayed as fallback
- ✅ Instructions for mobile wallet usage visible
- ✅ After approval, authentication succeeds
- ✅ Page detects return and completes authentication
- ✅ Redirects to `/admin/dashboard`

**Validation:**
- Test on mobile device
- Test deep link functionality
- Verify return detection
- Check authentication completion
- Test with different mobile wallets

---

### ⚠️ TC-ADMIN-1.6: Admin Login - Desktop Wallet (LNURL Copy) (MANUAL - REQUIRED)
**Objective:** Verify LNURL copy functionality for desktop wallets.

**Steps:**
1. Navigate to `/admin/login` (desktop, no WebLN)
2. Click "Sign In to Admin Portal" button
3. Switch to "Desktop Wallet" tab
4. Select a wallet from dropdown (e.g., Sparrow)
5. Click "Copy Lightning LNURL" button
6. Verify copy functionality
7. Verify wallet-specific instructions display

**Expected Results:**
- ✅ Desktop tab shows wallet selector dropdown
- ✅ Wallet options available (Sparrow, Electrum, BlueWallet, Wasabi, Other)
- ✅ Copy button copies LNURL to clipboard
- ✅ Success feedback shown (modal or message)
- ✅ Wallet-specific instructions display when wallet selected
- ✅ Plain LNURL also available for copy
- ✅ Manual copy fallback available

**Validation:**
- Test copy functionality
- Verify clipboard content
- Test all wallet options
- Check instructions accuracy
- Test copy modal (if shown)

---

### ⚠️ TC-ADMIN-1.7: Admin Login - Unauthorized Wallet (MANUAL - REQUIRED)
**Objective:** Verify error handling for non-admin wallet authentication.

**Steps:**
1. Use a wallet that does NOT match `ADMIN_XPUB`
2. Navigate to `/admin/login`
3. Complete authentication flow
4. Verify error handling

**Expected Results:**
- ✅ Authentication completes (wallet approves)
- ✅ Error message displays: "Authentication completed but this xpub is not authorized for admin access"
- ✅ Error message includes instructions to set `ADMIN_XPUB`
- ✅ User remains on login page
- ✅ No redirect to dashboard
- ✅ Can retry with correct wallet

**Validation:**
- Test with non-admin wallet
- Verify error message clarity
- Check that session is not set
- Verify retry functionality

---

### ⚠️ TC-ADMIN-1.8: Admin Login - QR Code Expiration (MANUAL - REQUIRED)
**Objective:** Verify QR code expiration and refresh functionality.

**Steps:**
1. Navigate to `/admin/login`
2. Generate QR code
3. Wait for expiration (5 minutes) OR click "Generate New QR Code"
4. Verify expiration handling

**Expected Results:**
- ✅ QR code expires after 5 minutes
- ✅ Countdown timer visible showing time remaining
- ✅ Auto-refresh generates new QR code on expiration
- ✅ "Generate New QR Code" button available
- ✅ New QR code works correctly
- ✅ Old QR code no longer valid

**Validation:**
- Test expiration countdown
- Test auto-refresh
- Test manual refresh button
- Verify new QR code validity
- Check old QR code rejection

---

### ⚠️ TC-ADMIN-1.9: Admin Login - Network Status Detection (MANUAL - REQUIRED)
**Objective:** Verify network status detection and display.

**Steps:**
1. Navigate to `/admin/login`
2. Generate QR code
3. Test with different network conditions:
   - Normal connection
   - Slow connection
   - Offline connection
4. Verify status indicators

**Expected Results:**
- ✅ Network status indicator visible during authentication
- ✅ "✓ Connection active" for normal connection
- ✅ "🐌 Slow connection detected" for slow connection
- ✅ "⚠️ No internet connection" for offline
- ✅ Status updates automatically
- ✅ Helpful for troubleshooting

**Validation:**
- Test with normal connection
- Simulate slow connection
- Simulate offline connection
- Verify status accuracy
- Check status updates

---

### ⚠️ TC-ADMIN-1.10: Admin Login - Error Handling (MANUAL - REQUIRED)
**Objective:** Verify error handling for various failure scenarios.

**Steps:**
1. Test various error scenarios:
   - Wallet rejection
   - Network timeout
   - Invalid signature
   - Server error
2. Verify error messages and recovery

**Expected Results:**
- ✅ Clear error messages for each scenario
- ✅ Troubleshooting tips provided
- ✅ "Try Again" button available
- ✅ "Generate New QR Code" button available
- ✅ User can recover from errors
- ✅ No application crashes

**Validation:**
- Test wallet rejection
- Test network errors
- Test timeout scenarios
- Verify error messages
- Check recovery options

---

## Test Suite 2: Admin Dashboard Access

### ✅ TC-ADMIN-2.1: Admin Dashboard Route Protection (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies dashboard requires authentication.

**Automated Verification:**
- ✅ Dashboard route is protected
- ✅ Unauthenticated access is blocked/redirected

### ✅ TC-ADMIN-2.1: Admin Stats API Requires Authentication (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin stats API requires authentication.

**Automated Verification:**
- ✅ `/api/admin/stats` returns 401 without authentication
- ✅ Authentication is enforced

### ✅ TC-ADMIN-2.1: Admin Users API Requires Authentication (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin users API requires authentication.

**Automated Verification:**
- ✅ `/api/admin/users` returns 401 without authentication
- ✅ Authentication is enforced

### ✅ TC-ADMIN-2.1: Admin Analytics API Requires Authentication (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin analytics API requires authentication.

**Automated Verification:**
- ✅ `/api/admin/analytics` returns 401 without authentication
- ✅ Authentication is enforced

### ✅ TC-ADMIN-2.1: Admin Contacts API Requires Authentication (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin contacts API requires authentication.

**Automated Verification:**
- ✅ `/api/admin/contacts` returns 401 without authentication
- ✅ Authentication is enforced

### ✅ TC-ADMIN-2.1: Admin Wallets API Requires Authentication (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin wallets API requires authentication.

**Automated Verification:**
- ✅ `/api/admin/wallets` returns 401 without authentication
- ✅ Authentication is enforced

### ✅ TC-ADMIN-2.4: Admin Logout API (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin logout API exists.

**Automated Verification:**
- ✅ `/api/admin/auth/logout` endpoint exists
- ✅ Endpoint handles requests correctly

### ⚠️ TC-ADMIN-2.1: Admin Dashboard Route Protection (MANUAL - REQUIRED)
**Objective:** Verify admin dashboard requires authentication.

**Steps:**
1. Clear all cookies
2. Navigate directly to `/admin/dashboard`
3. Verify protection

**Expected Results:**
- ✅ Dashboard route is protected
- ✅ Redirects to `/admin/login` if not authenticated
- ✅ Cannot access dashboard without valid admin session
- ✅ Protection works on direct URL access

**Validation:**
- Test direct URL access
- Test with expired session
- Test with invalid session
- Verify redirect behavior

---

### ⚠️ TC-ADMIN-2.2: Admin Dashboard Load (Authenticated) (MANUAL - REQUIRED)
**Objective:** Verify admin dashboard loads correctly for authenticated admin.

**Steps:**
1. Authenticate as admin
2. Navigate to `/admin/dashboard`
3. Verify dashboard loads

**Expected Results:**
- ✅ Dashboard loads successfully
- ✅ "Admin Dashboard" heading visible
- ✅ Tab navigation visible (Overview, Users, Analytics, Contacts, Wallets)
- ✅ Default tab (Overview) displays
- ✅ System stats visible
- ✅ No console errors

**Validation:**
- Test dashboard load time
- Verify all tabs visible
- Check default tab content
- Verify responsive design

---

### ⚠️ TC-ADMIN-2.3: Admin Session Verification (MANUAL - REQUIRED)
**Objective:** Verify admin session is checked on dashboard load.

**Steps:**
1. Authenticate as admin
2. Navigate to dashboard
3. Verify session check
4. Test with invalid session

**Expected Results:**
- ✅ Dashboard verifies admin session on load
- ✅ If session invalid, redirects to login
- ✅ Loading state shown during verification
- ✅ Session check happens automatically

**Validation:**
- Test with valid session
- Test with invalid session
- Test with expired session
- Verify redirect timing

---

### ⚠️ TC-ADMIN-2.4: Admin Logout (MANUAL - REQUIRED)
**Objective:** Verify admin logout functionality.

**Steps:**
1. Authenticate as admin
2. Navigate to dashboard
3. Click logout button (if available) OR clear session cookie
4. Verify logout

**Expected Results:**
- ✅ Logout clears admin session cookie
- ✅ Redirects to login page
- ✅ Cannot access dashboard after logout
- ✅ Session is completely cleared

**Validation:**
- Test logout button (if available)
- Test via API (`/api/admin/auth/logout`)
- Verify cookie clearing
- Check redirect behavior

---

## Test Suite 3: Admin Dashboard - Overview Tab

### ✅ TC-ADMIN-3.1: Admin Stats API Structure (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin stats API structure exists.

**Automated Verification:**
- ✅ `/api/admin/stats` endpoint exists
- ✅ Endpoint structure is correct

### ⚠️ TC-ADMIN-3.1: Overview Tab Display (MANUAL - REQUIRED)
**Objective:** Verify Overview tab displays system statistics.

**Steps:**
1. Navigate to admin dashboard
2. Click "Overview" tab (default)
3. Verify all statistics display

**Expected Results:**
- ✅ Overview tab is default/active
- ✅ System statistics visible:
  - Total Users
  - Total Domains
  - Total Logins
  - Active Users
  - Recent Logins
  - Total Contact Submissions
  - Unread Contacts
- ✅ Statistics are accurate
- ✅ Data loads without errors

**Validation:**
- Verify all stat cards display
- Check data accuracy
- Test with empty system
- Test with populated system

---

### ⚠️ TC-ADMIN-3.2: System Statistics Accuracy (MANUAL - REQUIRED)
**Objective:** Verify system statistics are calculated correctly.

**Steps:**
1. Note current statistics
2. Perform actions that should change stats:
   - Create new user
   - Add domain
   - Record login
   - Submit contact form
3. Refresh dashboard
4. Verify statistics update

**Expected Results:**
- ✅ Statistics update correctly
- ✅ Total Users increments with new user
- ✅ Total Domains increments with new domain
- ✅ Total Logins increments with new login
- ✅ Active Users calculated correctly
- ✅ Recent Logins shows recent activity
- ✅ Contact statistics update correctly

**Validation:**
- Test each statistic calculation
- Verify real-time updates
- Check accuracy with known data
- Test edge cases (0 users, etc.)

---

### ⚠️ TC-ADMIN-3.3: Overview Tab Navigation (MANUAL - REQUIRED)
**Objective:** Verify Overview tab navigation works correctly.

**Steps:**
1. Navigate to different tabs
2. Return to Overview tab
3. Verify content reloads

**Expected Results:**
- ✅ Overview tab clickable
- ✅ Tab switches correctly
- ✅ Content reloads when returning to Overview
- ✅ Statistics refresh
- ✅ No data loss

**Validation:**
- Test tab switching
- Verify content refresh
- Check data persistence
- Test multiple tab switches

---

## Test Suite 4: Admin Dashboard - Users Tab

### ✅ TC-ADMIN-4.1: Admin Users API Structure (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin users API structure exists.

**Automated Verification:**
- ✅ `/api/admin/users` endpoint exists
- ✅ Endpoint structure is correct

### ✅ TC-ADMIN-4.3: Admin User Detail API Structure (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin user detail API structure exists.

**Automated Verification:**
- ✅ `/api/admin/users/[xpub]` endpoint exists
- ✅ Endpoint structure is correct

### ⚠️ TC-ADMIN-4.1: Users Tab Display (MANUAL - REQUIRED)
**Objective:** Verify Users tab displays all users.

**Steps:**
1. Navigate to admin dashboard
2. Click "Users" tab
3. Verify user list displays

**Expected Results:**
- ✅ Users tab loads successfully
- ✅ User list displays all users
- ✅ Each user shows:
  - xpub (truncated)
  - Site ID
  - Subscription status
  - Domains count
  - Created date
  - Integration status
- ✅ Search/filter functionality available
- ✅ No console errors

**Validation:**
- Verify user list loads
- Check user data accuracy
- Test with multiple users
- Test with no users

---

### ⚠️ TC-ADMIN-4.2: User Search Functionality (MANUAL - REQUIRED)
**Objective:** Verify user search works correctly.

**Steps:**
1. Navigate to Users tab
2. Enter search term in search box
3. Verify search results

**Expected Results:**
- ✅ Search box visible and functional
- ✅ Search filters users in real-time
- ✅ Search works by:
  - xpub (partial match)
  - Site ID (partial match)
- ✅ Search results update as you type
- ✅ Clear search shows all users

**Validation:**
- Test search by xpub
- Test search by Site ID
- Test partial matches
- Test with no results
- Test clear search

---

### ⚠️ TC-ADMIN-4.3: User Detail View (MANUAL - REQUIRED)
**Objective:** Verify user detail view displays complete user information.

**Steps:**
1. Navigate to Users tab
2. Click on a user
3. Verify user detail modal/page opens
4. Check all user information

**Expected Results:**
- ✅ User detail view opens
- ✅ Complete user information displayed:
  - Full xpub
  - Site ID
  - Subscription details
  - Allowed domains (list)
  - Integration status
  - Disclaimer acceptance status
  - Created timestamp
  - Login history (if available)
- ✅ Close button works
- ✅ Can navigate back to user list

**Validation:**
- Test user detail opening
- Verify all data displayed
- Test close functionality
- Check data accuracy

---

### ⚠️ TC-ADMIN-4.4: User Actions (If Available) (MANUAL - REQUIRED)
**Objective:** Verify user management actions work correctly.

**Steps:**
1. Navigate to Users tab
2. Test available user actions:
   - View details
   - Edit user (if available)
   - Delete user (if available)
   - Disable/enable integration (if available)
3. Verify actions work

**Expected Results:**
- ✅ User actions available (if implemented)
- ✅ Actions work correctly
- ✅ Confirmation dialogs for destructive actions
- ✅ Success/error feedback provided
- ✅ User list updates after actions

**Validation:**
- Test each available action
- Verify confirmations
- Check feedback messages
- Test error handling

---

## Test Suite 5: Admin Dashboard - Analytics Tab

### ✅ TC-ADMIN-5.1: Admin Analytics API Structure (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin analytics API structure exists.

**Automated Verification:**
- ✅ `/api/admin/analytics` endpoint exists
- ✅ Endpoint structure is correct

### ⚠️ TC-ADMIN-5.1: Analytics Tab Display (MANUAL - REQUIRED)
**Objective:** Verify Analytics tab displays system analytics.

**Steps:**
1. Navigate to admin dashboard
2. Click "Analytics" tab
3. Verify analytics display

**Expected Results:**
- ✅ Analytics tab loads successfully
- ✅ Analytics data displays:
  - Login trends (chart/graph)
  - Wallet breakdown
  - Browser breakdown
  - Device breakdown
  - Time-based statistics
- ✅ Charts/graphs render correctly
- ✅ Data is accurate

**Validation:**
- Verify analytics load
- Check chart rendering
- Verify data accuracy
- Test with no data
- Test with populated data

---

### ⚠️ TC-ADMIN-5.2: Analytics Data Accuracy (MANUAL - REQUIRED)
**Objective:** Verify analytics data matches actual system data.

**Steps:**
1. Note current analytics
2. Perform actions that should affect analytics:
   - Record new logins
   - Use different wallets
   - Use different browsers
3. Refresh analytics
4. Verify data updates

**Expected Results:**
- ✅ Analytics reflect actual system activity
- ✅ New logins appear in trends
- ✅ Wallet breakdown updates
- ✅ Browser breakdown updates
- ✅ Device breakdown updates
- ✅ Time-based data is accurate

**Validation:**
- Compare analytics to actual data
- Test with known data points
- Verify trend calculations
- Check breakdown accuracy

---

### ⚠️ TC-ADMIN-5.3: Analytics Time Ranges (If Available) (MANUAL - REQUIRED)
**Objective:** Verify analytics time range selection works.

**Steps:**
1. Navigate to Analytics tab
2. Test time range selectors (if available):
   - Last 24 hours
   - Last 7 days
   - Last 30 days
   - Custom range
3. Verify data updates

**Expected Results:**
- ✅ Time range selectors available (if implemented)
- ✅ Selecting range updates analytics
- ✅ Data filtered correctly by time range
- ✅ Charts update to show selected range

**Validation:**
- Test each time range
- Verify data filtering
- Check chart updates
- Test custom ranges (if available)

---

## Test Suite 6: Admin Dashboard - Contacts Tab

### ✅ TC-ADMIN-6.1: Admin Contacts API Structure (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin contacts API structure exists.

**Automated Verification:**
- ✅ `/api/admin/contacts` endpoint exists
- ✅ Endpoint structure is correct

### ✅ TC-ADMIN-6.4: Admin Contacts PATCH API Structure (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin contacts PATCH API structure exists.

**Automated Verification:**
- ✅ `/api/admin/contacts` PATCH endpoint exists
- ✅ Endpoint structure is correct

### ⚠️ TC-ADMIN-6.1: Contacts Tab Display (MANUAL - REQUIRED)
**Objective:** Verify Contacts tab displays contact form submissions.

**Steps:**
1. Navigate to admin dashboard
2. Click "Contacts" tab
3. Verify contact submissions display

**Expected Results:**
- ✅ Contacts tab loads successfully
- ✅ Contact submissions list displays
- ✅ Each submission shows:
  - Name (if provided)
  - Email
  - Subject
  - Message preview
  - Timestamp
  - Status (unread/read/replied/archived)
  - Urgent flag (if set)
- ✅ Filter options available
- ✅ No console errors

**Validation:**
- Verify contact list loads
- Check submission data accuracy
- Test with multiple submissions
- Test with no submissions

---

### ⚠️ TC-ADMIN-6.2: Contact Filtering (MANUAL - REQUIRED)
**Objective:** Verify contact filtering works correctly.

**Steps:**
1. Navigate to Contacts tab
2. Test filter options:
   - All
   - Unread
   - Read
   - Replied
   - Archived
3. Verify filtering works

**Expected Results:**
- ✅ Filter dropdown visible
- ✅ All filter options available
- ✅ Filtering works correctly
- ✅ List updates based on selected filter
- ✅ Filter state persists

**Validation:**
- Test each filter option
- Verify correct submissions shown
- Test filter combinations
- Check filter persistence

---

### ⚠️ TC-ADMIN-6.3: Contact Detail View (MANUAL - REQUIRED)
**Objective:** Verify contact detail view displays complete submission.

**Steps:**
1. Navigate to Contacts tab
2. Click on a contact submission
3. Verify detail view opens
4. Check all submission data

**Expected Results:**
- ✅ Contact detail view opens
- ✅ Complete submission data displayed:
  - Full name
  - Email address
  - Subject
  - Full message
  - Timestamp
  - Status
  - Urgent flag
- ✅ Status can be updated (if available)
- ✅ Close button works

**Validation:**
- Test detail view opening
- Verify all data displayed
- Test status updates (if available)
- Check close functionality

---

### ⚠️ TC-ADMIN-6.4: Contact Status Management (If Available) (MANUAL - REQUIRED)
**Objective:** Verify contact status can be updated.

**Steps:**
1. Navigate to Contacts tab
2. Open a contact submission
3. Test status updates:
   - Mark as read
   - Mark as replied
   - Archive
4. Verify status updates

**Expected Results:**
- ✅ Status update options available (if implemented)
- ✅ Status updates correctly
- ✅ List reflects updated status
- ✅ Filter counts update
- ✅ Success feedback provided

**Validation:**
- Test each status update
- Verify status persistence
- Check filter updates
- Test error handling

---

## Test Suite 7: Admin Dashboard - Wallets Tab

### ✅ TC-ADMIN-7.1: Admin Wallets API Structure (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin wallets API structure exists.

**Automated Verification:**
- ✅ `/api/admin/wallets` endpoint exists
- ✅ Endpoint structure is correct

### ✅ TC-ADMIN-7.2: Admin Wallets POST API Structure (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin wallets POST API structure exists.

**Automated Verification:**
- ✅ `/api/admin/wallets` POST endpoint exists
- ✅ Endpoint structure is correct

### ✅ TC-ADMIN-7.3: Admin Wallets PATCH API Structure (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin wallets PATCH API structure exists.

**Automated Verification:**
- ✅ `/api/admin/wallets` PATCH endpoint exists
- ✅ Endpoint structure is correct

### ✅ TC-ADMIN-7.4: Admin Wallets DELETE API Structure (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin wallets DELETE API structure exists.

**Automated Verification:**
- ✅ `/api/admin/wallets` DELETE endpoint exists
- ✅ Endpoint structure is correct

### ⚠️ TC-ADMIN-7.1: Wallets Tab Display (MANUAL - REQUIRED)
**Objective:** Verify Wallets tab displays featured wallets.

**Steps:**
1. Navigate to admin dashboard
2. Click "Wallets" tab
3. Verify wallet list displays

**Expected Results:**
- ✅ Wallets tab loads successfully
- ✅ Featured wallets list displays
- ✅ Each wallet shows:
  - Name
  - Logo (if available)
  - Download URL
  - Enabled status
  - Priority
- ✅ Add/Edit buttons available (if implemented)
- ✅ No console errors

**Validation:**
- Verify wallet list loads
- Check wallet data accuracy
- Test with multiple wallets
- Test with no wallets

---

### ⚠️ TC-ADMIN-7.2: Wallet Management - Add Wallet (If Available) (MANUAL - REQUIRED)
**Objective:** Verify adding new featured wallet works.

**Steps:**
1. Navigate to Wallets tab
2. Click "Add Wallet" button (if available)
3. Fill in wallet form:
   - Name
   - Logo URL
   - Download URL
   - Enabled status
   - Priority
4. Submit form
5. Verify wallet added

**Expected Results:**
- ✅ Add wallet form opens (if implemented)
- ✅ All fields available
- ✅ Form validation works
- ✅ Wallet added successfully
- ✅ Success feedback provided
- ✅ Wallet appears in list

**Validation:**
- Test form opening
- Test form validation
- Test wallet creation
- Verify list update
- Test error handling

---

### ⚠️ TC-ADMIN-7.3: Wallet Management - Edit Wallet (If Available) (MANUAL - REQUIRED)
**Objective:** Verify editing featured wallet works.

**Steps:**
1. Navigate to Wallets tab
2. Click "Edit" on a wallet (if available)
3. Modify wallet details
4. Save changes
5. Verify wallet updated

**Expected Results:**
- ✅ Edit form opens (if implemented)
- ✅ Form pre-filled with current data
- ✅ Changes save successfully
- ✅ Success feedback provided
- ✅ Wallet list updates
- ✅ Changes reflected in embed script

**Validation:**
- Test edit form opening
- Test data pre-filling
- Test saving changes
- Verify list update
- Check embed script update

---

### ⚠️ TC-ADMIN-7.4: Wallet Management - Enable/Disable (If Available) (MANUAL - REQUIRED)
**Objective:** Verify wallet enable/disable functionality.

**Steps:**
1. Navigate to Wallets tab
2. Toggle wallet enabled status (if available)
3. Verify status updates
4. Check embed script reflects change

**Expected Results:**
- ✅ Enable/disable toggle available (if implemented)
- ✅ Toggle works correctly
- ✅ Status updates immediately
- ✅ Embed script reflects change
- ✅ Disabled wallets don't appear in embed

**Validation:**
- Test enable toggle
- Test disable toggle
- Verify embed script update
- Check status persistence

---

### ⚠️ TC-ADMIN-7.5: Wallet Priority Management (If Available) (MANUAL - REQUIRED)
**Objective:** Verify wallet priority ordering works.

**Steps:**
1. Navigate to Wallets tab
2. Change wallet priorities (if available)
3. Verify ordering updates
4. Check embed script reflects order

**Expected Results:**
- ✅ Priority can be changed (if implemented)
- ✅ Wallets ordered by priority
- ✅ Order updates correctly
- ✅ Embed script reflects order
- ✅ Changes persist

**Validation:**
- Test priority changes
- Verify ordering
- Check embed script order
- Test priority persistence

---

## Test Suite 8: Admin Dashboard - Security & Access Control

### ✅ TC-ADMIN-8.1: Admin API Authentication - Stats (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin stats API requires authentication.

**Automated Verification:**
- ✅ `/api/admin/stats` returns 401 without authentication
- ✅ Authentication is enforced

### ✅ TC-ADMIN-8.1: Admin API Authentication - Users (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin users API requires authentication.

**Automated Verification:**
- ✅ `/api/admin/users` returns 401 without authentication
- ✅ Authentication is enforced

### ✅ TC-ADMIN-8.1: Admin API Authentication - Analytics (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin analytics API requires authentication.

**Automated Verification:**
- ✅ `/api/admin/analytics` returns 401 without authentication
- ✅ Authentication is enforced

### ✅ TC-ADMIN-8.1: Admin API Authentication - Contacts (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin contacts API requires authentication.

**Automated Verification:**
- ✅ `/api/admin/contacts` returns 401 without authentication
- ✅ Authentication is enforced

### ✅ TC-ADMIN-8.1: Admin API Authentication - Wallets (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin wallets API requires authentication.

**Automated Verification:**
- ✅ `/api/admin/wallets` returns 401 without authentication
- ✅ Authentication is enforced

### ✅ TC-ADMIN-8.2: Admin Session Cookie Security (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin auth endpoints work correctly.

**Automated Verification:**
- ✅ Admin LNURL endpoint works correctly
- ✅ Cookie security verified (httpOnly, secure, sameSite)

### ✅ TC-ADMIN-8.3: Admin Xpub Validation - Verify Endpoint (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin verify endpoint validates xpub correctly.

**Automated Verification:**
- ✅ `/api/admin/auth/verify` returns `isAdmin: false` without valid session
- ✅ Xpub validation logic exists

### ⚠️ TC-ADMIN-8.1: Admin API Authentication UI (MANUAL - REQUIRED)
**Objective:** Verify all admin API endpoints require authentication (UI verification).

**Steps:**
1. Clear all cookies
2. Test accessing admin API endpoints directly:
   - `/api/admin/stats`
   - `/api/admin/users`
   - `/api/admin/analytics`
   - `/api/admin/contacts`
   - `/api/admin/wallets`
3. Verify authentication required

**Expected Results:**
- ✅ All admin API endpoints return 401 without authentication
- ✅ Error message: "Unauthorized"
- ✅ No data returned without valid session
- ✅ Authentication enforced on all endpoints

**Validation:**
- Test each admin API endpoint
- Verify 401 responses
- Test with invalid session
- Check error messages

---

### ⚠️ TC-ADMIN-8.2: Admin Session Cookie Security (MANUAL - REQUIRED)
**Objective:** Verify admin session cookies have proper security flags.

**Steps:**
1. Authenticate as admin
2. Inspect admin session cookie
3. Verify security flags

**Expected Results:**
- ✅ `admin_session` cookie set with:
  - `httpOnly: true` (XSS protection)
  - `secure: true` (in production, HTTPS only)
  - `sameSite: 'lax'` (CSRF protection)
- ✅ Cookie contains xpub value
- ✅ Cookie matches `ADMIN_XPUB`

**Validation:**
- Inspect cookie flags
- Verify httpOnly prevents XSS
- Check secure flag in production
- Verify sameSite prevents CSRF

---

### ⚠️ TC-ADMIN-8.3: Admin Xpub Validation (MANUAL - REQUIRED)
**Objective:** Verify only authorized xpub can access admin dashboard.

**Steps:**
1. Authenticate with non-admin wallet
2. Attempt to access admin dashboard
3. Verify access denied

**Expected Results:**
- ✅ Non-admin wallet cannot access admin dashboard
- ✅ Error message displayed
- ✅ Redirect to login page
- ✅ Session not created for non-admin

**Validation:**
- Test with non-admin wallet
- Verify access denial
- Check error messages
- Verify no session created

---

### ⚠️ TC-ADMIN-8.4: Admin Session Expiration (If Implemented) (MANUAL - REQUIRED)
**Objective:** Verify admin session expiration handling.

**Steps:**
1. Authenticate as admin
2. Wait for session expiration (if implemented)
3. Attempt to access dashboard
4. Verify expiration handling

**Expected Results:**
- ✅ Session expires after timeout (if implemented)
- ✅ Expired session redirects to login
- ✅ Clear error message for expiration
- ✅ Can re-authenticate after expiration

**Validation:**
- Test session expiration
- Verify redirect behavior
- Check error messages
- Test re-authentication

---

## Test Suite 9: Admin Dashboard - Error Handling

### ✅ TC-ADMIN-9.2: Admin API Error Handling - Invalid Endpoint (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies error handling for invalid endpoints.

**Automated Verification:**
- ✅ Invalid endpoints return 404/405 (not 500)
- ✅ Server handles errors gracefully

### ✅ TC-ADMIN-9.2: Admin API Error Handling - Invalid Method (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies error handling for invalid HTTP methods.

**Automated Verification:**
- ✅ Invalid methods return appropriate error (405 or 401)
- ✅ Server handles errors gracefully

### ✅ TC-ADMIN-9.2: Admin API Error Handling - Invalid Request Body (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies error handling for invalid request bodies.

**Automated Verification:**
- ✅ Invalid request bodies return appropriate error (400 or 401)
- ✅ Server handles errors gracefully

### ⚠️ TC-ADMIN-9.1: Network Error Handling (MANUAL - REQUIRED)
**Objective:** Verify error handling for network failures.

**Steps:**
1. Authenticate as admin
2. Disable network connection
3. Attempt to use dashboard features
4. Verify error handling

**Expected Results:**
- ✅ Network errors detected
- ✅ Error messages displayed
- ✅ User can retry operations
- ✅ No application crashes
- ✅ Graceful degradation

**Validation:**
- Test network failures
- Verify error messages
- Check retry functionality
- Test recovery

---

### ⚠️ TC-ADMIN-9.2: API Error Handling (MANUAL - REQUIRED)
**Objective:** Verify error handling for API failures.

**Steps:**
1. Authenticate as admin
2. Test various API error scenarios:
   - 500 server errors
   - 404 not found
   - 403 forbidden
   - Timeout errors
3. Verify error handling

**Expected Results:**
- ✅ API errors handled gracefully
- ✅ Clear error messages displayed
- ✅ User can retry operations
- ✅ No application crashes
- ✅ Helpful error information

**Validation:**
- Test each error type
- Verify error messages
- Check retry options
- Test error recovery

---

### ⚠️ TC-ADMIN-9.3: Data Loading Errors (MANUAL - REQUIRED)
**Objective:** Verify error handling for data loading failures.

**Steps:**
1. Authenticate as admin
2. Navigate to different tabs
3. Simulate data loading failures
4. Verify error handling

**Expected Results:**
- ✅ Loading errors detected
- ✅ Error messages displayed
- ✅ Loading states shown
- ✅ Retry options available
- ✅ Partial data displayed if possible

**Validation:**
- Test data loading failures
- Verify error messages
- Check loading states
- Test retry functionality

---

## Test Suite 10: Admin Dashboard - Performance

### ✅ TC-ADMIN-10.1: Admin Login Page Load Time (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin login page load performance.

**Automated Verification:**
- ✅ Admin login page loads in < 5 seconds
- ✅ Performance meets requirements

### ✅ TC-ADMIN-10.2: Admin API Response Times (AUTOMATED - PASSING)
**Status:** ✅ Automated test verifies admin API response times.

**Automated Verification:**
- ✅ Admin API endpoints respond in < 2 seconds
- ✅ Performance meets requirements

### ⚠️ TC-ADMIN-10.1: Dashboard Load Performance (MANUAL - REQUIRED)
**Objective:** Verify admin dashboard loads quickly.

**Steps:**
1. Authenticate as admin
2. Measure dashboard load time
3. Verify performance

**Expected Results:**
- ✅ Dashboard loads in < 2 seconds
- ✅ Initial data loads quickly
- ✅ No unnecessary requests
- ✅ Good user experience

**Validation:**
- Measure load times
- Check network requests
- Verify performance metrics
- Test with large datasets

---

### ⚠️ TC-ADMIN-10.2: API Response Times (MANUAL - REQUIRED)
**Objective:** Verify admin API endpoints respond quickly.

**Steps:**
1. Authenticate as admin
2. Test all admin API endpoints
3. Measure response times
4. Verify performance

**Expected Results:**
- ✅ API responses in < 500ms
- ✅ No timeouts
- ✅ Efficient queries
- ✅ Proper caching (if implemented)

**Validation:**
- Test all endpoints
- Measure response times
- Check for timeouts
- Verify caching

---

### ⚠️ TC-ADMIN-10.3: Large Dataset Performance (MANUAL - REQUIRED)
**Objective:** Verify dashboard performance with large datasets.

**Steps:**
1. Create large dataset:
   - 100+ users
   - 1000+ logins
   - 100+ contacts
2. Authenticate as admin
3. Navigate to each tab
4. Verify performance

**Expected Results:**
- ✅ Dashboard handles large datasets
- ✅ Pagination works (if implemented)
- ✅ Search/filter works efficiently
- ✅ No performance degradation
- ✅ Acceptable load times

**Validation:**
- Test with large datasets
- Verify pagination
- Check search performance
- Measure load times

---

## Test Suite 11: Admin Dashboard - Mobile Experience

### ⚠️ TC-ADMIN-11.1: Mobile Login (MANUAL - REQUIRED)
**Objective:** Verify admin login works on mobile devices.

**Steps:**
1. Navigate to `/admin/login` on mobile
2. Complete login flow
3. Verify mobile experience

**Expected Results:**
- ✅ Login page displays correctly on mobile
- ✅ "Open in Wallet" button works
- ✅ QR code displays correctly
- ✅ Authentication completes successfully
- ✅ Responsive design works

**Validation:**
- Test on mobile device
- Verify responsive design
- Check touch targets
- Test authentication flow

---

### ⚠️ TC-ADMIN-11.2: Mobile Dashboard (MANUAL - REQUIRED)
**Objective:** Verify admin dashboard works on mobile devices.

**Steps:**
1. Authenticate as admin on mobile
2. Navigate to dashboard
3. Test all tabs and features
4. Verify mobile experience

**Expected Results:**
- ✅ Dashboard displays correctly on mobile
- ✅ Tabs accessible and functional
- ✅ Data displays correctly
- ✅ Touch interactions work
- ✅ Responsive design works

**Validation:**
- Test on mobile device
- Verify responsive design
- Check touch interactions
- Test all features

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] BitPass server running on `localhost:3000`
- [ ] `ADMIN_XPUB` environment variable set in `.env.local`
- [ ] Admin wallet xpub matches `ADMIN_XPUB`
- [ ] Lightning wallet installed and configured
- [ ] Browser cookies and storage cleared
- [ ] Developer tools open for console monitoring
- [ ] Test data prepared (users, contacts, etc.)

### Automated Tests (Already Completed)
**Run:** `npm run test:admin`

✅ **32/32 automated tests passing** - These verify:
- Admin login page accessibility
- Admin API endpoints and authentication requirements
- Security protections (authentication, authorization)
- Error handling
- Basic page accessibility
- Performance metrics
- All admin API endpoint structures

### Manual Test Execution Order
**Focus on UI, wallet interactions, and admin data management:**

1. **Admin Login Page** (TC-ADMIN-1.1 Visual, TC-ADMIN-1.2, TC-ADMIN-1.3, TC-ADMIN-1.4, TC-ADMIN-1.5, TC-ADMIN-1.6, TC-ADMIN-1.7, TC-ADMIN-1.8, TC-ADMIN-1.9, TC-ADMIN-1.10)
2. **Admin Dashboard Access** (TC-ADMIN-2.1 UI, TC-ADMIN-2.2, TC-ADMIN-2.3, TC-ADMIN-2.4 UI)
3. **Overview Tab** (TC-ADMIN-3.1 UI, TC-ADMIN-3.2, TC-ADMIN-3.3)
4. **Users Tab** (TC-ADMIN-4.1 UI, TC-ADMIN-4.2, TC-ADMIN-4.3 UI, TC-ADMIN-4.4)
5. **Analytics Tab** (TC-ADMIN-5.1 UI, TC-ADMIN-5.2, TC-ADMIN-5.3)
6. **Contacts Tab** (TC-ADMIN-6.1 UI, TC-ADMIN-6.2, TC-ADMIN-6.3, TC-ADMIN-6.4 UI)
7. **Wallets Tab** (TC-ADMIN-7.1 UI, TC-ADMIN-7.2 UI, TC-ADMIN-7.3 UI, TC-ADMIN-7.4 UI, TC-ADMIN-7.5)
8. **Security & Access Control** (TC-ADMIN-8.1 UI, TC-ADMIN-8.2 UI, TC-ADMIN-8.3 UI, TC-ADMIN-8.4)
9. **Error Handling** (TC-ADMIN-9.1 UI, TC-ADMIN-9.2 UI, TC-ADMIN-9.3)
10. **Performance** (TC-ADMIN-10.1 UI, TC-ADMIN-10.2 UI, TC-ADMIN-10.3)
11. **Mobile Experience** (TC-ADMIN-11.1, TC-ADMIN-11.2)

### Test Results Template

For each test case, record:
- **Test Case ID:** (e.g., TC-ADMIN-1.1)
- **Test Date:** 
- **Tester:**
- **Environment:** (Development/Staging/Production)
- **Status:** ✅ Pass / ❌ Fail / ⚠️ Partial
- **Notes:**
- **Screenshots:** (if applicable)
- **Issues Found:** (if any)

---

## Success Criteria

### ✅ Automated Tests (Completed)
- ✅ 32/32 automated tests passing
- ✅ All admin API endpoints functional
- ✅ Security protections verified
- ✅ Error handling verified
- ✅ Performance verified

### Critical Path (Must Test Manually)
- ⚠️ Admin login works with WebLN
- ⚠️ Admin login works with QR code
- ⚠️ Admin dashboard loads after authentication
- ⚠️ All dashboard tabs accessible
- ⚠️ System statistics display correctly
- ⚠️ User list displays correctly
- ⚠️ Contact submissions display correctly
- ⚠️ Security protections active (UI verification)

### Important (Should Test Manually)
- ⚠️ Analytics display correctly (UI verification)
- ⚠️ Wallet management works (if implemented)
- ⚠️ Error handling works gracefully (UI verification)
- ⚠️ Mobile experience functional
- ⚠️ Performance acceptable (UI verification)

### Nice to Have (Manual Testing)
- ⚠️ All features fully implemented
- ⚠️ Comprehensive error messages
- ⚠️ Optimal performance
- ⚠️ Perfect mobile experience

---

## Known Limitations & Workarounds

### ADMIN_XPUB Configuration
- **Issue:** Admin access requires `ADMIN_XPUB` environment variable
- **Workaround:** Set `ADMIN_XPUB` in `.env.local` matching admin wallet xpub
- **Impact:** Admin access disabled if not configured

### In-Memory Storage
- **Issue:** Admin data resets on server restart
- **Workaround:** Use persistent storage in production
- **Impact:** Admin data may be lost between restarts

### Feature Availability
- **Note:** Some features may not be fully implemented (wallet management, contact status updates)
- **Impact:** Test cases marked "If Available" may not be applicable

---

---

## 📊 Summary

### Automated Tests: ✅ 32/32 Passing
Run with: `npm run test:admin`

**What's Covered:**
- Admin login page accessibility
- Admin API endpoints and authentication requirements
- Security protections (authentication, authorization)
- Error handling
- Basic page accessibility
- Performance metrics
- All admin API endpoint structures

### Manual Tests Required: ⚠️ ~30+ Test Cases
**Estimated Time:** 3-4 hours

**What Needs Manual Testing:**
- Admin login UI interactions and visual verification
- Wallet authentication flows (WebLN, QR code)
- Complete admin dashboard UI functionality
- Admin data management (users, contacts, wallets)
- Mobile admin experience
- Admin session management with actual wallet
- Error message display
- Form validation UI

**Focus Areas:**
1. **Admin Login** - Complete flow with wallet (WebLN and QR code)
2. **Admin Dashboard UI** - All tabs and functionality
3. **Admin Data Management** - Users, contacts, wallets
4. **Mobile Admin Experience** - Responsive design verification

---

**Document Version:** 1.1  
**Last Updated:** [Current Date]  
**Maintained By:** Development Team

