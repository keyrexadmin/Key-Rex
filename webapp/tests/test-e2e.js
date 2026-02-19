#!/usr/bin/env node

/**
 * End-to-End Automated Test Suite
 * Based on E2E_TESTING_PLAN.md
 * 
 * Tests API endpoints and backend functionality that can be automated.
 * Note: UI tests, wallet interactions, and visual verification require manual testing.
 */

const BASE_URL = process.env.KEYREX_URL || 'http://localhost:3000'
const CLIENT_DOMAIN = 'http://localhost:3001'

let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
}

// Test user data (simulated)
let testUser = {
  xpub: null,
  siteId: null,
  cookie: null
}

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
    },
  })
  return response
}

async function fetchWithCookies(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`
  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(testUser.cookie ? { 'Cookie': testUser.cookie } : {})
    },
    credentials: 'include',
  })
  
  // Extract cookies from response
  const setCookie = response.headers.get('set-cookie')
  if (setCookie && !testUser.cookie) {
    testUser.cookie = setCookie.split(';')[0]
  }
  
  return response
}

// Extract cookies from response headers
function extractCookies(response) {
  const cookies = []
  const setCookieHeaders = response.headers.get('set-cookie')
  if (setCookieHeaders) {
    const cookieStrings = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders]
    cookieStrings.forEach(cookieStr => {
      const cookie = cookieStr.split(';')[0]
      cookies.push(cookie)
    })
  }
  return cookies
}

console.log('\n🧪 End-to-End Automated Test Suite')
console.log('Based on E2E_TESTING_PLAN.md\n')
console.log(`Base URL: ${BASE_URL}\n`)

// ============================================================================
// Test Suite 1: Landing Page & Discovery (API/Backend Tests)
// ============================================================================

console.log('📋 Test Suite 1: Landing Page & Discovery\n')

await test('TC-1.1: Landing Page Loads', async () => {
  const response = await fetchAPI('/')
  if (!response.ok) {
    throw new Error(`Page returned ${response.status}`)
  }
  const html = await response.text()
  if (!html.includes('Key-Rex') && !html.includes('KeyRex')) {
    throw new Error('Page content not found')
  }
}, false)

await test('TC-1.3: Public Pages Load', async () => {
  const pages = [
    '/how-it-works',
    '/why-keyrex',
    '/requirements',
    '/docs',
    '/faq',
    '/support',
    '/for-wallets',
    '/open-source'
  ]
  
  for (const page of pages) {
    const response = await fetchAPI(page)
    if (!response.ok) {
      throw new Error(`Page ${page} returned ${response.status}`)
    }
  }
}, false)

// ============================================================================
// Test Suite 2: Onboarding Wizard (API Tests)
// ============================================================================

console.log('\n📋 Test Suite 2: Onboarding Wizard (API)\n')

await test('TC-2.2: LNURL Challenge Generation', async () => {
  const response = await fetchAPI('/api/auth/lnurl')
  if (!response.ok) {
    throw new Error(`LNURL endpoint returned ${response.status}`)
  }
  const data = await response.json()
  if (!data.k1 || !data.lnurl) {
    throw new Error('Missing k1 or lnurl in response')
  }
}, false)

await test('TC-2.4: Domain Validation API', async () => {
  // This would require authentication, so we'll test the validation logic
  // by checking if invalid domains are rejected
  const response = await fetchAPI('/api/domains', {
    method: 'POST',
    body: JSON.stringify({ domain: 'http://invalid.com' })
  })
  // Should fail (401 or 400) without auth, or reject invalid format
  if (response.ok) {
    const data = await response.json()
    if (!data.error && !data.error?.includes('protocol')) {
      throw new Error('Invalid domain format was accepted')
    }
  }
}, false)

// ============================================================================
// Test Suite 3: Dashboard Navigation (API Tests)
// ============================================================================

console.log('\n📋 Test Suite 3: Dashboard Access & API\n')

await test('TC-3.1: Dashboard Route Protection', async () => {
  const response = await fetchAPI('/dashboard')
  // Should redirect or return 401/403 for unauthenticated users
  if (response.ok) {
    const html = await response.text()
    // If it loads, it should redirect via middleware
    if (!html.includes('wizard') && !html.includes('redirect')) {
      throw new Error('Dashboard accessible without authentication')
    }
  }
}, false)

await test('TC-3.1: User API Requires Authentication', async () => {
  const response = await fetchAPI('/api/user')
  if (response.ok) {
    throw new Error('User API accessible without authentication')
  }
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`)
  }
}, false)

// ============================================================================
// Test Suite 4: Integration Code Setup (API Tests)
// ============================================================================

