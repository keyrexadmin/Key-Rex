'use client'

import { useState } from 'react'
import Card from './Card'
import { useToast } from './ToastContainer'

interface DomainTestResult {
  domain: string
  checks: {
    domainConfigured: { passed: boolean; message: string }
    scriptLoads: { passed: boolean; message: string }
    corsConfigured: { passed: boolean; message: string }
    integrationEnabled: { passed: boolean; message: string }
  }
  overall: 'pass' | 'fail' | 'partial' | 'pending'
}

interface DomainTesterProps {
  userSiteId: string
  userDomains: string[]
  integrationEnabled: boolean
}

export default function DomainTester({ userSiteId, userDomains, integrationEnabled }: DomainTesterProps) {
  const toast = useToast()
  const [testDomain, setTestDomain] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<DomainTestResult | null>(null)

  const normalizeDomain = (domain: string): string => {
    return domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '').split(':')[0]
  }

  const handleTest = async () => {
    if (!testDomain.trim()) {
      toast.showError('Please enter a domain to test')
      return
    }

    setTesting(true)
    setResult(null)

    try {
      const res = await fetch('/api/domain/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ domain: testDomain.trim() }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to test domain')
      }

      const data = await res.json()
      const normalized = data.domain

      // Map API response to component format
      const checks = {
        domainConfigured: data.checks.domainConfigured,
        scriptLoads: {
          passed: data.checks.domainConfigured.passed && data.checks.integrationEnabled.passed,
          message: data.checks.domainConfigured.passed && data.checks.integrationEnabled.passed
            ? 'Domain is configured and integration is enabled - script should load correctly'
            : !data.checks.domainConfigured.passed
            ? 'Domain not configured - script will not load'
            : 'Integration is disabled - script will not work'
        },
        corsConfigured: {
          passed: data.checks.domainConfigured.passed,
          message: data.checks.domainConfigured.passed
            ? 'Domain is authorized - CORS is properly configured'
            : 'Domain not authorized - CORS requests will be blocked'
        },
        integrationEnabled: data.checks.integrationEnabled
      }

      const testResult: DomainTestResult = {
        domain: normalized,
        checks,
        overall: data.overall
      }

      setResult(testResult)

      if (data.overall === 'pass') {
        toast.showSuccess('All domain checks passed! Your integration should work on this domain.')
      } else if (data.overall === 'partial') {
        toast.showWarning('Some checks failed. Review the results below.')
      } else {
        toast.showError('Domain test failed. Fix the issues below.')
      }
    } catch (error: any) {
      console.error('Error testing domain:', error)
      toast.showError(error.message || 'Failed to test domain. Please try again.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold text-white mb-4">Domain Integration Tester</h3>
      <p className="text-white/300 text-sm mb-4">
        Test if a specific domain is properly configured and ready for BitPass authentication.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={testDomain}
          onChange={(e) => setTestDomain(e.target.value)}
          placeholder="example.com or login.yoursite.com"
          className="flex-1 px-4 py-2 border-2 border-orange-500/40 rounded-lg text-sm text-white bg-dark-900/80 focus:outline-none focus:border-orange-500"
          onKeyPress={(e) => e.key === 'Enter' && !testing && handleTest()}
          disabled={testing}
        />
        <button
          onClick={handleTest}
          disabled={testing || !testDomain.trim()}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-2 px-6 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {testing ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Testing...
            </>
          ) : (
            'Test Domain'
          )}
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          <div className={`p-4 rounded-lg border-2 ${
            result.overall === 'pass' 
              ? 'bg-green-500/10 border-green-500/30'
              : result.overall === 'partial'
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">
                {result.overall === 'pass' ? '✅' : result.overall === 'partial' ? '⚠️' : '❌'}
              </span>
              <h4 className="text-lg font-semibold text-white">
                Test Results for: <span className="font-mono text-orange-400">{result.domain}</span>
              </h4>
            </div>
            <p className={`text-sm ${
              result.overall === 'pass' 
                ? 'text-green-300'
                : result.overall === 'partial'
                ? 'text-yellow-300'
                : 'text-red-300'
            }`}>
              {result.overall === 'pass' 
                ? 'All checks passed! Your domain is properly configured.'
                : result.overall === 'partial'
                ? 'Some checks passed, but issues were found.'
                : 'Multiple issues found. Please fix them before using this domain.'}
            </p>
          </div>

          <div className="space-y-3">
            {Object.entries(result.checks).map(([key, check]) => (
              <div
                key={key}
                className={`p-3 rounded-lg border ${
                  check.passed
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{check.passed ? '✓' : '✗'}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      check.passed ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {check.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {result.overall !== 'pass' && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
              <p className="text-sm font-semibold text-blue-300 mb-2">Next Steps:</p>
              <ul className="text-sm text-blue-200 space-y-1 list-disc list-inside">
                {!result.checks.domainConfigured.passed && (
                  <li>Add this domain in the <strong>Domains</strong> tab</li>
                )}
                {!result.checks.integrationEnabled.passed && (
                  <li>Enable integration in the <strong>My Login Code</strong> tab</li>
                )}
                {result.checks.domainConfigured.passed && result.checks.integrationEnabled.passed && (
                  <>
                    <li>Verify the integration code is pasted correctly on your website</li>
                    <li>Check browser console (F12) for any JavaScript errors</li>
                    <li>Ensure your website is accessible and the script can load</li>
                    <li>Test the authentication button on your actual website</li>
                  </>
                )}
              </ul>
            </div>
          )}

          {result.overall === 'pass' && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4">
              <p className="text-sm font-semibold text-green-300 mb-2">✓ Ready to Use!</p>
              <p className="text-sm text-green-200">
                Your domain is properly configured. Make sure you've pasted the integration code on your website 
                and test the authentication button to verify everything works.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 bg-dark-900/50 rounded-lg p-3 border border-dark-700">
        <p className="text-xs text-white/400">
          <strong>Note:</strong> This tool checks dashboard configuration. To fully verify your integration, 
          visit your website and test the authentication button. Use browser developer tools (F12) to check 
          for any errors.
        </p>
      </div>
    </Card>
  )
}

