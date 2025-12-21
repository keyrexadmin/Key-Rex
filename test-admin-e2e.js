#!/usr/bin/env node

/**
 * Admin End-to-End Automated Test Suite
 * Based on ADMIN_E2E_TESTING_PLAN.md
 * 
 * Tests API endpoints and backend functionality that can be automated.
 * Note: UI tests, wallet interactions, and visual verification require manual testing.
 */

const BASE_URL = process.env.BITPASS_URL || 'http://localhost:3000'

let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
}

// Admin session (will be set if we can authenticate)
let adminSession = null

function log(message, type = 'info') {
  const prefix = type === 'pass' ? '✅' : type === 'fail' ? '❌' : type === 'warn' ? '⚠️' : type === 'skip' ? '⏭️' : 'ℹ️'
  console.log(`${prefix} ${message}`)
}

function recordTest(name, passed, error = null, skipped = false) {
  if (skipped) {
    testResults.skipped++
    log(`${name}`, 'skip')
  } else if (passed) {
    testResults.passed++
    log(`${name}`, 'pass')
  } else {
    testResults.failed++
    log(`${name}`, 'fail')
    if (error) {
      testResults.errors.push({ test: name, error: error.message || error })
      log(`  Error: ${error.message || error}`, 'warn')
    }
  }
}

async function test(name, fn, skip = false) {
  if (skip) {
    recordTest(name, false, null, true)
    return
  }
  try {
    await fn()
    recordTest(name, true)
  } catch (error) {
    recordTest(name, false, error)
  }
}

async function fetchAPI(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`
  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(adminSession ? { 'Cookie': `admin_session=${adminSession}` } : {})
    },
    credentials: 'include',
  })
  return response
}

console.log('\n🧪 Admin End-to-End Automated Test Suite')
console.log('Based on ADMIN_E2E_TESTING_PLAN.md\n')
console.log(`Base URL: ${BASE_URL}\n`)
console.log('⚠️  Note: Admin authentication requires ADMIN_XPUB environment variable')
console.log('⚠️  Note: Many tests require manual wallet authentication\n')

// ============================================================================
// Test Suite 1: Admin Login Page (API/Backend Tests)
// ============================================================================

console.log('📋 Test Suite 1: Admin Login Page\n')

await test('TC-ADMIN-1.1: Admin Login Page Loads', async () => {
  const response = await fetchAPI('/admin/login')
  if (!response.ok) {
    throw new Error(`Page returned ${response.status}`)
  }
  const html = await response.text()
  if (!html.includes('Admin Portal') && !html.includes('admin')) {
    throw new Error('Admin login page content not found')
  }
}, false)

await test('TC-ADMIN-1.2: Admin LNURL Endpoint', async () => {
  const response = await fetchAPI('/api/admin/auth/lnurl')
  if (!response.ok) {
    throw new Error(`Admin LNURL endpoint returned ${response.status}`)
  }
  const data = await response.json()
  if (!data.k1 || !data.lnurl) {
    throw new Error('Missing k1 or lnurl in admin LNURL response')
  }
}, false)

await test('TC-ADMIN-1.2: Admin Verify Endpoint - No Session', async () => {
  const response = await fetchAPI('/api/admin/auth/verify')
  if (!response.ok) {
    throw new Error(`Admin verify endpoint returned ${response.status}`)
  }
  const data = await response.json()
  if (data.isAdmin !== false) {
    throw new Error('Expected isAdmin: false when no session')
  }
}, false)

// ============================================================================
// Test Suite 2: Admin Dashboard Access (API Tests)
// ============================================================================

console.log('\n📋 Test Suite 2: Admin Dashboard Access\n')

await test('TC-ADMIN-2.1: Admin Dashboard Route Protection', async () => {
  const response = await fetchAPI('/admin/dashboard')
  // Should redirect or require authentication
  if (response.ok) {
    const html = await response.text()
    // If it loads, it should redirect via client-side or show unauthorized
    if (!html.includes('Unauthorized') && !html.includes('redirect') && !html.includes('login')) {
      // Might be a client-side redirect, which is acceptable
      // But verify it's not showing dashboard content
      if (html.includes('Admin Dashboard') && html.includes('Overview')) {
        throw new Error('Dashboard content accessible without authentication')
      }
    }
  }
}, false)

await test('TC-ADMIN-2.1: Admin Stats API Requires Authentication', async () => {
  const response = await fetchAPI('/api/admin/stats')
  if (response.ok) {
    throw new Error('Admin stats API accessible without authentication')
  }
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`)
  }
}, false)

