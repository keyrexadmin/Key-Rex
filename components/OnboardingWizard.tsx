'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import LoginButton from './LoginButton'

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
}

export default function OnboardingWizard({ isOpen, onClose }: OnboardingWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [domains, setDomains] = useState<string[]>([''])
  const [domainErrors, setDomainErrors] = useState<string[]>([''])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [isAcceptingDisclaimer, setIsAcceptingDisclaimer] = useState(false)

  // Check if user has already completed wizard when wizard opens
  // If they have, redirect them to dashboard immediately
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

  // Check if user is authenticated when opening wizard or on step 2
  useEffect(() => {
    if (isOpen && currentStep === 2) {
      checkAuthentication()
    }
  }, [isOpen, currentStep])

  // Check authentication status
  const checkAuthentication = async (): Promise<boolean> => {
    setIsCheckingAuth(true)
    try {
      const res = await fetch('/api/user', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.ok) {
        const userData = await res.json()
        setIsAuthenticated(true)
        
        // CRITICAL: When wizard is open and user authenticates, DO NOT redirect
        // Even if user has completed wizard before, let them go through it again
        // Only redirect if wizard is closed and user is already completed
        if (userData.freeDisclaimerAccepted && !isOpen) {
          console.log('User already has completed account and wizard is closed - redirecting to dashboard')
          onClose() // Close wizard
          router.push('/dashboard') // Redirect to dashboard
          return true
        }
        
        // If wizard is open, always proceed through the flow
        // Don't redirect even if user is already completed - let them go through wizard again
        console.log('User authenticated - wizard is open, proceeding through wizard flow')
        return true
      } else {
        setIsAuthenticated(false)
        return false
      }
    } catch (error) {
      setIsAuthenticated(false)
      return false
    } finally {
      setIsCheckingAuth(false)
    }
  }

  // Handle authentication success
  useEffect(() => {
    if (isAuthenticated && currentStep === 2 && isOpen) {
      // Check if user already has completed account setup
      const checkAccountStatus = async () => {
        try {
          const res = await fetch('/api/user', {
            credentials: 'include',
            cache: 'no-store',
          })
          if (res.ok) {
            const userData = await res.json()
            console.log('Account status check - freeDisclaimerAccepted:', userData.freeDisclaimerAccepted)
            
            // CRITICAL: When wizard is open, always proceed through the flow
            // DO NOT redirect even if user has completed wizard before
            // This allows users to go through the wizard again if needed
            // Only proceed to step 3 - let them complete the wizard flow
            console.log('User authenticated - wizard is open, proceeding to step 3')
            setTimeout(() => {
              setCurrentStep(3)
            }, 500)
          } else {
            console.error('Failed to fetch user data after authentication')
            // On error, proceed to step 3 (don't block wizard)
            setTimeout(() => {
              setCurrentStep(3)
            }, 500)
          }
        } catch (error) {
          console.error('Error checking account status:', error)
          // On error, proceed to step 3 (don't block wizard)
          setTimeout(() => {
            setCurrentStep(3)
          }, 500)
        }
      }
      checkAccountStatus()
    }
  }, [isAuthenticated, currentStep, isOpen, router, onClose])

  // Listen for authentication success
  useEffect(() => {
    const handleAuthSuccess = () => {
      checkAuthentication()
    }

    // Poll for authentication every 2 seconds when on step 2
    let interval: NodeJS.Timeout | null = null
    if (isOpen && currentStep === 2 && !isAuthenticated) {
      interval = setInterval(() => {
        checkAuthentication()
      }, 2000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isOpen, currentStep, isAuthenticated])

  // Domain validation
  const validateDomain = (domain: string): string | null => {
    if (!domain.trim()) {
      return 'Domain is required'
    }
    
    // Domain format: example.com or login.example.com
    // Must have at least one dot and valid TLD
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
    
    if (!domainRegex.test(domain.trim())) {
      return 'Invalid domain format. Use format like: example.com or login.example.com'
    }
    
    // Check for http/https
    if (domain.includes('http://') || domain.includes('https://')) {
      return 'Do not include http:// or https://. Just enter the domain (e.g., example.com)'
    }
    
    // Check for trailing slash
    if (domain.endsWith('/')) {
      return 'Do not include trailing slash. Just enter the domain (e.g., example.com)'
    }
    
    return null
  }

  // Handle domain input change
  const handleDomainChange = (index: number, value: string) => {
    const newDomains = [...domains]
    newDomains[index] = value
    setDomains(newDomains)
    
    const newErrors = [...domainErrors]
    newErrors[index] = ''
    setDomainErrors(newErrors)
  }

  // Add new domain field
  const handleAddDomain = () => {
    setDomains([...domains, ''])
    setDomainErrors([...domainErrors, ''])
  }

  // Remove domain field
  const handleRemoveDomain = (index: number) => {
    if (domains.length > 1) {
      const newDomains = domains.filter((_, i) => i !== index)
      const newErrors = domainErrors.filter((_, i) => i !== index)
      setDomains(newDomains)
      setDomainErrors(newErrors)
    }
  }

  // Validate all domains before proceeding
  const validateAllDomains = (): boolean => {
    const errors: string[] = []
    let hasValidDomain = false
    
    domains.forEach((domain, index) => {
      const error = validateDomain(domain)
      errors[index] = error || ''
      if (!error && domain.trim()) {
        hasValidDomain = true
      }
    })
    
    setDomainErrors(errors)
    return hasValidDomain
  }

  // Handle domain submission
  const handleSubmitDomains = async () => {
    if (!validateAllDomains()) {
      return
    }

    setIsSubmitting(true)
    try {
      // Get the first valid domain
      const firstDomain = domains.find(d => d.trim() && !validateDomain(d.trim()))
      
      if (!firstDomain) {
        return
      }

      // Subscribe with the domain
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tier: 'free',
          domain: firstDomain.trim(),
        }),
      })

      if (res.ok) {
        // Add any additional domains
        for (let i = 1; i < domains.length; i++) {
          const domain = domains[i].trim()
          if (domain && !validateDomain(domain)) {
            await fetch('/api/domains', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ domain }),
            })
          }
        }

        // Advance to disclaimer step (Step 4)
        setCurrentStep(4)
      } else {
        const errorData = await res.json().catch(() => ({}))
        alert('Failed to save domain: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to submit domains:', error)
      alert('Failed to save domain: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset wizard when closed
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1)
      setDomains([''])
      setDomainErrors([''])
      setIsAuthenticated(false)
      setDisclaimerAccepted(false)
    }
  }, [isOpen])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle disclaimer acceptance
  const handleAcceptDisclaimer = async () => {
    setIsAcceptingDisclaimer(true)
    try {
      const res = await fetch('/api/disclaimer', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (res.ok) {
        setDisclaimerAccepted(true)
        // Redirect to dashboard after accepting
        router.push('/dashboard')
        onClose()
      } else {
        const errorData = await res.json().catch(() => ({}))
        alert('Failed to save acceptance: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to accept disclaimer:', error)
      alert('Failed to accept disclaimer: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsAcceptingDisclaimer(false)
    }
  }

  if (!isOpen) return null

  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20">
      {/* Backdrop - transparent so landing page shows through */}
      <div 
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      
      {/* Wizard Container */}
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-orange-500/20 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between border-b border-orange-400/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">⚡</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Get Your Integration Code</h2>
              <p className="text-xs text-orange-100">Step {currentStep} of {totalSteps}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/90 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/20"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-dark-700">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Lightning Wallet */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  Get a Lightning Wallet
                </h3>
                <p className="text-white/300 mb-6">
                  To use Key-Rex, you'll need a Lightning wallet. If you already have one, you can continue to the next step.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Alby */}
                <a
                  href="https://getalby.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-dark-800/50 border-2 border-dark-700 hover:border-orange-500/50 rounded-lg p-4 text-center transition-all group"
                >
                  <div className="text-4xl mb-3">🦉</div>
                  <h4 className="text-white font-semibold mb-2">Alby</h4>
                  <p className="text-white/400 text-sm mb-3">
                    Browser extension wallet. Perfect for web authentication.
                  </p>
                  <span className="text-orange-400 text-sm font-medium group-hover:text-orange-300">
                    Get Alby →
                  </span>
                </a>

                {/* Phoenix */}
                <a
                  href="https://phoenix.acinq.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-dark-800/50 border-2 border-dark-700 hover:border-orange-500/50 rounded-lg p-4 text-center transition-all group"
                >
                  <div className="text-4xl mb-3">🔥</div>
                  <h4 className="text-white font-semibold mb-2">Phoenix</h4>
                  <p className="text-white/400 text-sm mb-3">
                    Mobile wallet for iOS and Android. Simple and user-friendly.
                  </p>
                  <span className="text-orange-400 text-sm font-medium group-hover:text-orange-300">
                    Get Phoenix →
                  </span>
                </a>

                {/* Zeus */}
                <a
                  href="https://zeusln.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-dark-800/50 border-2 border-dark-700 hover:border-orange-500/50 rounded-lg p-4 text-center transition-all group"
                >
                  <div className="text-4xl mb-3">⚡</div>
                  <h4 className="text-white font-semibold mb-2">Zeus</h4>
                  <p className="text-white/400 text-sm mb-3">
                    Advanced mobile wallet. Connect to your own Lightning node.
                  </p>
                  <span className="text-orange-400 text-sm font-medium group-hover:text-orange-300">
                    Get Zeus →
                  </span>
                </a>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <p className="text-sm text-orange-200">
                  <strong>Already have a wallet?</strong> You can continue to the next step to sign in.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Establish Account */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  Establish Your Account
                </h3>
                <p className="text-white/300 mb-6">
                  Sign in with your Lightning wallet to create your Key-Rex account. This establishes your account so you can get and manage your integration code.
                </p>
              </div>

              <div className="bg-dark-800/50 border-2 border-orange-500/30 rounded-lg p-6">
                {isCheckingAuth ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
                    <p className="text-white/300">Checking authentication...</p>
                  </div>
                ) : isAuthenticated ? (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                      <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-green-400 font-semibold mb-2">Account Established!</p>
                    <p className="text-white/300 text-sm">Continuing to next step...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-white/300 text-center mb-4">
                      Click the button below to sign in with your Lightning wallet:
                    </p>
                    <LoginButton 
                      buttonText="Sign in with Key-Rex"
                      buttonClassName="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg border border-orange-400/30"
                      disableRedirect={true}
                      onLoginSuccess={() => {
                        // Trigger authentication check which will advance to step 3
                        checkAuthentication()
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Domain Entry */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  Enter Your Domain
                </h3>
                <p className="text-white/300 mb-6">
                  Enter the domain(s) where you'll use Key-Rex. You can add multiple domains or just one. You can always add, edit, or remove domains later in your dashboard.
                </p>
              </div>

              {/* Domain Format Examples */}
              <div className="bg-dark-800/50 border-2 border-orange-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-white mb-3">Domain Format Examples:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <div>
                      <span className="text-white/200 font-mono">example.com</span>
                      <span className="text-white/400 ml-2">(works)</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <div>
                      <span className="text-white/200 font-mono">login.example.com</span>
                      <span className="text-white/400 ml-2">(works)</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✗</span>
                    <div>
                      <span className="text-white/200 font-mono">https://example.com</span>
                      <span className="text-white/400 ml-2">(don't include http:// or https://)</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✗</span>
                    <div>
                      <span className="text-white/200 font-mono">example</span>
                      <span className="text-white/400 ml-2">(missing .com or TLD)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Domain Input Fields */}
              <div className="space-y-4">
                {domains.map((domain, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={domain}
                          onChange={(e) => handleDomainChange(index, e.target.value)}
                          placeholder={index === 0 ? "example.com" : "another-domain.com (optional)"}
                          className={`w-full px-4 py-3 rounded-lg border-2 bg-dark-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                            domainErrors[index]
                              ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
                              : 'border-dark-600 focus:ring-orange-500/50 focus:border-orange-500'
                          }`}
                        />
                        {domainErrors[index] && (
                          <p className="text-sm text-red-400 mt-1">{domainErrors[index]}</p>
                        )}
                      </div>
                      {domains.length > 1 && (
                        <button
                          onClick={() => handleRemoveDomain(index)}
                          className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors border border-red-500/30"
                          aria-label="Remove domain"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleAddDomain}
                  className="w-full px-4 py-2 bg-dark-800/50 hover:bg-dark-800 border-2 border-dashed border-dark-600 hover:border-orange-500/50 text-white/300 hover:text-orange-400 rounded-lg transition-all text-sm font-medium"
                >
                  + Add Another Domain
                </button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-200">
                  <strong>Note:</strong> You can add, edit, or remove domains at any time in your dashboard after setup.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Disclaimer */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  Key-Rex Terms and Conditions
                </h3>
                <p className="text-white/300 mb-6">
                  Please read and accept the terms and conditions to continue to your dashboard.
                </p>
              </div>

              <div className="bg-dark-800/70 border border-orange-500/20 rounded-lg p-6 max-h-[400px] overflow-y-auto">
                <p className="text-white/100 mb-4 leading-relaxed">
                  Key-Rex is open-source software provided under the MIT License. The service is provided "as-is" and "as-available" with no warranties of any kind, express or implied. By using the free version, you agree:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/200">
                  <li>You acknowledge and accept that Key-Rex collects and stores certain data necessary for the operation of the service. This includes, but is not limited to: your xpub (extended public key), site ID, domain configurations, usage statistics (login counts, analytics data, unique user counts), activity logs, disclaimer acceptance metadata (timestamp, IP address, user agent), and any contact form submissions you may send. By using Key-Rex, you explicitly consent to Key-Rex collecting, storing, and using this data for the purpose of providing and improving the authentication service, generating analytics, maintaining service security, and for administrative purposes. You understand that this data is stored in our systems and may be retained for as long as your account is active or as required for service operation.</li>
                  <li>You acknowledge and agree that Key-Rex may aggregate, anonymize, and commercialize usage statistics and analytics data derived from all users' use of the service. This includes, but is not limited to: wallet usage statistics, authentication patterns, browser and device analytics, and other anonymized metrics. Key-Rex may share, license, or sell this aggregated and anonymized data to third parties, including but not limited to wallet providers, technology partners, researchers, or other interested parties. When sharing data with specific parties (such as a featured wallet company), Key-Rex may provide statistics related to that party's products or services while keeping competitor information anonymized or hidden. You understand that no personally identifiable information (such as your xpub, site ID, or domain names) will be shared in these commercial arrangements, and all data will be aggregated across all users in a way that prevents identification of individual accounts or websites. By using Key-Rex, you explicitly consent to this commercial use of aggregated, anonymized data.</li>
                  <li>There is no warranty, support, or service level agreement. Key-Rex makes no representations or warranties regarding the service's availability, uptime, functionality, or compatibility with your website, systems, or third-party services.</li>
                  <li>You are fully responsible for any issues, claims, or damages arising from your use or your users' use of the service, including but not limited to: financial losses, lost profits, lost revenue, business interruption, loss of business opportunities, loss of goodwill, or any other economic or non-economic damages.</li>
                  <li>You are fully responsible for managing your integration through the dashboard. The dashboard is where you control all aspects of your integration, including enabling or disabling it. You acknowledge that you have not relied on any representations or promises beyond what is stated in this disclaimer.</li>
                  <li>If any issues arise, it is your sole responsibility to: (1) disable the integration through your dashboard, or (2) handle the issue directly on your website. Key-Rex is not responsible for monitoring, detecting, or resolving issues with your integration. Key-Rex is not responsible for any data loss, security breaches, unauthorized access, or authentication failures that may occur.</li>
                  <li>You understand and accept that Key-Rex retains full control over all aspects of the authentication button and related elements that appear on your website through the integration. This includes, but is not limited to: the Key-Rex logo, branding elements, button text, colors, fonts, names, featured wallets (whether paid or unpaid), promotional content, links, and any other visual, textual, or functional elements. These elements may be added, removed, modified, or changed at any time without prior notice. By using Key-Rex authentication on your website, you explicitly agree to accept and allow Key-Rex to make any changes, additions, or modifications to the button and related elements as Key-Rex deems appropriate, without any obligation to notify you or obtain your consent.</li>
                  <li>Key-Rex is not responsible for the availability, functionality, or failures of third-party services, including but not limited to: the Lightning Network, wallet providers, payment processors, or any other services upon which Key-Rex depends. Any issues with third-party services are not the responsibility of Key-Rex.</li>
                  <li>Key-Rex makes no guarantee of service availability, uptime, or uninterrupted access. The service may be temporarily unavailable for maintenance, updates, technical issues, or other reasons. The service may be modified, suspended, or discontinued at any time without notice, and Key-Rex has no obligation to continue providing the service.</li>
                  <li>There is no guarantee of data backup, recovery, or retention. Key-Rex is not responsible for any loss of data, including but not limited to: user authentication data, usage statistics, domain configurations, or any other data associated with your use of the service.</li>
                  <li>You are solely responsible for ensuring your use of Key-Rex complies with all applicable laws, regulations, and legal obligations, including but not limited to: data protection laws (such as GDPR), privacy regulations, consumer protection laws, and any other applicable local, state, national, or international laws.</li>
                  <li>Key-Rex may terminate or suspend your access to the service at any time, with or without cause, and with or without notice. You may lose access to the service, your data, or your integration at any time without recourse.</li>
                  <li>Key-Rex shall not be liable for any delays or failures in performance resulting from circumstances beyond its reasonable control, including but not limited to: acts of God, natural disasters, war, terrorism, labor disputes, government actions, internet failures, or any other force majeure events.</li>
                  <li>You agree that you will not hold Key-Rex, its staff, or its partners liable for any damages, losses, or claims related to your use of the service, your users' use of the service, or any issues that arise from the integration, whether direct, indirect, incidental, consequential, or otherwise. To the maximum extent permitted by law, Key-Rex's total liability shall not exceed zero dollars ($0), regardless of the form of action or theory of liability.</li>
                  <li>You indemnify Key-Rex from any and all legal claims, damages, losses, or expenses related to your implementation, usage, or your users' usage of the integration, including but not limited to: attorney's fees, court costs, and any other expenses incurred in defending against such claims.</li>
                </ul>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <p className="text-sm text-orange-200">
                  <strong>Important:</strong> You must accept this disclaimer to access your dashboard and integration code.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="border-t border-dark-700 bg-dark-900/50 px-6 py-4 flex items-center justify-between">
          <button
            onClick={currentStep > 1 ? () => setCurrentStep(currentStep - 1) : onClose}
            className="px-4 py-2 text-sm font-medium text-white/300 hover:text-white transition-colors"
          >
            {currentStep > 1 ? 'Back' : 'Cancel'}
          </button>
          
          {currentStep === 1 && (
            <button
              onClick={() => setCurrentStep(2)}
              className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              Continue
            </button>
          )}

          {currentStep === 2 && isAuthenticated && (
            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              Continue
            </button>
          )}

          {currentStep === 3 && (
            <button
              onClick={handleSubmitDomains}
              disabled={isSubmitting || !domains.some(d => d.trim() && !validateDomain(d.trim()))}
              className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Continue'}
            </button>
          )}

          {currentStep === 4 && (
            <button
              onClick={handleAcceptDisclaimer}
              disabled={isAcceptingDisclaimer}
              className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAcceptingDisclaimer ? 'Accepting...' : 'I Accept & Continue to Dashboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

