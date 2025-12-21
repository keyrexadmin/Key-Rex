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
              // Different wallets return different formats:
              // - Some return { status: 'OK', xpub: '...' }
              // - Some return { status: 'OK', key: '...', sig: '...' }
              // - Some return just { status: 'OK' }
              // - Some return the raw callback response
              // - Alby might return { status: 'OK' } but the callback happens separately
              
              let xpubToUse: string | null = null
              let keyFromResult: string | null = null
              let sigFromResult: string | null = null
              
              // Try to extract key and sig from result (some wallets return them)
              if (result && typeof result === 'object') {
                console.log('Result object keys:', Object.keys(result))
                if ('key' in result && typeof result.key === 'string') {
                  keyFromResult = result.key
                  if (keyFromResult) {
                    console.log('Found key in WebLN result:', keyFromResult.substring(0, 20) + '...')
                  }
                }
                if ('sig' in result && typeof result.sig === 'string') {
                  sigFromResult = result.sig
                  if (sigFromResult) {
                    console.log('Found sig in WebLN result:', sigFromResult.substring(0, 20) + '...')
                  }
                }
                // Check alternative key names
                if (!keyFromResult) {
                  const altKey = (result as any).pubkey || (result as any).publicKey || (result as any).pubKey
                  if (altKey && typeof altKey === 'string') {
                    keyFromResult = altKey
                    console.log('Found key in alternative field:', keyFromResult.substring(0, 20) + '...')
                  }
                }
              }
              
              // Since Alby calls the callback but doesn't return the result,
              // and the in-memory storage isn't persisting, we need to manually call the callback
              // if we have key/sig, OR wait for Alby's callback and then immediately retrieve the xpub
              // by calling the callback again (it will return the xpub if user already exists)
              
              // First, try to manually call the callback if we have key/sig
              if (keyFromResult && sigFromResult && challenge) {
                console.log('=== Found key and sig in WebLN result, manually calling callback ===')
                try {
                  const callbackUrl = `${window.location.origin}/api/auth/callback?tag=login&k1=${encodeURIComponent(challenge)}&sig=${encodeURIComponent(sigFromResult)}&key=${encodeURIComponent(keyFromResult)}`
                  console.log('Calling callback URL:', callbackUrl.substring(0, 100) + '...')
                  const callbackRes = await fetch(callbackUrl, {
                    method: 'GET',
                    credentials: 'include',
                  })
                  console.log('Manual callback response status:', callbackRes.status)
                  if (callbackRes.ok) {
                    const callbackData = await callbackRes.json()
                    console.log('Manual callback response:', callbackData)
                    if (callbackData.xpub) {
                      xpubToUse = callbackData.xpub
                      console.log('Got xpub from manual callback:', xpubToUse ? xpubToUse.substring(0, 20) + '...' : 'null')

                      // Set session immediately with the xpub from callback
                      if (xpubToUse) {
                        console.log('Setting session with xpub from manual callback...')
                        const sessionRes = await fetch('/api/auth/set-session', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ xpub: xpubToUse, k1: challenge }),
                        })
                        
                        if (sessionRes.ok) {
                          console.log('Session set successfully from manual callback')
                          await new Promise(resolve => setTimeout(resolve, 500))
                          const userRes = await fetch('/api/user', { credentials: 'include' })
                          if (userRes.ok) {
                            const userData = await userRes.json()
                            console.log('Login successful with manual callback, user:', userData)
                            handleLoginSuccess()
                            return
                          }
                        }
                      }
                    }
                  }
                } catch (callbackError) {
                  console.error('Error manually calling callback:', callbackError)
                }
              } else {
                // If we don't have key/sig, Alby should have called the callback already
                // The callback creates the user and stores the k1->xpub mapping
                // We can try to retrieve it by calling the callback again with just the k1
                console.log('No key/sig in WebLN result. Alby should have called the callback.')
                console.log('Attempting to retrieve xpub from callback using k1...')
                
                // Wait a moment for Alby's callback to complete
                await new Promise(resolve => setTimeout(resolve, 2000))
                
                // Try to retrieve xpub by calling callback with just k1 (no sig/key)
                // The callback will check if there's a stored session for this k1
                try {
                  const retrieveUrl = `${window.location.origin}/api/auth/callback?tag=login&k1=${encodeURIComponent(challenge)}`
                  console.log('Calling callback to retrieve xpub:', retrieveUrl.substring(0, 100) + '...')
                  const retrieveRes = await fetch(retrieveUrl, {
                    method: 'GET',
                    credentials: 'include',
                  })
                  
                  if (retrieveRes.ok) {
                    const retrieveData = await retrieveRes.json()
                    console.log('Retrieve response:', retrieveData)
                    if (retrieveData.xpub) {
                      xpubToUse = retrieveData.xpub
                      console.log('Got xpub from callback retrieval:', xpubToUse ? xpubToUse.substring(0, 20) + '...' : 'null')
                      
                      // Set session with retrieved xpub
                      if (xpubToUse) {
                        const sessionRes = await fetch('/api/auth/set-session', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ xpub: xpubToUse, k1: challenge }),
                        })
                        
                        if (sessionRes.ok) {
                          console.log('Session set successfully from callback retrieval')
                          await new Promise(resolve => setTimeout(resolve, 500))
                          const userRes = await fetch('/api/user', { credentials: 'include' })
                          if (userRes.ok) {
                            const userData = await userRes.json()
                            console.log('Login successful with callback retrieval, user:', userData)
                            handleLoginSuccess()
                            return
                          }
                        } else {
                          const errorData = await sessionRes.json().catch(() => ({}))
                          console.error('Failed to set session:', errorData)
                        }
                      }
                    } else {
                      console.warn('Callback retrieval response does not contain xpub')
                      console.warn('Response keys:', Object.keys(retrieveData))
                      console.warn('Full response:', JSON.stringify(retrieveData, null, 2))
                      
                      // Check if this is the initial LNURL-auth format (means callback hasn't been called by Alby yet)
                      if (retrieveData.tag === 'login' && retrieveData.k1) {
                        console.warn('Received initial LNURL-auth format - Alby may not have called the callback yet')
                        console.warn('This could mean:')
                        console.warn('1. Alby is still processing the authentication')
                        console.warn('2. Alby encountered an error calling the callback')
                        console.warn('3. Signature verification failed when Alby called the callback')
                        console.warn('Waiting longer for Alby to complete callback...')
                        
                        // Wait longer and retry multiple times
                        for (let retry = 0; retry < 5; retry++) {
                          await new Promise(resolve => setTimeout(resolve, 2000))
                          console.log(`Retry ${retry + 1}/5: Checking if callback completed...`)
                          const retryRes = await fetch(retrieveUrl, {
                            method: 'GET',
                            credentials: 'include',
                          })
                          if (retryRes.ok) {
                            const retryData = await retryRes.json()
                            if (retryData.xpub) {
                              xpubToUse = retryData.xpub
                              console.log('✓ Got xpub on retry:', xpubToUse ? xpubToUse.substring(0, 20) + '...' : 'null')
                              // Try set-session
                              if (xpubToUse) {
                                const sessionRes = await fetch('/api/auth/set-session', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ xpub: xpubToUse, k1: challenge }),
                                })
                                if (sessionRes.ok) {
                                  await new Promise(resolve => setTimeout(resolve, 500))
                                  const userRes = await fetch('/api/user', { credentials: 'include' })
                                  if (userRes.ok) {
                                    handleLoginSuccess()
                                    return
                                  }
                                } else {
                                  const sessionError = await sessionRes.json().catch(() => ({}))
                                  console.error('Failed to set session on retry:', sessionError)
                                }
                              }
                              break // Found xpub, exit retry loop
                            } else if (retryData.tag === 'login') {
                              console.log(`Retry ${retry + 1}: Still waiting for Alby callback...`)
                            }
                          }
                        }
                      }
                    }
                  } else {
                    const errorText = await retrieveRes.text().catch(() => 'Unknown error')
                    console.log('Callback retrieval failed, status:', retrieveRes.status, 'error:', errorText)
                  }
                } catch (retrieveError) {
                  console.error('Error retrieving xpub from callback:', retrieveError)
                }
                
                // Fallback: Check if we have a user cookie (the callback might have set it)
                console.log('Fallback: Checking if user cookie was set...')
                const userCheckRes = await fetch('/api/user', { credentials: 'include' })
                if (userCheckRes.ok) {
                  const userData = await userCheckRes.json()
                  console.log('User found after callback!', userData)
                  handleLoginSuccess()
                  return
                }
              }
              
              if (result) {
                // Try to extract xpub from result
                if (typeof result === 'object' && 'xpub' in result) {
                  xpubToUse = (result as any).xpub
                  console.log('Found xpub in WebLN result:', xpubToUse?.substring(0, 20) + '...')
                }
              }
              
              // If we have xpub, set the session cookie
              if (xpubToUse) {
                console.log('Setting session cookie with xpub from WebLN result')
                const sessionRes = await fetch('/api/auth/set-session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ xpub: xpubToUse, k1: challenge }),
                })
                
                console.log('Set-session response status:', sessionRes.status)
                
                if (sessionRes.ok) {
                  // Wait a bit for cookie to propagate
                  await new Promise(resolve => setTimeout(resolve, 300))
                  
                  // Verify the session was set
                  const userRes = await fetch('/api/user', {
                    credentials: 'include',
                    cache: 'no-store',
                  })
                  
                  console.log('User API response status:', userRes.status)
                  
                  if (userRes.ok) {
                    const userData = await userRes.json()
                    console.log('Login successful, user:', userData)
                    handleLoginSuccess()
                    return
                  } else {
                    const errorText = await userRes.text().catch(() => 'Unknown error')
                    console.error('Failed to verify session after setting cookie:', errorText)
                  }
                } else {
                  const errorText = await sessionRes.text().catch(() => 'Unknown error')
                  console.error('Failed to set session cookie:', errorText)
                }
              } else {
                console.log('No xpub in WebLN result, will try to fetch from server using k1')
                // Try to get xpub from server using the k1 challenge
                try {
                  console.log('Waiting for callback to complete (5 seconds)...')
                  console.log('NOTE: Alby should call the callback URL automatically. If this fails, the callback may not be working.')
                  
                  // Poll the callback endpoint directly to see if it completed
                  // The callback should have already been called by Alby, so we can try calling it again
                  // with a dummy request to check if the session was stored
                  await new Promise(resolve => setTimeout(resolve, 2000))
                  
                  console.log('Fetching xpub from server using k1:', challenge.substring(0, 16) + '...')
                  let xpubRes = await fetch(`/api/auth/get-xpub?k1=${encodeURIComponent(challenge)}`, {
                    credentials: 'include',
                  })
                  
                  console.log('Get-xpub response status:', xpubRes.status)
                  
                  // Retry get-xpub a few times in case callback is still processing
                  let retries = 5
                  while (!xpubRes.ok && retries > 0) {
                    console.log(`Get-xpub failed (${xpubRes.status}), retrying... (${retries} left)`)
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    xpubRes = await fetch(`/api/auth/get-xpub?k1=${encodeURIComponent(challenge)}`, {
                      credentials: 'include',
                    })
                    retries--
                  }
                  
                  if (xpubRes.ok) {
                    const { xpub: serverXpub } = await xpubRes.json()
                    if (serverXpub) {
                      console.log('Retrieved xpub from server:', serverXpub.substring(0, 20) + '...')
                      xpubToUse = serverXpub
                      
                      // Set session with retrieved xpub
                      if (xpubToUse) {
                        console.log('Calling /api/auth/set-session with xpub:', xpubToUse.substring(0, 20) + '...')
                        const sessionRes = await fetch('/api/auth/set-session', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ xpub: xpubToUse, k1: challenge }),
                        })
                        
                        console.log('Set-session response status:', sessionRes.status)
                        const sessionData = await sessionRes.json().catch(() => ({}))
                        console.log('Set-session response:', sessionData)
                        
                        if (sessionRes.ok) {
                          console.log('Session set successfully, response data:', sessionData)
                          console.log('Note: httpOnly cookies won\'t appear in document.cookie (this is expected)')
                          
                          // Test if cookie is being set by checking a test endpoint
                          await new Promise(resolve => setTimeout(resolve, 500))
                          const testCookieRes = await fetch('/api/test-cookie', {
                            credentials: 'include',
                          })
                          const testCookieData = await testCookieRes.json()
                          console.log('Test cookie endpoint result:', testCookieData)
                          
                          // Wait a bit longer for cookie to be set
                          await new Promise(resolve => setTimeout(resolve, 500))
                          
                          // Try multiple times with increasing delays
                          for (let attempt = 0; attempt < 5; attempt++) {
                            console.log(`Attempting /api/user call ${attempt + 1}/5...`)
                            
                            // Test cookie again before each attempt
                            const testRes = await fetch('/api/test-cookie', {
                              credentials: 'include',
                            })
                            const testData = await testRes.json()
                            console.log(`Cookie test before attempt ${attempt + 1}:`, testData.userXpub ? 'FOUND' : 'NOT FOUND', testData.userXpub)
                            
                            const userRes = await fetch('/api/user', {
                              method: 'GET',
                              credentials: 'include', // Important: must include credentials to send cookies
                              cache: 'no-store',
                              headers: {
                                'Accept': 'application/json',
                              },
                            })
                            
                            console.log(`User API attempt ${attempt + 1} status:`, userRes.status)
                            
                            if (userRes.ok) {
                              const userData = await userRes.json()
                              console.log('Login successful using server xpub, user:', userData)
                              handleLoginSuccess()
                              return
                            } else {
                              const errorText = await userRes.text().catch(() => 'Unknown error')
                              console.log(`User API attempt ${attempt + 1} failed:`, errorText)
                              if (attempt < 4) {
                                await new Promise(resolve => setTimeout(resolve, 1000))
                              }
                            }
                          }
                          console.error('Failed to verify session after 5 attempts')
                          console.error('Cookie test shows:', testCookieData.userXpub ? 'Cookie IS being sent' : 'Cookie is NOT being sent')
                        } else {
                          const errorText = await sessionRes.text().catch(() => 'Unknown error')
                          console.error('Failed to set session:', errorText)
                        }
                      }
                    }
                  } else {
                    const errorText = await xpubRes.text().catch(() => 'Unknown error')
                    console.log('Could not retrieve xpub from server:', errorText)
                    console.log('This might mean the callback hasn\'t completed yet or the k1 challenge expired')
                    
                    // Last resort: Try to derive xpub from the key if we have it
                    if (keyFromResult) {
                      console.log('Attempting to derive xpub from key found in WebLN result...')
                      try {
                        // Call a server endpoint to derive xpub from key
                        const deriveRes = await fetch('/api/auth/derive-xpub', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ key: keyFromResult }),
                        })
                        
                        if (deriveRes.ok) {
                          const { xpub: derivedXpub } = await deriveRes.json()
                          console.log('Derived xpub from key:', derivedXpub.substring(0, 20) + '...')
                          xpubToUse = derivedXpub
                          
                          // Set session with derived xpub
                          if (xpubToUse) {
                            console.log('Calling /api/auth/set-session with derived xpub...')
                            const sessionRes = await fetch('/api/auth/set-session', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ xpub: xpubToUse, k1: challenge }),
                            })
                            
                            if (sessionRes.ok) {
                              console.log('Session set successfully with derived xpub')
                              // Wait and check for user
                              await new Promise(resolve => setTimeout(resolve, 500))
                              
                              const userRes = await fetch('/api/user', {
                                credentials: 'include',
                              })
                              
                              if (userRes.ok) {
                                const userData = await userRes.json()
                                console.log('Login successful with derived xpub, user:', userData)
                                handleLoginSuccess()
                                return
                              } else {
                                console.error('Failed to get user after setting session:', await userRes.text())
                              }
                            } else {
                              console.error('Failed to set session with derived xpub:', await sessionRes.text())
                            }
                          }
                        } else {
                          console.error('Failed to derive xpub from key:', await deriveRes.text())
                        }
                      } catch (deriveError) {
                        console.error('Error deriving xpub from key:', deriveError)
                      }
                    } else {
                      console.log('No key found in WebLN result, cannot derive xpub')
                      console.log('WebLN result keys:', result && typeof result === 'object' ? Object.keys(result) : 'N/A')
                      console.log('Full WebLN result:', result)
                      
                      // Try to extract key from result.sig or result if it's a string
                      if (result && typeof result === 'object') {
                        // Some wallets return the key in different places
                        const possibleKey = (result as any).key || (result as any).pubkey || (result as any).publicKey
                        if (possibleKey) {
                          console.log('Found key in alternative location:', possibleKey.substring(0, 20) + '...')
                          keyFromResult = possibleKey
                          // Retry derivation with this key
                          try {
                            const deriveRes = await fetch('/api/auth/derive-xpub', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ key: keyFromResult }),
                            })
                            if (deriveRes.ok) {
                              const { xpub: derivedXpub } = await deriveRes.json()
                              xpubToUse = derivedXpub
                              // Set session and redirect
                              const sessionRes = await fetch('/api/auth/set-session', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ xpub: xpubToUse, k1: challenge }),
                              })
                              if (sessionRes.ok) {
                                await new Promise(resolve => setTimeout(resolve, 500))
                                const userRes = await fetch('/api/user', { credentials: 'include' })
                                if (userRes.ok) {
                                  handleLoginSuccess()
                                  return
                                }
                              }
                            }
                          } catch (e) {
                            console.error('Error with alternative key extraction:', e)
                          }
                        }
                      }
                    }
                  }
                } catch (fetchError) {
                  console.error('Error fetching xpub from server:', fetchError)
                }
              }
              
              // Fallback: Wait longer and check if cookie was set by callback
              console.log('Waiting for callback to complete and cookie to be set...')
              await new Promise(resolve => setTimeout(resolve, 2000))
              
              // Try multiple times to check for session
              let userRes = await fetch('/api/user', {
                credentials: 'include',
                cache: 'no-store',
              })
              
              let retries = 3
              while (!userRes.ok && retries > 0) {
                console.log(`Session check failed (${userRes.status}), retrying... (${retries} left)`)
                await new Promise(resolve => setTimeout(resolve, 500))
                userRes = await fetch('/api/user', {
                  credentials: 'include',
                  cache: 'no-store',
                })
                retries--
              }
              
              if (userRes.ok) {
                const userData = await userRes.json()
                console.log('Session found after WebLN callback, user:', userData)
                handleLoginSuccess()
                return
              } else {
                const errorText = await userRes.text().catch(() => 'Unknown error')
                console.error('Session not found after WebLN callback')
                console.error('Error response:', errorText)
                console.error('Response status:', userRes.status)
                console.error('All cookies:', document.cookie)
                throw new Error('Session not found after WebLN authentication')
              }
            } catch (lnurlError) {
              console.error('WebLN lnurl error:', lnurlError)
              throw lnurlError // Re-throw to show QR code
            }
          } else {
            console.log('WebLN lnurl method not available')
          }
        } catch (weblnError) {
          // WebLN failed, show QR code
          console.error('WebLN error:', weblnError)
          console.log('Falling back to QR code')
        }
      } else {
        console.log('WebLN not available, redirecting to QR code page')
        // Redirect to enhanced QR code page instead of showing inline QR code
        window.location.href = `/embed/qr?k1=${encodeURIComponent(challenge)}`
        return // Exit early since we're redirecting
      }

      // If we reach here, WebLN was attempted but failed
      // Redirect to enhanced QR code page for better mobile experience
      console.log('WebLN failed, redirecting to QR code page')
      window.location.href = `/embed/qr?k1=${encodeURIComponent(challenge)}`
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
                width={128}
                height={56}
                className="h-full max-h-full w-full object-contain"
                style={{ maxHeight: '100%', transform: 'scale(2.5)', transformOrigin: 'center' }}
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
          <div className="relative w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-orange-500/20 overflow-hidden" style={{ marginTop: '10rem' }}>
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