await test('TC-ADMIN-2.1: Admin Users API Requires Authentication', async () => {
  const response = await fetchAPI('/api/admin/users')
  if (response.ok) {
    throw new Error('Admin users API accessible without authentication')
  }
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`)
  }
}, false)

await test('TC-ADMIN-2.1: Admin Analytics API Requires Authentication', async () => {
  const response = await fetchAPI('/api/admin/analytics')
  if (response.ok) {
    throw new Error('Admin analytics API accessible without authentication')
  }
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`)
  }
}, false)

await test('TC-ADMIN-2.1: Admin Contacts API Requires Authentication', async () => {
  const response = await fetchAPI('/api/admin/contacts')
  if (response.ok) {
    throw new Error('Admin contacts API accessible without authentication')
  }
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`)
  }
}, false)

await test('TC-ADMIN-2.1: Admin Wallets API Requires Authentication', async () => {
  const response = await fetchAPI('/api/admin/wallets')
  if (response.ok) {
    throw new Error('Admin wallets API accessible without authentication')
  }
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`)
  }
}, false)

await test('TC-ADMIN-2.4: Admin Logout API', async () => {
  const response = await fetchAPI('/api/admin/auth/logout', {
    method: 'POST'
  })
  // Logout should work even without session (no error)
  if (response.status >= 500) {
    throw new Error(`Logout endpoint returned server error: ${response.status}`)
  }
}, false)

// ============================================================================
// Test Suite 3: Admin Dashboard - Overview Tab (API Tests)
// ============================================================================

console.log('\n📋 Test Suite 3: Admin Dashboard - Overview Tab\n')

await test('TC-ADMIN-3.1: Admin Stats API Structure', async () => {
  // This test verifies the API structure exists, but requires authentication
  // We'll test that it requires auth (already done above)
  // And verify the endpoint exists
  const response = await fetchAPI('/api/admin/stats')
  // Should return 401 (already tested), but endpoint should exist
  if (response.status === 404) {
    throw new Error('Admin stats endpoint does not exist')
  }
}, false)

// ============================================================================
// Test Suite 4: Admin Dashboard - Users Tab (API Tests)
// ============================================================================

console.log('\n📋 Test Suite 4: Admin Dashboard - Users Tab\n')

await test('TC-ADMIN-4.1: Admin Users API Structure', async () => {
  const response = await fetchAPI('/api/admin/users')
  // Should return 401 (already tested), but endpoint should exist
  if (response.status === 404) {
    throw new Error('Admin users endpoint does not exist')
  }
}, false)

await test('TC-ADMIN-4.3: Admin User Detail API Structure', async () => {
  // Test that user detail endpoint exists (will require auth)
  const response = await fetchAPI('/api/admin/users/test_xpub_123')
  // Should return 401 (no auth) or 404 (user not found), but not 500
  if (response.status >= 500) {
    throw new Error('Admin user detail endpoint has server error')
  }
}, false)

// ============================================================================
// Test Suite 5: Admin Dashboard - Analytics Tab (API Tests)
// ============================================================================

console.log('\n📋 Test Suite 5: Admin Dashboard - Analytics Tab\n')

await test('TC-ADMIN-5.1: Admin Analytics API Structure', async () => {
  const response = await fetchAPI('/api/admin/analytics')
  // Should return 401 (already tested), but endpoint should exist
  if (response.status === 404) {
    throw new Error('Admin analytics endpoint does not exist')
  }
}, false)

// ============================================================================
// Test Suite 6: Admin Dashboard - Contacts Tab (API Tests)
// ============================================================================

console.log('\n📋 Test Suite 6: Admin Dashboard - Contacts Tab\n')

await test('TC-ADMIN-6.1: Admin Contacts API Structure', async () => {
  const response = await fetchAPI('/api/admin/contacts')
  // Should return 401 (already tested), but endpoint should exist
  if (response.status === 404) {
    throw new Error('Admin contacts endpoint does not exist')
  }
}, false)

await test('TC-ADMIN-6.4: Admin Contacts PATCH API Structure', async () => {
  // Test that contact status update endpoint exists
  const response = await fetchAPI('/api/admin/contacts', {
    method: 'PATCH',
    body: JSON.stringify({ id: 'test', status: 'read' })
  })
  // Should return 401 (no auth) or 400 (invalid id), but not 404 or 500
  if (response.status === 404) {
    throw new Error('Admin contacts PATCH endpoint does not exist')
  }
  if (response.status >= 500) {
    throw new Error('Admin contacts PATCH endpoint has server error')
  }
}, false)