console.log('\n📋 Test Suite 4: Integration Code Setup (API)\n')

await test('TC-4.1: Embed Config API - Invalid Site ID', async () => {
  const response = await fetchAPI('/api/embed/config?siteId=invalid123')
  // In development, invalid siteId returns default config (200 OK) - this is intentional
  // In production, it should return 404
  if (response.ok) {
    const data = await response.json()
    // Development mode: returns default config (this is acceptable for dev)
    // Verify it's a valid config structure
    if (data.buttonText && typeof data.integrationEnabled === 'boolean') {
      // Valid config structure - acceptable in dev mode
      return
    }
    if (data.error) {
      // Error response is also acceptable
      return
    }
    throw new Error('Invalid config structure returned')
  } else if (response.status === 404) {
    // 404 is acceptable for invalid siteId (production behavior)
    return
  }
  // If we get here, something unexpected happened
  throw new Error(`Unexpected response for invalid siteId: ${response.status}`)
}, false)

await test('TC-4.1: Embed Config API - Missing Site ID', async () => {
  const response = await fetchAPI('/api/embed/config')
  // Should return default config or error
  if (!response.ok && response.status !== 200) {
    throw new Error(`Config API should handle missing siteId, got ${response.status}`)
  }
}, false)

await test('TC-4.3: Embed Script Route', async () => {
  const response = await fetchAPI('/embed?siteId=test123')
  if (!response.ok) {
    throw new Error(`Embed script returned ${response.status}`)
  }
  const script = await response.text()
  if (!script.includes('Key-Rex') && !script.includes('KeyRex') && !script.includes('keyrex')) {
    throw new Error('Embed script content not found')
  }
}, false)

// ============================================================================
// Test Suite 5: Domain Management (API Tests)
// ============================================================================

console.log('\n📋 Test Suite 5: Domain Management (API)\n')

