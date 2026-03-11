'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

declare global {
  interface Window {
    webln?: {
      enable: () => Promise<void>
      lnurl: (lnurl: string) => Promise<{ k1: string; sig: string; key: string; xpub?: string } | any>
      request?: (method: string, params?: any) => Promise<any>
    }
  }
}

interface LoginButtonProps {
  buttonText?: string
  buttonClassName?: string
  compact?: boolean
  onLoginSuccess?: () => void // Callback when login succeeds, instead of redirecting
  disableRedirect?: boolean // If true, don't redirect to dashboard
  buttonImage?: string // Optional image URL to display instead of text
  imageAlt?: string // Alt text for the image
}

export default function LoginButton({ buttonText, buttonClassName, compact = false, onLoginSuccess, disableRedirect = false, buttonImage, imageAlt = 'Sign in with Key-Rex' }: LoginButtonProps = {}) {
  const [k1, setK1] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [showWizardRequiredModal, setShowWizardRequiredModal] = useState(false)

  // Helper function to handle successful login
  const handleLoginSuccess = async () => {
    if (disableRedirect) {
      // If in wizard context, call callback instead of redirecting
      if (onLoginSuccess) {
        onLoginSuccess()
      }
    } else {
      // Check if user has completed the wizard (disclaimer accepted)
      try {
        const userRes = await fetch('/api/user', {
          credentials: 'include',
          cache: 'no-store',
        })
        
        if (userRes.ok) {
          const userData = await userRes.json()
          
          // Check if disclaimer has been accepted (wizard completed)
          console.log('Checking user wizard status - freeDisclaimerAccepted:', userData.freeDisclaimerAccepted)
          if (!userData.freeDisclaimerAccepted) {
            // User hasn't completed wizard - show popup modal
            console.log('User has not completed wizard - showing setup required modal')
            console.log('Setting showWizardRequiredModal to true')
            setShowWizardRequiredModal(true)
            console.log('Modal state set - modal should now be visible')
            return
          } else {
            console.log('User has completed wizard - redirecting to dashboard')
          }
          
          // User has completed wizard - allow dashboard access
          window.location.href = '/dashboard'
        } else {
          // If we can't verify user, redirect to home page with wizard
          console.log('Could not verify user status - redirecting to home page with wizard=true')
          window.location.href = '/?wizard=true'
        }
      } catch (error) {
        console.error('Error checking user status:', error)
        // On error, redirect to home page with wizard
        window.location.href = '/?wizard=true'
      }
    }
  }

  // Removed: QR code generation in useEffect
  // QR codes are now handled by the dedicated /embed/qr page
  // This provides better mobile experience with copy functionality

  const handleLogin = async () => {
    setLoading(true)
    try {
      // First, check if user already has a valid session
      console.log('=== Starting authentication flow ===')
      console.log('Checking for existing session...')
      const existingSessionRes = await fetch('/api/user', {
        credentials: 'include',
        cache: 'no-store',
      })
      
      if (existingSessionRes.ok) {
        const userData = await existingSessionRes.json()
        console.log('Existing session found:', userData)
        handleLoginSuccess()
        return
      }
      
      // No valid session, proceed with authentication
      console.log('No existing session, starting fresh authentication...')
      
      // Get challenge and bech32-encoded LNURL from server
      console.log('Fetching new authentication challenge...')
      const challengeRes = await fetch('/api/auth/lnurl')
      if (!challengeRes.ok) {
        throw new Error('Failed to get LNURL')
      }
      const { k1: challenge, lnurl: lnurlBech32 } = await challengeRes.json()
      console.log('Received challenge k1:', challenge.substring(0, 16) + '...')
      setK1(challenge)

      // Check if WebLN is available
      if (typeof window !== 'undefined' && window.webln) {
        try {
          console.log('WebLN detected, attempting to enable...')
          console.log('This should show Alby popup if not already enabled...')
          await window.webln.enable()
          console.log('WebLN enabled successfully')
          
          console.log('=== Calling WebLN.lnurl() - Alby should show authentication popup now ===')
          console.log('Bech32 LNURL:', lnurlBech32.substring(0, 50) + '...')
          
          // Try WebLN lnurl method - pass the bech32-encoded LNURL
          if (window.webln.lnurl) {
            try {
              console.log('Calling window.webln.lnurl() - waiting for Alby authentication...')
              console.log('NOTE: If Alby is already unlocked and site is trusted, it may auto-approve without popup')
              const result = await window.webln.lnurl(lnurlBech32)
              console.log('=== WebLN authentication completed ===')
              console.log('WebLN result type:', typeof result)
              console.log('WebLN result:', JSON.stringify(result, null, 2))
              console.log('If you did not see an Alby popup, Alby may have auto-approved this request')
              
              // WebLN's lnurl() resolves when callback succeeds
              // Alby should have called the callback by now
              // The callback stores the k1->xpub mapping
              // We need to retrieve the xpub and set the session
              console.log('WebLN completed. Retrieving xpub from callback...')
              
              // Poll the callback endpoint to get the xpub (Alby may still be processing)
              const retrieveUrl = `${window.location.origin}/api/auth/callback?tag=login&k1=${encodeURIComponent(challenge)}`
              let retrievedXpub: string | null = null
              
              // Try multiple times with delays (Alby might take a moment to call the callback)
              for (let attempt = 0; attempt < 10; attempt++) {
                if (attempt > 0) {
                  // Wait before retrying (increasing delay)
                  await new Promise(resolve => setTimeout(resolve, 500 + (attempt * 200)))
                }
                
                try {
                  const retrieveRes = await fetch(retrieveUrl, {
                    method: 'GET',
                    credentials: 'include',
                  })
                  
                  if (retrieveRes.ok) {
                    const retrieveData = await retrieveRes.json()
                    
                    // Check if we got the xpub (callback was called by Alby)
                    if (retrieveData.xpub) {
                      retrievedXpub = retrieveData.xpub
                      if (retrievedXpub) {
                        console.log('✓ Got xpub from callback:', retrievedXpub.substring(0, 20) + '...')
                      }
                      break
                    }
                    
                    // If we get the initial format, callback hasn't been called yet
                    if (retrieveData.tag === 'login' && retrieveData.k1) {
                      if (attempt < 9) {
                        console.log(`Attempt ${attempt + 1}/10: Waiting for Alby callback...`)
                        continue
                      }
                    }
                  }
                } catch (fetchError) {
                  console.error(`Error on attempt ${attempt + 1}:`, fetchError)
                  if (attempt < 9) continue
                }
              }
              
              if (!retrievedXpub) {
                throw new Error('Failed to retrieve xpub after WebLN authentication. Please try again.')
              }
              
              // Set the session cookie (retry with backoff if rate limited)
              console.log('Setting session cookie...')
              let sessionRes: Response | null = null
              for (let attempt = 0; attempt < 3; attempt++) {
                sessionRes = await fetch('/api/auth/set-session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ xpub: retrievedXpub, k1: challenge }),
                })
                if (sessionRes.ok || sessionRes.status !== 429) break
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
              }

              if (!sessionRes || !sessionRes.ok) {
                const errorData = await sessionRes?.json().catch(() => ({})) || {}
                console.error('Failed to set session:', errorData)
                throw new Error('Failed to set session: ' + (errorData.error || 'Unknown error'))
              }
              
              // Wait a moment for cookie to propagate
              await new Promise(resolve => setTimeout(resolve, 300))
              
              // Verify session was set
              const userRes = await fetch('/api/user', {
                credentials: 'include',
                cache: 'no-store',
              })
              
              if (userRes.ok) {
                const userData = await userRes.json()
                console.log('✓ Login successful!', userData)
                handleLoginSuccess()
                return
              } else {
                throw new Error('Session verification failed')
              }
              
            } catch (lnurlError) {
              console.error('WebLN lnurl error:', lnurlError)
              // Always fall back to QR code, even in wizard context
              console.log('WebLN authentication failed, falling back to QR code')
              // Continue to QR code fallback below
            }
          } else {
            console.log('WebLN lnurl method not available')
          }
        } catch (weblnError) {
          // WebLN failed - always fall back to QR code
          console.error('WebLN error:', weblnError)
          console.log('Falling back to QR code')
        }
      } else {
        // WebLN not available - always redirect to QR code page
        // The disableRedirect flag only prevents dashboard redirects, not QR code authentication
        console.log('WebLN not available, redirecting to QR code page')
        // Redirect to enhanced QR code page instead of showing inline QR code
        // If in wizard context, set returnUrl to home page so we can return to wizard after auth
        const returnUrl = disableRedirect 
          ? encodeURIComponent(`${window.location.origin}/?wizard=true`)
          : encodeURIComponent(window.location.href)
        window.location.href = `/embed/qr?k1=${encodeURIComponent(challenge)}&returnUrl=${returnUrl}${disableRedirect ? '&wizard=true' : ''}`
        return // Exit early since we're redirecting
      }

      // If we reach here, WebLN was attempted but failed - always fall back to QR code
      console.log('WebLN failed, redirecting to QR code page')
      // If in wizard context, set returnUrl to home page so we can return to wizard after auth
      const returnUrl = disableRedirect 
        ? encodeURIComponent(`${window.location.origin}/?wizard=true`)
        : encodeURIComponent(window.location.href)
      window.location.href = `/embed/qr?k1=${encodeURIComponent(challenge)}&returnUrl=${returnUrl}${disableRedirect ? '&wizard=true' : ''}`
      return
    } catch (error) {
      console.error('Login error:', error)
      alert('Login failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const defaultButtonClass = "w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors disabled:opacity-50"
  const defaultText = 'Sign in with Key-Rex'

  const handleGoToSetup = () => {
    // Close modal first
    setShowWizardRequiredModal(false)
    // Redirect to home page with query parameter to trigger wizard
    window.location.href = '/?wizard=true'
  }

  return (
    <>
      <div className={compact ? "space-y-2" : "space-y-4"}>
        <button
          onClick={handleLogin}
          disabled={loading}
          className={buttonClassName || defaultButtonClass}
        >
          {buttonImage ? (
            loading ? (
              <span className="text-xs">Loading...</span>
            ) : (
              <Image
                src={buttonImage}
                alt={imageAlt}
                width={0}
                height={0}
                sizes="80vw"
                className="w-auto object-contain"
                style={{ height: '6rem', width: '10rem' }}
                priority
              />
            )
          ) : (
            loading ? 'Preparing login...' : (buttonText || defaultText)
          )}
        </button>

        {/* QR code is now handled by redirecting to /embed/qr page */}
      </div>

      {/* Wizard Required Modal */}
      {showWizardRequiredModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowWizardRequiredModal(false)}
          />
          
          {/* Modal - positioned lower */}
          <div className="relative w-full max-w-md bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 rounded-2xl shadow-2xl border border-orange-500/20 overflow-hidden mt-20 sm:mt-40 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 border-b border-orange-400/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">⚡</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">Account Setup Required</h2>
                </div>
                <button
                  onClick={() => setShowWizardRequiredModal(false)}
                  className="text-white/90 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/20"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/20 rounded-full mb-4">
                  <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  Finish Account Setup
                </h3>
                <p className="text-white/300 mb-4">
                  You need to complete your account setup before accessing the dashboard. This includes setting up your domain and accepting the disclaimer.
                </p>
              </div>

              <div className="bg-dark-800/50 border border-orange-500/20 rounded-lg p-4">
                <p className="text-sm text-white/200 mb-2">
                  <strong className="text-orange-400">Next steps:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-white/300">
                  <li>Click "Get Your Integration Code" on the home page</li>
                  <li>Complete the 4-step setup wizard</li>
                  <li>Accept the disclaimer</li>
                  <li>Access your dashboard</li>
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-dark-700 bg-dark-900/50 px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowWizardRequiredModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white/300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGoToSetup}
                className="flex-1 px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                Go to Setup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