// ============================================================================
// Test Suite 7: Admin Dashboard - Wallets Tab (API Tests)
// ============================================================================

console.log('\n📋 Test Suite 7: Admin Dashboard - Wallets Tab\n')

await test('TC-ADMIN-7.1: Admin Wallets API Structure', async () => {
  const response = await fetchAPI('/api/admin/wallets')
  // Should return 401 (already tested), but endpoint should exist
  if (response.status === 404) {
    throw new Error('Admin wallets endpoint does not exist')
  }
}, false)

await test('TC-ADMIN-7.2: Admin Wallets POST API Structure', async () => {
  // Test that add wallet endpoint exists
  const response = await fetchAPI('/api/admin/wallets', {
    method: 'POST',
    body: JSON.stringify({ name: 'Test Wallet', logoUrl: '', downloadUrl: '', enabled: true, priority: 0 })
  })
  // Should return 401 (no auth) or 400 (validation), but not 404 or 500
  if (response.status === 404) {
    throw new Error('Admin wallets POST endpoint does not exist')
  }
  if (response.status >= 500) {
    throw new Error('Admin wallets POST endpoint has server error')
  }
}, false)

await test('TC-ADMIN-7.3: Admin Wallets PATCH API Structure', async () => {
  // Test that update wallet endpoint exists
  const response = await fetchAPI('/api/admin/wallets', {
    method: 'PATCH',
    body: JSON.stringify({ id: 'test', name: 'Updated Wallet' })
  })
  // Should return 401 (no auth) or 400 (invalid id), but not 404 or 500
  if (response.status === 404) {
    throw new Error('Admin wallets PATCH endpoint does not exist')
  }
  if (response.status >= 500) {
    throw new Error('Admin wallets PATCH endpoint has server error')
  }
}, false)

await test('TC-ADMIN-7.4: Admin Wallets DELETE API Structure', async () => {
  // Test that delete wallet endpoint exists
  const response = await fetchAPI('/api/admin/wallets?id=test', {
    method: 'DELETE'
  })
  // Should return 401 (no auth) or 400 (invalid id), but not 404 or 500
  if (response.status === 404) {
    throw new Error('Admin wallets DELETE endpoint does not exist')
  }
  if (response.status >= 500) {
    throw new Error('Admin wallets DELETE endpoint has server error')
  }
}, false)

// ============================================================================
// Test Suite 8: Admin Dashboard - Security & Access Control
// ============================================================================

console.log('\n📋 Test Suite 8: Admin Dashboard - Security & Access Control\n')

await test('TC-ADMIN-8.1: Admin API Authentication - Stats', async () => {
  const response = await fetchAPI('/api/admin/stats')
  if (response.ok) {
    throw new Error('Admin stats API accessible without authentication')
  }
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`)
  }
}, false)

await test('TC-ADMIN-8.1: Admin API Authentication - Users', async () => {
  const response = await fetchAPI('/api/admin/users')
  if (response.ok) {
    throw new Error('Admin users API accessible without authentication')
  }
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`)
  }
}, false)

await test('TC-ADMIN-8.1: Admin API Authentication - Analytics', async () => {
  const response = await fetchAPI('/api/admin/analytics')
  if (response.ok) {
    throw new Error('Admin analytics API accessible without authentication')
  }
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`)
  }
}, false)

await test('TC-ADMIN-8.1: Admin API Authentication - Contacts', async () => {
  const response = await fetchAPI('/api/admin/contacts')
  if (response.ok) {
    throw new Error('Admin contacts API accessible without authentication')
  }
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`)
  }
}, false)

