import { NextRequest, NextResponse } from 'next/server'
import { getUserByXpub, isDomainAllowed, normalizeDomain } from '@/lib/storage'
import { validateDomain } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const xpub = request.cookies.get('user_xpub')?.value
    
    if (!xpub) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = getUserByXpub(xpub)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { domain } = body

    if (!domain || !domain.trim()) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    const normalized = normalizeDomain(domain.trim())
    const userDomains = user.allowedDomains || []

    // Check 1: Domain is configured
    const domainConfigured = isDomainAllowed(normalized, userDomains)

    // Check 2: Integration is enabled
    const integrationEnabled = user.integrationEnabled !== false

    // Check 3: Site ID is valid
    const siteIdValid = !!user.siteId && user.siteId.length > 0

    // Check 4: Domain format is valid
    const domainValidation = validateDomain(normalized)
    const domainFormatValid = domainValidation.valid

    const checks = {
      domainConfigured: {
        passed: domainConfigured,
        message: domainConfigured
          ? `Domain "${normalized}" is configured in your dashboard`
          : `Domain "${normalized}" is NOT in your allowed domains list. Add it in the Domains tab.`
      },
      integrationEnabled: {
        passed: integrationEnabled,
        message: integrationEnabled
          ? 'Integration is enabled'
          : 'Integration is disabled. Enable it in the "My Login Code" tab.'
      },
      siteIdValid: {
        passed: siteIdValid,
        message: siteIdValid
          ? 'Site ID is valid'
          : 'Site ID is missing or invalid'
      },
      domainFormatValid: {
        passed: domainFormatValid,
        message: domainFormatValid
          ? 'Domain format is valid'
          : domainValidation.error || 'Domain format is invalid. Use format like "example.com" or "login.yoursite.com"'
      }
    }

    // Determine overall status
    const allPassed = Object.values(checks).every(c => c.passed)
    const anyPassed = Object.values(checks).some(c => c.passed)
    const overall = allPassed ? 'pass' : anyPassed ? 'partial' : 'fail'

    // Additional guidance
    let guidance: string[] = []
    if (!domainConfigured) {
      guidance.push(`Add "${normalized}" to your allowed domains in the Domains tab`)
    }
    if (!integrationEnabled) {
      guidance.push('Enable integration in the "My Login Code" tab')
    }
    if (domainConfigured && integrationEnabled && siteIdValid) {
      guidance.push('Verify the integration code is pasted correctly on your website')
      guidance.push('Check browser console (F12) for any JavaScript errors')
      guidance.push('Test the authentication button on your actual website')
    }

    return NextResponse.json({
      domain: normalized,
      checks,
      overall,
      guidance,
      siteId: user.siteId,
    })
  } catch (error) {
    console.error('Error testing domain:', error)
    return NextResponse.json({ error: 'Failed to test domain' }, { status: 500 })
  }
}

