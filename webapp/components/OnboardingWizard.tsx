'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import LoginButton from './LoginButton'
import { isTestDomain } from '@/lib/utils'

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
        // 401 is expected when user is not authenticated - don't log as error
        if (res.status !== 401 && process.env.NODE_ENV === 'development') {
          console.warn('Authentication check returned non-401 error:', res.status)
        }
        setIsAuthenticated(false)
        return false
      }
    } catch (error) {
      // Only log network errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error checking account status:', error)
      }
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
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-20">
      {/* Backdrop - transparent so landing page shows through */}
      <div 
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      
      {/* Wizard Container */}
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 rounded-2xl shadow-2xl border border-orange-500/20 overflow-hidden max-h-[85vh] flex flex-col">
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

              <div className="bg-dark-800/50 border-2 border-dashed border-orange-500/30 rounded-lg p-6 text-center mb-6">
                <div className="text-3xl mb-3">⚡</div>
                <h4 className="text-white font-semibold mb-2">Featured Wallets</h4>
                <p className="text-white/60 text-sm">Coming Soon</p>
                <p className="text-white/40 text-xs mt-2">Partner wallets will be showcased here</p>
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

              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <p className="text-sm text-orange-200 mb-2">
                  <strong>Note:</strong> You can add, edit, or remove domains at any time in your dashboard after setup.
                </p>
                <p className="text-sm text-orange-200">
                  <strong>Domain Verification:</strong> Real domains require DNS verification to ensure you own them. Test domains (localhost, *.test, staging.*) are automatically verified. You'll verify domains in your dashboard after completing setup.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Disclaimer */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  Key-Rex Terms and Conditions Agreement
                </h3>
                <p className="text-white/300 mb-6">
                  Please read and accept Key-Rex's Terms and Conditions Agreement to continue to your dashboard.
                </p>
              </div>
              
              {/* Domain Verification Reminder */}
              {domains.some(d => d.trim() && !isTestDomain(d.trim())) && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <p className="text-sm text-orange-200">
                    <strong>Next Step:</strong> After accepting, you'll need to verify your domain(s) in the dashboard before using the integration code. Verification requires adding a DNS TXT record to prove domain ownership.
                  </p>
                </div>
              )}

              <div className="bg-dark-800/70 border border-orange-500/20 rounded-lg p-4 sm:p-6 max-h-[250px] sm:max-h-[400px] overflow-y-auto">
                <p className="text-white/100 mb-4 leading-relaxed text-sm">
                  Key-Rex, LLC, a limited liability company organized in the state of Iowa (hereinafter referred to as "Key-Rex") is the creator of an open-source software provided under the MIT License. The services and software of Key-Rex is provided "as-is" and "as-available" to you (hereinafter referred to as the "Client") with Key-Rex making no warranties of any kind, express or implied to the Client. By accessing any of Key-Rex's services or software, and by clicking on "I hereby agree that I have read and accept Key-Rex's Terms and Conditions Agreement" below, Client agrees as follows:
                </p>
                <ol className="list-decimal list-outside space-y-3 text-white/200 text-sm ml-5">
                  <li>Client acknowledges and agrees that Key-Rex collects and stores certain data necessary for the operation of Key-Rex's services and software. This includes, but is not limited to, the following: Client's xpub (i.e. "extended public key"), site ID, domain configurations, usage statistics (e.g. login counts, analytics data, unique user counts), activity logs, disclaimer acceptance metadata (e.g. timestamp, IP address, user agent), data from Client's users, and any contact form submissions Client may send. For purposes of this Terms and Conditions Agreement "Client's users" shall mean any individual or entity, that uses any service or product provided by the Client, including but limited to, use of or visit to Client's website, use of Client's software, or use of any service or product that Client may offer. By using Key-Rex's services or software, Client explicitly consents to Key-Rex collecting, storing, and using the above-mentioned data for the purpose of providing and improving the authentication service, generating analytics, maintaining service security, and for administrative purposes. Client understands that this data is stored in Key-Rex's systems and may be retained for as long as Client's account is active or as required in the normal operations of Key-Rex's services.</li>
                  <li>Client acknowledges and agrees that Key-Rex may aggregate, anonymize, and commercialize usage statistics and analytics data derived from all of Key-Rex's users' use of Key-Rex's services and software, including Client's data and Client's users' data. This includes, but is not limited to, the following: wallet usage statistics, authentication patterns, browser and device analytics, and other anonymized metrics. Key-Rex may share, license, or sell this aggregated and anonymized data to third parties, including but not limited to, wallet providers, technology partners, researchers, or other interested parties. When sharing data with specific parties (such as a featured wallet company), Key-Rex may provide statistics related to that party's products or services while keeping competitor and user information anonymized or hidden. Client acknowledges and accepts that no personally identifiable information (e.g. Client's xpub, site ID, or domain names) will be shared by Key-Rex in these commercial arrangements, and all data will be aggregated across all users in a way that prevents identification of individual accounts or websites. <strong>BY USING KEY-REX, CLIENT EXPLICITLY CONSENTS TO THIS COMMERCIAL USE OF AGGREGATED, ANONYMIZED DATA.</strong></li>
                  <li><strong>CLIENT ACKNOWLEDGES AND AGREES THAT KEY-REX MAKES NO WARRANTY, SUPPORT, OR SERVICE-LEVEL AGREEMENT REGARDING KEY-REX'S SERVICES OR SOFTWARE TO OR WITH THE CLIENT, CLIENT'S USERS, ANY OTHER USER OF KEY-REX'S SERVICES OR SOFTWARE, OR ANY OTHER THIRD-PARTY USER OF KEY-REX'S SERVICES OR SOFTWARE. KEY-REX MAKES NO REPRESENTATIONS OR WARRANTIES REGARDING KEY-REX'S SERVICES AND SOFTWARE AVAILABILITY, UPTIME, FUNCTIONALITY, OR COMPATIBILITY WITH CLIENT'S OR CLIENT'S USERS' WEBSITES, SYSTEMS, THIRD-PARTY SERVICES, OR ANY HARDWARE OR SOFTWARE.</strong></li>
                  <li>Client acknowledges and agrees that Client is fully and solely responsible for any issues, liability, claims, or damages arising from Client's use or Client's users' use of Key-Rex's services and software, including but not limited to: financial losses, lost profits, lost revenue, business interruption, loss of business opportunities, loss of goodwill, or any other economic or non-economic damages.</li>
                  <li>Client acknowledges and agrees that Client is fully responsible for managing Client's integration through its dashboard on Key-Rex's website. The dashboard is where Client controls all aspects of Client's integration of Key-Rex's services and software, including enabling or disabling Key-Rex's services and software. <strong>CLIENT ACKNOWLEDGES AND AGREES THAT CLIENT HAS NOT RELIED ON ANY REPRESENTATIONS OR PROMISES BEYOND WHAT IS STATED IN THIS DISCLAIMER AND IN THIS TERMS AND CONDITIONS AGREEMENT.</strong></li>
                  <li>Client acknowledges and accepts that if any issue arises during Client or Client's users' use of Key-Rex's services or software, it is Client's sole responsibility to take any of the following actions, if Client, in its sole discretion, feels it is necessary: (1) disable the integration through Client's dashboard on Key-Rex's website, or (2) address the issue directly on Client's website. Key-Rex shall not be responsible for disabling the integration through the Client's dashboard on Key-Rex's website or addressing any issue on Client's website. Key-Rex shall also not be responsible for monitoring, detecting, or resolving issues with Client's integration. Client acknowledges and agrees that Key-Rex is not responsible or liable for any data loss, security breaches, unauthorized access, or authentication failures that may occur through Client's use, Clients' users' use, or any third-party's use of Key-Rex's services or software.</li>
                  <li>Client acknowledges and agrees that Key-Rex retains full control over all aspects of the authentication button and related elements that appear on Client's website through the integration. This includes, but is not limited to, the following: the Key-Rex logo, branding elements, button text, colors, fonts, names, featured wallets (whether paid or unpaid), promotional content, links, and any other visual, textual, or functional elements. These elements may be added, removed, modified, or changed at any time without prior notice by Key-Rex. By using Key-Rex authentication on Client's website, Client explicitly agrees to accept and allow Key-Rex to make any changes, additions, or modifications to the button and related elements as Key-Rex deems appropriate, without any obligation to notify Client or obtain Client's consent.</li>
                  <li>Client acknowledges and agrees that Key-Rex is not responsible for the availability, functionality, or failures of third-party services, including but not limited to: the Lightning Network, wallet providers, payment processors, or any other services upon which Key-Rex depends. Client acknowledges and agrees that Key-Rex is not responsible or liable for any issues, including, but not limited to, any data loss, security breaches, unauthorized access, or authentication failures by third-party services.</li>
                  <li>Client acknowledges and agrees that Key-Rex makes no guarantee of service availability, uptime, or uninterrupted access regarding any of Key-Rex's services or software. Key-Rex's services or software may be temporarily unavailable for maintenance, updates, technical issues, or other reasons. Key-Rex's services or software may be modified, suspended, or discontinued at any time without notice, and Key-Rex has no obligation to continue providing any of Key-Rex's services or software.</li>
                  <li>Client acknowledges and agrees that Key-Rex makes no guarantee of data backup, recovery, or retention. Client acknowledges and agrees that Key-Rex has no obligation to provide Client or Client's users any data that Key-Rex has collected or maintained. Key-Rex is not responsible for any loss of data, including but not limited to: user authentication data, usage statistics, domain configurations, or any other data associated with Client's use or Client's users' use of the service.</li>
                  <li>Client acknowledges and agrees that Client is solely responsible for ensuring Client's use of Key-Rex complies with all applicable laws, regulations, and legal obligations, including but not limited to: data protection laws (including, but not limited to, the General Data Protection Regulation ("GDPR")), privacy regulations, consumer protection laws, and any other applicable local, state, national, or international laws. Client acknowledges and agrees that Client will indemnify and hold Key-Rex harmless and not liable regarding any violations of any such laws or regulations, and that Client will be solely responsible for any fines, penalties, and any other consequences associated with said violations.</li>
                  <li>Client acknowledges and agrees that Key-Rex may terminate or suspend Client or Client's users' access to the service at any time, with or without cause, and with or without notice. Client or Client's users may lose access to Key-Rex's services or software, Client or Client's users data, or Client's integration at any time without recourse, and without obligation from Key-Rex to restore access or recovery of said services, software, or data.</li>
                  <li>Client acknowledges and agrees that Key-Rex shall not be liable for any delays or failures in performance resulting from circumstances beyond its reasonable control of Key-Rex, including but not limited to: acts of God, natural disasters, war, terrorism, labor disputes, government actions, internet failures, or any other force majeure events.</li>
                  <li><strong>CLIENT ACKNOWLEDGES AND AGREES THAT CLIENT SHALL NOT HOLD KEY-REX, ITS STAFF, ITS PARTNERS, OR ITS OWNERS, LIABLE FOR ANY DAMAGES, LOSSES, OR CLAIMS RELATED TO CLIENT'S OR CLIENT'S USERS' USE OF KEY-REX'S SERVICES OR SOFTWARE, OR ANY ISSUES THAT ARISE FROM THE INTEGRATION, WHETHER DIRECT, INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR OTHERWISE.</strong> To the maximum extent permitted by law, Key-Rex's total liability shall not exceed zero dollars ($0), regardless of the form of action or theory of liability.</li>
                  <li>Client acknowledges and agrees that Client shall indemnify Key-Rex from any and all legal claims, damages, losses, or expenses related to Client's implementation, use, or Client's users' use of Key-Rex's services and software, including but not limited to, the following: attorney's fees, court costs, and any other expenses incurred in defending against such claims.</li>
                  <li>Client acknowledges and agrees that in the event that any dispute arises hereunder, it is specifically stipulated that this Agreement is executed, and therefore shall be construed, in accordance with and governed by the laws of the State of Iowa and the United States of America. Any breach hereof by Client, Client's employees and/or agents shall entitle Key-Rex to all remedies available pursuant to such laws. Any proceeding, claim, action, or alternative dispute resolution arising out of or relating to this Agreement shall be brought in a State District Court of competent jurisdiction in Polk County, Iowa, or if Federal Court is legally required, a Federal Court of competent jurisdiction in the Northern District of Iowa, and each of the parties to this Agreement irrevocably submits to the exclusive jurisdiction of said court in any such proceeding, waives any objection it may now or hereafter have to venue or to convenience of forum, agrees that all claims in respect of the proceeding shall be heard and determined only in any such court, and agrees not to bring any proceeding arising out of or relating to this Agreement in any other court.</li>
                  <li>In case any provision in this Agreement shall be invalid, illegal or unenforceable, the validity, legality and enforceability of the remaining provisions shall not in any way be affected or impaired thereby and such provision shall be ineffective only to the extent of such invalidity, illegality or unenforceability.</li>
                  <li>This Agreement constitutes the entire agreement between the parties hereto with respect to the subject matter contained in this Agreement and supersedes all prior agreements, understandings and negotiations between the parties.</li>
                </ol>
                <p className="text-white/100 mt-4 leading-relaxed text-sm font-semibold">
                  WHEREFORE, by clicking on "I hereby agree that I have read and accept Key-Rex's Terms and Conditions Agreement" below, Client acknowledges that Client has carefully read and fully understands all the provisions of this Agreement, and that they are freely, knowingly, and voluntarily entering into this Agreement with Key-Rex.
                </p>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <p className="text-sm text-orange-200">
                  <strong>Important:</strong> You must accept this agreement to access your dashboard and integration code.
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
              {isAcceptingDisclaimer ? 'Accepting...' : 'I hereby agree that I have read and accept Key-Rex\'s Terms and Conditions Agreement'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