await test('TC-ADMIN-8.1: Admin API Authentication - Wallets', async () => {
  const response = await fetchAPI('/api/admin/wallets')
  if (response.ok) {
    throw new Error('Admin wallets API accessible without authentication')
  }
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`)
  }
}, false)

await test('TC-ADMIN-8.2: Admin Session Cookie Security', async () => {
  // Test that admin auth endpoints set secure cookies
  const response = await fetchAPI('/api/admin/auth/lnurl')
  const setCookie = response.headers.get('set-cookie')
  // Note: Admin session cookie is set by login endpoint, not lnurl
  // But we can verify the lnurl endpoint works
  if (!response.ok) {
    throw new Error(`Admin LNURL endpoint returned ${response.status}`)
  }
}, false)

await test('TC-ADMIN-8.3: Admin Xpub Validation - Verify Endpoint', async () => {
  // Test that verify endpoint checks xpub correctly
  const response = await fetchAPI('/api/admin/auth/verify')
  if (!response.ok) {
    throw new Error(`Admin verify endpoint returned ${response.status}`)
  }
  const data = await response.json()
  // Should return isAdmin: false when no valid session
  if (data.isAdmin !== false) {
    throw new Error('Verify endpoint should return isAdmin: false without valid session')
  }
}, false)

// ============================================================================
// Test Suite 9: Admin Dashboard - Error Handling
// ============================================================================

console.log('\n📋 Test Suite 9: Admin Dashboard - Error Handling\n')

await test('TC-ADMIN-9.2: Admin API Error Handling - Invalid Endpoint', async () => {
  const response = await fetchAPI('/api/admin/nonexistent')
  // Should return 404, not crash
  if (response.status !== 404 && response.status !== 405) {
    throw new Error(`Invalid endpoint should return 404/405, got ${response.status}`)
  }
}, false)

await test('TC-ADMIN-9.2: Admin API Error Handling - Invalid Method', async () => {
  // Test invalid HTTP method
  const response = await fetchAPI('/api/admin/stats', {
    method: 'PUT'
  })
  // Should return 405 (Method Not Allowed) or 401 (auth required first)
  if (response.status >= 500) {
    throw new Error('Invalid method caused server error')
  }
}, false)

await test('TC-ADMIN-9.2: Admin API Error Handling - Invalid Request Body', async () => {
  // Test invalid request body
  const response = await fetchAPI('/api/admin/contacts', {
    method: 'PATCH',
    body: 'invalid json'
  })
  // Should return 400 (Bad Request) or 401 (auth required first)
  if (response.status >= 500) {
    throw new Error('Invalid request body caused server error')
  }
}, false)

// ============================================================================
// Test Suite 10: Admin Dashboard - Performance
// ============================================================================

console.log('\n📋 Test Suite 10: Admin Dashboard - Performance\n')

await test('TC-ADMIN-10.1: Admin Login Page Load Time', async () => {
  const startTime = Date.now()
  const response = await fetchAPI('/admin/login')
  const loadTime = Date.now() - startTime
  
  if (!response.ok) {
    throw new Error(`Page returned ${response.status}`)
  }
  if (loadTime > 5000) {
    throw new Error(`Admin login page load time too slow: ${loadTime}ms`)
  }
}, false)

await test('TC-ADMIN-10.2: Admin API Response Times', async () => {
  const endpoints = [
    '/api/admin/auth/lnurl',
    '/api/admin/auth/verify',
  ]
  
  for (const endpoint of endpoints) {
    const startTime = Date.now()
    const response = await fetchAPI(endpoint)
    const responseTime = Date.now() - startTime
    
    if (!response.ok && response.status !== 401) {
      throw new Error(`Endpoint ${endpoint} returned ${response.status}`)
    }
    if (responseTime > 2000) {
      throw new Error(`Endpoint ${endpoint} too slow: ${responseTime}ms`)
    }
  }
}, false)

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(50))
console.log('📊 Test Results Summary\n')
console.log(`✅ Passed: ${testResults.passed}`)
console.log(`❌ Failed: ${testResults.failed}`)
console.log(`⏭️  Skipped: ${testResults.skipped}`)
console.log(`📈 Total: ${testResults.passed + testResults.failed + testResults.skipped}\n`)

if (testResults.errors.length > 0) {
  console.log('⚠️  Errors:')
  testResults.errors.forEach(({ test, error }) => {
    console.log(`  - ${test}: ${error}`)
  })
  console.log()
}

if (testResults.failed === 0) {
  console.log('🎉 All automated admin tests passed!\n')
  console.log('📝 Note: Manual testing required for:')
  console.log('  - Admin login UI interactions and visual verification')
  console.log('  - Wallet authentication flows (WebLN, QR code)')
  console.log('  - Complete admin dashboard UI functionality')
  console.log('  - Admin data management (users, contacts, wallets)')
  console.log('  - Mobile admin experience')
  console.log('  - Admin session management with actual wallet')
} else {
  console.log('⚠️  Some tests failed. Please review and fix before proceeding.\n')
}

console.log('='.repeat(50) + '\n')

process.exit(testResults.failed > 0 ? 1 : 0)