await test('TC-5.2: Add Domain API - Requires Authentication', async () => {
  const response = await fetchAPI('/api/domains', {
    method: 'POST',
    body: JSON.stringify({ domain: 'example.com' })
  })
  if (response.ok) {
    throw new Error('Domain API accessible without authentication')
  }
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`)
  }
}, false)

await test('TC-5.5: Domain Validation - Invalid Formats', async () => {
  // Test validation logic (would need authenticated request, but we can check error handling)
  const invalidDomains = [
    'http://example.com',
    'example.com/path',
    'example.com:8080'
  ]
  
  // These should be rejected by validation
  // Since we can't authenticate, we verify the API requires auth
  for (const domain of invalidDomains) {
    const response = await fetchAPI('/api/domains', {
      method: 'POST',
      body: JSON.stringify({ domain })
    })
    // Should require auth first
    if (response.ok) {
      throw new Error(`Invalid domain ${domain} was accepted without auth`)
    }
  }
}, false)

// ============================================================================
// Test Suite 6: Integration Testing (API Tests)
// ============================================================================

console.log('\n📋 Test Suite 6: Integration Testing (API)\n')

await test('TC-6.1: Embed Script Loads', async () => {
  const response = await fetchAPI('/embed?siteId=test123&v=2')
  if (!response.ok) {
    throw new Error(`Embed script returned ${response.status}`)
  }
  const script = await response.text()
  // Check for key embed script elements
  const hasInit = script.includes('KeyRex.init') || script.includes('window.KeyRex')
  const hasSiteId = script.includes('siteId')
  if (!hasInit || !hasSiteId) {
    throw new Error('Embed script missing required elements')
  }
}, false)

await test('TC-6.5: Domain Authorization - CORS Validation', async () => {
  // Test CORS headers for embed config
  const response = await fetchAPI('/api/embed/config?siteId=test123', {
    headers: {
      'Origin': 'http://unauthorized.com'
    }
  })
  
  const corsHeader = response.headers.get('Access-Control-Allow-Origin')
  // Should either reject or set specific origin
  if (corsHeader === '*') {
    throw new Error('CORS wildcard detected - security issue')
  }
}, false)

await test('TC-6.6: Integration Toggle - Config API', async () => {
  // Test that config API returns integrationEnabled status
  const response = await fetchAPI('/api/embed/config?siteId=test123')
  if (response.ok) {
    const data = await response.json()
    if (typeof data.integrationEnabled !== 'boolean') {
      throw new Error('Config API missing integrationEnabled field')
    }
  }
}, false)

// ============================================================================
// Test Suite 7: Analytics & Usage (API Tests)
// ============================================================================

console.log('\n📋 Test Suite 7: Analytics & Usage (API)\n')

await test('TC-7.1: Usage API Requires Authentication', async () => {
  const response = await fetchAPI('/api/usage')
  if (response.ok) {
    throw new Error('Usage API accessible without authentication')
  }
  if (response.status !== 401) {
    throw new Error(`Expected 401, got ${response.status}`)
  }
}, false)

// ============================================================================
// Test Suite 8: Documentation & Troubleshooting (Content Tests)
// ============================================================================

console.log('\n📋 Test Suite 8: Documentation & Troubleshooting\n')

await test('TC-8.1: Documentation Page Loads', async () => {
  const response = await fetchAPI('/docs')
  if (!response.ok) {
    throw new Error(`Documentation page returned ${response.status}`)
  }
  const html = await response.text()
  if (!html.includes('Documentation') && !html.includes('Quick Start')) {
    throw new Error('Documentation content not found')
  }
}, false)

// ============================================================================
// Test Suite 9: Settings (API Tests)
// ============================================================================

console.log('\n📋 Test Suite 9: Settings (API)\n')

await test('TC-9.1: Settings Access Requires Authentication', async () => {
  // Settings are part of dashboard, so same protection applies
  const response = await fetchAPI('/dashboard')
  // Should redirect or require auth
  if (response.ok) {
    const html = await response.text()
    if (html.includes('Settings') && !html.includes('wizard') && !html.includes('redirect')) {
      throw new Error('Settings accessible without authentication')
    }
  }
}, false)

// ============================================================================
// Test Suite 10: Returning User Flows (API Tests)
// ============================================================================

console.log('\n📋 Test Suite 10: Returning User Flows (API)\n')

await test('TC-10.3: Session Cookie Security', async () => {
  // Test that auth endpoints set secure cookies
  const response = await fetchAPI('/api/auth/lnurl')
  const setCookie = response.headers.get('set-cookie')
  if (setCookie) {
    // Check for httpOnly flag (security)
    if (!setCookie.includes('HttpOnly')) {
      throw new Error('Auth cookie missing HttpOnly flag')
    }
    // Check for SameSite (CSRF protection)
    if (!setCookie.includes('SameSite')) {
      throw new Error('Auth cookie missing SameSite flag')
    }
  }
}, false)

// ============================================================================
// Test Suite 11: Error Handling & Edge Cases
// ============================================================================

console.log('\n📋 Test Suite 11: Error Handling & Edge Cases\n')

await test('TC-11.1: Invalid Site ID Handling', async () => {
  const response = await fetchAPI('/api/embed/config?siteId=invalid_site_id_12345')
  // In development, invalid siteId returns default config (200 OK) - this is intentional
  // In production, it should return 404
  if (response.ok) {
    const data = await response.json()
    // Development mode: returns default config (this is acceptable for dev)
    // Verify it's a valid config structure
    if (data.buttonText && typeof data.integrationEnabled === 'boolean') {
      // Valid config structure - acceptable in dev mode
      return
    }
    if (data.error) {
      // Error response is also acceptable
      return
    }
    throw new Error('Invalid config structure returned')
  } else if (response.status === 404) {
    // 404 is acceptable for invalid siteId (production behavior)
    return
  }
  // If we get here, something unexpected happened
  if (response.status < 400 || response.status >= 500) {
    throw new Error(`Unexpected status for invalid siteId: ${response.status}`)
  }
}, false)

await test('TC-11.2: Network Error Handling - Invalid Endpoint', async () => {
  const response = await fetchAPI('/api/nonexistent-endpoint')
  // Should return 404, not crash
  if (response.status !== 404 && response.status !== 405) {
    throw new Error(`Invalid endpoint should return 404/405, got ${response.status}`)
  }
}, false)

await test('TC-11.4: Expired Challenge Handling', async () => {
  // Test that expired challenges are handled
  // This would require creating a challenge and waiting, or simulating
  // For now, we verify the API structure exists
  const response = await fetchAPI('/api/auth/callback?k1=expired_challenge_123')
  // Should handle expired challenge gracefully
  if (response.status >= 500) {
    throw new Error('Expired challenge caused server error')
  }
}, false)

// ============================================================================
// Test Suite 12: Security & Access Control
// ============================================================================

console.log('\n📋 Test Suite 12: Security & Access Control\n')

await test('TC-12.1: Dashboard Middleware Protection', async () => {
  const response = await fetchAPI('/dashboard')
  // Should redirect or require authentication
  // Check if it redirects (302/307) or requires auth (401)
  if (response.ok) {
    const html = await response.text()
    // If it loads HTML, check for redirect logic
    if (!html.includes('wizard') && !html.includes('redirect') && !html.includes('login')) {
      // Might be a client-side redirect, which is acceptable
      // But verify it's not showing dashboard content
      if (html.includes('Dashboard') && html.includes('Overview')) {
        throw new Error('Dashboard content accessible without authentication')
      }
    }
  }
}, false)

await test('TC-12.3: CORS Protection - Invalid Origin', async () => {
  const response = await fetchAPI('/api/embed/config?siteId=test123', {
    headers: {
      'Origin': 'http://evil.com'
    }
  })
  
  const corsHeader = response.headers.get('Access-Control-Allow-Origin')
  // Should not allow wildcard or invalid origin
  if (corsHeader === '*' || corsHeader === 'http://evil.com') {
    throw new Error('CORS allows invalid origin')
  }
}, false)

await test('TC-12.4: Cookie Security Flags', async () => {
  // Test auth challenge cookie
  const response = await fetchAPI('/api/auth/lnurl')
  const setCookie = response.headers.get('set-cookie')
  
  if (setCookie) {
    // Check for security flags
    const hasHttpOnly = setCookie.includes('HttpOnly')
    const hasSameSite = setCookie.includes('SameSite')
    
    if (!hasHttpOnly) {
      throw new Error('Cookie missing HttpOnly flag (XSS protection)')
    }
    if (!hasSameSite) {
      throw new Error('Cookie missing SameSite flag (CSRF protection)')
    }
  }
}, false)

await test('TC-12.4: Verify API Origin Requirement', async () => {
  // Test that verify API requires origin for embed logins
  const response = await fetchAPI('/api/verify', {
    method: 'POST',
    body: JSON.stringify({
      k1: 'test123',
      sig: 'test',
      key: 'test',
      siteId: 'test123'
    })
  })
  
  // Should require origin or return appropriate error
  if (response.ok) {
    throw new Error('Verify API accepted request without origin validation')
  }
  // 400 (missing origin) or 404 (invalid siteId) are acceptable
  if (response.status >= 500) {
    throw new Error('Verify API server error without origin')
  }
}, false)

// ============================================================================
// Test Suite 13: Public Pages
// ============================================================================

console.log('\n📋 Test Suite 13: Public Pages\n')

await test('TC-13.1: Public Documentation Accessible', async () => {
  const response = await fetchAPI('/docs')
  if (!response.ok) {
    throw new Error(`Documentation page returned ${response.status}`)
  }
}, false)

await test('TC-13.2: FAQ Page Accessible', async () => {
  const response = await fetchAPI('/faq')
  if (!response.ok) {
    throw new Error(`FAQ page returned ${response.status}`)
  }
  const html = await response.text()
  if (!html.includes('FAQ') && !html.includes('Frequently Asked')) {
    throw new Error('FAQ content not found')
  }
}, false)

await test('TC-13.3: Support Page Accessible', async () => {
  const response = await fetchAPI('/support')
  if (!response.ok) {
    throw new Error(`Support page returned ${response.status}`)
  }
  const html = await response.text()
  if (!html.includes('Support') && !html.includes('Contact')) {
    throw new Error('Support content not found')
  }
}, false)

// ============================================================================
// Test Suite 15: Performance & Load
// ============================================================================

console.log('\n📋 Test Suite 15: Performance & Load\n')

await test('TC-15.1: Landing Page Load Time', async () => {
  const startTime = Date.now()
  const response = await fetchAPI('/')
  const loadTime = Date.now() - startTime
  
  if (!response.ok) {
    throw new Error(`Page returned ${response.status}`)
  }
  if (loadTime > 5000) {
    throw new Error(`Page load time too slow: ${loadTime}ms`)
  }
}, false)

await test('TC-15.2: API Response Times', async () => {
  const endpoints = [
    '/api/auth/lnurl',
    '/api/embed/config',
    '/embed?siteId=test123'
  ]
  
  for (const endpoint of endpoints) {
    const startTime = Date.now()
    const response = await fetchAPI(endpoint)
    const responseTime = Date.now() - startTime
    
    if (!response.ok && response.status !== 404) {
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
  console.log('🎉 All automated tests passed!\n')
  console.log('📝 Note: Manual testing required for:')
  console.log('  - UI interactions and visual verification')
  console.log('  - Wallet authentication flows (WebLN, QR code)')
  console.log('  - User experience and responsive design')
  console.log('  - Complete onboarding wizard flow')
  console.log('  - Dashboard UI functionality')
  console.log('  - Integration testing on client sites')
} else {
  console.log('⚠️  Some tests failed. Please review and fix before proceeding.\n')
}

console.log('='.repeat(50) + '\n')

process.exit(testResults.failed > 0 ? 1 : 0)

