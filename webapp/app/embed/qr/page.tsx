'use client'

import { useEffect, useState, Suspense, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import Layout from '@/components/Layout'
import Card from '@/components/Card'
import Button from '@/components/Button'
import { useToast } from '@/components/ToastContainer'
import CopySuccessModal from '@/components/CopySuccessModal'

function QRContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const siteId = searchParams.get('siteId')
  const rawK1 = searchParams.get('k1')
  // Validate k1 - must be a 64-char hex string (32 bytes). Reject "undefined", "null", or other invalid values.
  const k1 = rawK1 && /^[0-9a-fA-F]{64}$/.test(rawK1) ? rawK1 : null
  const isAdmin = searchParams.get('admin') === 'true'
  const isRedirect = searchParams.get('redirect') === 'true'
  const isAuthenticated = searchParams.get('authenticated') === 'true' // Wallet redirect after auth
  const returnUrl = searchParams.get('returnUrl')
  const parentOrigin = searchParams.get('parentOrigin') // Origin of the parent window (for cross-origin postMessage)
  const [qrCode, setQrCode] = useState<string>('')
  const [lnurl, setLnurl] = useState<string>('')
  const [lightningLnurl, setLightningLnurl] = useState<string>('')
  const [isMobile, setIsMobile] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [authStatus, setAuthStatus] = useState<'waiting' | 'success' | 'error'>('waiting')
  const [authMessage, setAuthMessage] = useState<string>('')
  const [retrievedXpub, setRetrievedXpub] = useState<string | null>(null)
  const [isPopup, setIsPopup] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number>(300) // 5 minutes in seconds
  const [showScanningTips, setShowScanningTips] = useState(false)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true) // User preference for sound
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'slow' | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [deepLinkAttempted, setDeepLinkAttempted] = useState(false)
  const [showReturnReminder, setShowReturnReminder] = useState(false)
  const [tabWasHidden, setTabWasHidden] = useState(false)
  const [showPersistentReminder, setShowPersistentReminder] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'mobile' | 'desktop'>('mobile')
  const [selectedWallet, setSelectedWallet] = useState<string>('') // Phase 2: Wallet selector
  const [showWalletPicker, setShowWalletPicker] = useState(false) // Wallet picker for iOS
  const [showCopyModal, setShowCopyModal] = useState(false) // Enhanced copy feedback modal
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const expirationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const networkCheckRef = useRef<NodeJS.Timeout | null>(null)
  const deepLinkTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const redirectCancelledRef = useRef<boolean>(false)
  const urlUpdateRef = useRef<boolean>(false) // Track if we've updated the URL to prevent loops
  const currentK1Ref = useRef<string | null>(k1) // Track active k1 (updates on QR refresh)
  const pollFnRef = useRef<(() => Promise<void>) | null>(null) // Current poll function for immediate visibility-triggered checks
  const authSucceededRef = useRef<boolean>(false) // Guard against concurrent doPoll race conditions
  const toast = useToast()
  
  // Detect if opened in popup (not redirect mode and has opener)
  useEffect(() => {
    // If redirect=true, it's not a popup (full redirect mode)
    const redirectMode = searchParams.get('redirect') === 'true'
    setIsPopup(!redirectMode && !!window.opener && !window.opener.closed)
    
    // Listen for beforeunload to notify parent if popup is closed manually (only for popup mode)
    const handleBeforeUnload = () => {
      try {
        if (!redirectMode && window.opener && !window.opener.closed) {
          const targetOrigin = parentOrigin || '*'
          window.opener.postMessage({
            type: 'keyrex-popup-closed',
            siteId: siteId
          }, targetOrigin)
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    if (!redirectMode) {
      window.addEventListener('beforeunload', handleBeforeUnload)
      return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [siteId, searchParams])

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
      const isSmallScreen = window.innerWidth < 768
      setIsMobile(isMobileDevice || isSmallScreen)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Set default tab to desktop for desktop users (to highlight the improvement)
  useEffect(() => {
    if (!isMobile && !isAdmin) {
      setActiveTab('desktop')
    }
  }, [isMobile, isAdmin])

  // Handle wallet redirect back to browser (authenticated=true in URL)
  // When the wallet supports redirect-after-auth, it opens this page with authenticated=true.
  // Immediately trigger rapid polling to detect the auth and redirect the user.
  useEffect(() => {
    if (!isAuthenticated || authSucceededRef.current) return
    const activeK1 = k1 || currentK1Ref.current
    if (!activeK1) return

    console.log('[QR Page] Wallet redirected back with authenticated=true, triggering rapid auth checks')

    // Rapid polling: check immediately, then at short intervals
    const checkAuth = async () => {
      if (authSucceededRef.current) return
      if (pollFnRef.current) {
        pollFnRef.current()
      }
    }

    checkAuth()
    const t1 = setTimeout(checkAuth, 500)
    const t2 = setTimeout(checkAuth, 1500)
    const t3 = setTimeout(checkAuth, 3000)
    const t4 = setTimeout(checkAuth, 5000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [isAuthenticated, k1])

  // Page Visibility API - Detect when user returns to tab after deep link
  // Enhanced: triggers immediate auth check on return to fix mobile browser timer throttling
  // Mobile browsers (iOS Safari, Chrome Android) pause/throttle setInterval when tabs are
  // in the background. Without this, users returning from wallet apps experience delays
  // or missed auth detection.
  useEffect(() => {
    if (authStatus !== 'waiting') return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isMobile && deepLinkAttempted) {
          setTabWasHidden(true)
          setShowReturnReminder(true)
        }
      } else if (document.visibilityState === 'visible') {
        // Show UI reminder if applicable
        if (isMobile && deepLinkAttempted && tabWasHidden) {
          setShowPersistentReminder(true)
          setTimeout(() => {
            setShowPersistentReminder(false)
          }, 10000)
        }

        // Trigger rapid auth checks when returning - mobile browsers throttle/pause
        // setInterval when tabs are in the background. The wallet callback may
        // still be in-flight, so retry a few times with short delays.
        if (pollFnRef.current && !authSucceededRef.current) {
          console.log('[QR Page] Tab became visible, triggering rapid auth checks')
          pollFnRef.current()
          // Retry after short delays in case wallet callback is still completing
          setTimeout(() => { if (pollFnRef.current && !authSucceededRef.current) pollFnRef.current() }, 1500)
          setTimeout(() => { if (pollFnRef.current && !authSucceededRef.current) pollFnRef.current() }, 4000)
        }
      }
    }

    // iOS Safari: pageshow fires more reliably than visibilitychange when
    // returning from deep links (e.g., lightning: wallet app)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && pollFnRef.current && !authSucceededRef.current) {
        console.log('[QR Page] pageshow (bfcache restore) - triggering immediate auth check')
        pollFnRef.current()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [isMobile, deepLinkAttempted, tabWasHidden, authStatus])

  // Refresh QR code function
  const refreshQRCode = useCallback(async () => {
    if (isRefreshing) return

    setIsRefreshing(true)
    setLoading(true)
    setTimeRemaining(300) // Reset timer

    try {
      // Get new challenge from server
      const lnurlRes = await fetch('/api/auth/lnurl')
      if (!lnurlRes.ok) {
        throw new Error('Failed to get new challenge')
      }

      const { k1: newK1, lnurl: lnurlBech32 } = await lnurlRes.json()

      // Update the active k1 ref so polling uses the new k1
      currentK1Ref.current = newK1

      // DON'T update URL - just update state internally
      // Updating the URL causes re-renders and infinite loops

      // Generate new QR code
      const domain = window.location.origin
      let callbackUrl: string
      if (isAdmin) {
        callbackUrl = `${domain}/api/admin/auth/login?k1=${newK1}`
      } else {
        callbackUrl = siteId
          ? `${domain}/api/auth/callback?tag=login&k1=${newK1}&siteId=${siteId}`
          : `${domain}/api/auth/callback?tag=login&k1=${newK1}`
      }

      const plainLnurl = callbackUrl
      // CRITICAL FIX: Use bech32-encoded LNURL for lightning: protocol for mobile wallet deep linking
      // Mobile wallets like Zeus expect lightning:lnurl1... format, not lightning:https://...
      const lightningBech32 = `lightning:${lnurlBech32}`

      setLnurl(plainLnurl)
      setLightningLnurl(lightningBech32)

      // Generate QR code with bare bech32 LNURL (no lightning: prefix)
      // Wallets scanning QR codes expect just lnurl1... and will decode it to get callback URL
      // The lightning: prefix is only for deep links, not QR codes
      const qrSize = isMobile ? 300 : 350
      QRCode.toDataURL(lnurlBech32, {
        width: qrSize,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      .then((dataUrl) => {
        setQrCode(dataUrl)
        setLoading(false)
        setIsRefreshing(false)
        setAuthStatus('waiting')
        toast.showSuccess('New QR code generated. Please scan again.')
      })
      .catch((err) => {
        console.error('QR code generation error:', err)
        setLoading(false)
        setIsRefreshing(false)
        toast.showError('Failed to generate new QR code. Please try again.')
      })
    } catch (error) {
      console.error('Error refreshing QR code:', error)
      setLoading(false)
      setIsRefreshing(false)
      toast.showError('Failed to refresh QR code. Please try again.')
    }
  }, [isRefreshing, isAdmin, siteId, isMobile, toast])

  // Expiration timer countdown with auto-refresh
  useEffect(() => {
    if (!qrCode || loading || authStatus !== 'waiting') {
      setTimeRemaining(300) // Reset to 5 minutes
      return
    }

    expirationTimerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // QR code expired - auto-refresh
          if (!isRefreshing && authStatus === 'waiting') {
            refreshQRCode()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (expirationTimerRef.current) {
        clearInterval(expirationTimerRef.current)
        expirationTimerRef.current = null
      }
    }
  }, [qrCode, loading, authStatus, isRefreshing, refreshQRCode])

  // Network status monitoring - reduced frequency to avoid rate limiting
  useEffect(() => {
    if (!qrCode || loading || authStatus !== 'waiting' || isRefreshing) {
      setNetworkStatus(null)
      return
    }

    let consecutiveFailures = 0
    const checkNetwork = async () => {
      try {
        const startTime = Date.now()
        const activeK1 = currentK1Ref.current || k1
        const response = await fetch(`/api/auth/callback?k1=${encodeURIComponent(activeK1 || '')}&siteId=${encodeURIComponent(siteId || '')}`, {
          method: 'GET',
          credentials: 'include',
          signal: AbortSignal.timeout(3000) // 3 second timeout
        })
        const duration = Date.now() - startTime

        if (response.ok || response.status === 400) {
          // Request succeeded (400 is expected if no xpub yet)
          consecutiveFailures = 0
          if (duration > 2000) {
            setNetworkStatus('slow')
          } else {
            setNetworkStatus('online')
          }
        } else {
          consecutiveFailures++
          if (consecutiveFailures >= 3) {
            setNetworkStatus('offline')
          }
        }
      } catch (error) {
        consecutiveFailures++
        if (consecutiveFailures >= 3) {
          setNetworkStatus('offline')
        }
      }
    }

    // Check network every 10 seconds (reduced from 5) to avoid rate limiting
    networkCheckRef.current = setInterval(checkNetwork, 10000)
    checkNetwork() // Initial check

    return () => {
      if (networkCheckRef.current) {
        clearInterval(networkCheckRef.current)
        networkCheckRef.current = null
      }
    }
  }, [qrCode, loading, authStatus, k1, siteId, isRefreshing])

  // Countdown timer for redirect
  useEffect(() => {
    if (redirectCountdown === null || redirectCountdown <= 0) return
    
    const timer = setInterval(() => {
      setRedirectCountdown(prev => {
        if (prev === null || prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [redirectCountdown])

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Play subtle success sound
  const playSuccessSound = () => {
    try {
      // Create a subtle success sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Pleasant two-tone chime
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime) // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1) // E5
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime) // Volume at 30%
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (e) {
      // Silently fail if audio context is not available
      console.log('Audio not available:', e)
    }
  }

  // Reset success animation after display
  useEffect(() => {
    if (showSuccessAnimation) {
      const timer = setTimeout(() => {
        setShowSuccessAnimation(false)
      }, 2000) // Animation duration
      return () => clearTimeout(timer)
    }
  }, [showSuccessAnimation])

  // Generate QR code and LNURL
  // Use a ref to prevent multiple simultaneous fetches
  const qrFetchRef = useRef(false)
  const initialK1Ref = useRef<string | null>(null)

  useEffect(() => {
    // Prevent multiple simultaneous fetches
    if (qrFetchRef.current) return

    // If we've already processed this k1, skip (but allow null→null for first run with missing k1)
    if (k1 && initialK1Ref.current === k1) return
    if (!k1 && initialK1Ref.current === 'generated') return

    qrFetchRef.current = true
    initialK1Ref.current = k1 || 'generated'
    setLoading(true)

    if (rawK1 && rawK1 !== k1) {
      console.warn('[QR Page] Invalid k1 in URL params:', JSON.stringify(rawK1), '- generating fresh challenge')
    }

    // If k1 is valid, pass it to the server. Otherwise let the server generate a new one.
    let lnurlApiUrl = '/api/auth/lnurl'
    const params: string[] = []
    if (k1) {
      params.push(`k1=${encodeURIComponent(k1)}`)
    }
    if (siteId) {
      params.push(`siteId=${encodeURIComponent(siteId)}`)
    }
    if (params.length > 0) {
      lnurlApiUrl += '?' + params.join('&')
    }

    console.log('[QR Page] Starting QR code generation, k1:', k1 ? k1.substring(0, 16) + '...' : '(server will generate)')
    console.log('[QR Page] Fetching LNURL from:', lnurlApiUrl)

    // Fetch bech32-encoded LNURL from server
    fetch(lnurlApiUrl, {
      credentials: 'include',
    })
      .then(async res => {
        console.log('[QR Page] LNURL fetch response status:', res.status)
        if (!res.ok) {
          const errorText = await res.text()
          let errorMessage = 'Failed to get LNURL from server'
          try {
            const errorData = JSON.parse(errorText)
            errorMessage = errorData.error || errorMessage
          } catch {
            errorMessage = errorText || errorMessage
          }
          console.error('[QR Page] LNURL fetch failed:', res.status, errorMessage)

          // If rate limited, show user-friendly message
          if (res.status === 429) {
            console.log('[QR Page] Rate limited')
            toast.showError('Too many requests. Please wait a moment and try again.')
            setLoading(false)
            qrFetchRef.current = false
            return null
          }

          throw new Error(`${errorMessage} (Status: ${res.status})`)
        }
        const data = await res.json()
        console.log('[QR Page] LNURL fetch successful')
        return data
      })
      .then(data => {
        if (!data) {
          console.log('[QR Page] No data returned (rate limited), aborting')
          return
        }

        // If the server generated a new k1 (because URL param was missing/invalid),
        // update our tracking ref so polling uses the correct k1
        if (data.k1 && data.k1 !== k1) {
          console.log('[QR Page] Server generated new k1:', data.k1.substring(0, 16) + '...')
          currentK1Ref.current = data.k1
        }

        const lnurlBech32 = data.lnurl

        if (!lnurlBech32) {
          console.error('[QR Page] No lnurlBech32 in response data')
          throw new Error('No LNURL received from server')
        }

        console.log('[QR Page] Generating QR code with bech32 LNURL, length:', lnurlBech32.length)

        // CRITICAL FIX: Use bech32-encoded LNURL for mobile wallet deep linking
        // Mobile wallets like Zeus expect lightning:lnurl1... format, not lightning:https://...
        const lightningBech32 = `lightning:${lnurlBech32}`

        // Update state with proper LNURL values
        setLnurl(data.callback)
        setLightningLnurl(lightningBech32)
        console.log('[QR Page] Updated lightning URL with bech32 LNURL for mobile deep linking')

        // Generate QR code with bare bech32 LNURL (no lightning: prefix)
        // Wallets scanning QR codes expect just lnurl1... and will decode it to get callback URL
        // The lightning: prefix is only for deep links, not QR codes
        const qrSize = isMobile ? 280 : 320
        return QRCode.toDataURL(lnurlBech32, {
          width: qrSize,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
      })
      .then((dataUrl) => {
        if (dataUrl) {
          console.log('[QR Page] QR code generated successfully')
          setQrCode(dataUrl)
          setLoading(false)
          setAuthStatus('waiting')
          setAuthMessage(isAdmin ? 'Waiting for authentication...' : '')
          qrFetchRef.current = false
        } else {
          console.error('[QR Page] QR code generation returned no dataUrl')
          toast.showError('Failed to generate QR code. Please try again.')
          setLoading(false)
          qrFetchRef.current = false
        }
      })
      .catch((err) => {
        console.error('[QR Page] QR code generation error:', err)
        toast.showError('Failed to generate QR code. Please try again.')
        setLoading(false)
        qrFetchRef.current = false
      })
  }, [k1, rawK1, siteId, isMobile, isAdmin, toast])

  // Poll for admin authentication status
  useEffect(() => {
    const activeK1 = k1 || currentK1Ref.current
    if (!isAdmin || !activeK1 || loading || !qrCode) return

    let pollCount = 0
    const maxPolls = 40 // Poll for up to 80 seconds (40 * 2 second intervals)

    const doPoll = async () => {
      // Guard: prevent concurrent polls from racing
      if (authSucceededRef.current) return
      pollCount++

      try {
        const verifyRes = await fetch('/api/admin/auth/verify', {
          credentials: 'include',
        })

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json()
          if (verifyData.isAdmin) {
            authSucceededRef.current = true
            // Authentication successful
            setAuthStatus('success')
            setAuthMessage('Authentication successful! Redirecting...')

            // Clear polling interval
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }

            // Redirect to admin dashboard after short delay
            setTimeout(() => {
              router.push('/admin/dashboard')
            }, 1500)
            return
          }
        }

        // If we've polled too many times, stop and show error
        if (pollCount >= maxPolls) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          setAuthStatus('error')
          setAuthMessage('Authentication timed out. Please try again or scan the QR code again.')
        }
      } catch (error) {
        console.error('Error polling admin auth status:', error)
        // Don't stop polling on network errors, just log them
      }
    }

    // Expose poll function for immediate visibility-triggered checks
    pollFnRef.current = doPoll

    // Start polling after a short delay to allow QR code to be scanned
    const delay = setTimeout(() => {
      pollingIntervalRef.current = setInterval(doPoll, 2000)
    }, 2000) // Wait 2 seconds before starting to poll

    // Cleanup function
    return () => {
      pollFnRef.current = null
      clearTimeout(delay)
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [isAdmin, k1, loading, qrCode, router])

  // Poll for dashboard login (no siteId, not admin)
  useEffect(() => {
    if (isAdmin || siteId || !(k1 || currentK1Ref.current) || loading || !qrCode || isRefreshing) return

    // This is a dashboard login (no siteId) - poll for xpub and redirect to dashboard
    let pollCount = 0
    const maxPolls = 40 // Poll for up to 80 seconds

    const doPoll = async () => {
      // Guard: prevent concurrent polls from racing (visibilitychange + setInterval can fire together)
      if (authSucceededRef.current) return
      pollCount++

      try {
        // Use currentK1Ref to handle QR refresh (new k1) correctly
        const activeK1 = currentK1Ref.current || k1
        if (!activeK1) return // Safety check - shouldn't happen due to useEffect guard
        // Poll the callback endpoint to retrieve stored xpub (no siteId parameter)
        const callbackUrl = `/api/auth/callback?k1=${encodeURIComponent(activeK1)}&tag=login`
        const retrieveRes = await fetch(callbackUrl, {
          credentials: 'include',
        })

        if (retrieveRes.ok) {
          const retrieveData = await retrieveRes.json()

          // Check if we got the xpub
          if (retrieveData.status === 'OK' && retrieveData.xpub) {
            // Double-check guard: another concurrent poll may have succeeded while we awaited
            if (authSucceededRef.current) return
            authSucceededRef.current = true

            const xpub = retrieveData.xpub

            console.log('Dashboard login successful, xpub:', xpub.substring(0, 20) + '...')

            // Set session cookie - use activeK1 (not URL param k1) to match the signed challenge
            const sessionRes = await fetch('/api/auth/set-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ xpub, k1: activeK1 }),
            })

            if (!sessionRes.ok) {
              console.error('Failed to set session')
              authSucceededRef.current = false // Allow retry
              setAuthStatus('error')
              setAuthMessage('Failed to set session. Please try again.')
              return
            }

            // Authentication successful
            setAuthStatus('success')
            setRetrievedXpub(xpub)
            setShowSuccessAnimation(true)

            if (soundEnabled) {
              playSuccessSound()
            }

            // Clear polling interval
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }

            // Wait for cookie to propagate, then check wizard status and redirect
            setTimeout(async () => {
              try {
                // Check if user has completed the wizard
                const userRes = await fetch('/api/user', {
                  credentials: 'include',
                  cache: 'no-store',
                })

                if (userRes.ok) {
                  const userData = await userRes.json()

                  // Check if wizard is complete
                  if (!userData.freeDisclaimerAccepted) {
                    console.log('Dashboard login: User has not completed wizard - redirecting to home with wizard=true')
                    window.location.href = '/?wizard=true'
                    return
                  }

                  console.log('Dashboard login: User has completed wizard')
                }

                // Wizard is complete - always redirect to dashboard for dashboard logins
                // (returnUrl is only used in the embed/siteId flow for client website redirects)
                console.log('Dashboard login: Redirecting to dashboard')
                router.push('/dashboard')
              } catch (error) {
                console.error('Error checking wizard status:', error)
                // On error, redirect to home with wizard
                window.location.href = '/?wizard=true'
              }
            }, 1500)
            return
          }
        }

        // If we've polled too many times, stop and show error
        if (pollCount >= maxPolls) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          setAuthStatus('error')
          setAuthMessage('Authentication timed out. Please try again or scan the QR code again.')
        }
      } catch (error) {
        console.error('Error polling dashboard auth status:', error)
      }
    }

    // Expose poll function for immediate visibility-triggered checks
    pollFnRef.current = doPoll

    // Start polling after a short delay
    const delay = setTimeout(() => {
      pollingIntervalRef.current = setInterval(doPoll, 2000)
    }, 2000)

    // Cleanup function
    return () => {
      pollFnRef.current = null
      clearTimeout(delay)
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [isAdmin, k1, loading, qrCode, siteId, isRefreshing, returnUrl, soundEnabled, router])

  // Poll for regular user authentication status (retrieve xpub from callback)
  useEffect(() => {
    if (isAdmin || !(k1 || currentK1Ref.current) || loading || !qrCode || !siteId || isRefreshing) return

    let pollCount = 0
    const maxPolls = 40 // Poll for up to 80 seconds (40 * 2 second intervals)

    const doPoll = async () => {
      // Guard: prevent concurrent polls from racing (visibilitychange + setInterval can fire together)
      if (authSucceededRef.current) return
      pollCount++

      try {
        // Use currentK1Ref to handle QR refresh (new k1) correctly
        const activeK1 = currentK1Ref.current || k1
        if (!activeK1) return // Safety check - shouldn't happen due to useEffect guard
        // Poll the callback endpoint to retrieve stored xpub
        const callbackUrl = `/api/auth/callback?k1=${encodeURIComponent(activeK1)}&siteId=${encodeURIComponent(siteId)}`
        const retrieveRes = await fetch(callbackUrl, {
          credentials: 'include',
        })

        if (retrieveRes.ok) {
          const retrieveData = await retrieveRes.json()

          // Check if we got the xpub (status: 'OK' means xpub is available)
          if (retrieveData.status === 'OK' && retrieveData.xpub) {
            // Double-check guard: another concurrent poll may have succeeded while we awaited
            if (authSucceededRef.current) return
            authSucceededRef.current = true

            const xpub = retrieveData.xpub

            // Authentication successful
            setAuthStatus('success')
            setRetrievedXpub(xpub)

            // Show success animation
            setShowSuccessAnimation(true)

            // Play success sound (if enabled)
            if (soundEnabled) {
              playSuccessSound()
            }

            // Clear polling interval
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }

            // Try to communicate with parent window if available (for popup scenarios)
            try {
              if (window.opener && !window.opener.closed) {
                // Use the parent's origin for postMessage (passed via URL param from embed script)
                // The popup is on the Key-Rex domain, but the parent is the client site (different origin)
                const targetOrigin = parentOrigin || '*'

                // If opened in popup, send message to parent
                window.opener.postMessage({
                  type: 'keyrex-auth-success',
                  xpub: xpub,
                  siteId: siteId,
                  k1: activeK1
                }, targetOrigin)

                console.log('[QR Page] Sent keyrex-auth-success postMessage to parent, targetOrigin:', targetOrigin)

                // Update success message for popup context
                setAuthMessage('Authentication successful! This window will close automatically.')

                // Close popup after short delay
                setTimeout(() => {
                  try { window.close() } catch (e) { /* ignore */ }
                }, 1500)
                return
              }
            } catch (e) {
              // postMessage might fail due to cross-origin, that's okay
              console.log('Could not communicate with parent window:', e)
            }

            // If in redirect mode (not popup), xpub is passed via URL parameter
            // (No need to store in cookie - it's passed in the redirect URL)
            if (isRedirect && !isPopup && xpub) {
              console.log('Redirect mode: xpub will be passed via URL parameter')
              setRetrievedXpub(xpub)
              setAuthStatus('success')
              setAuthMessage('Authentication successful!')

              // Show success animation
              setShowSuccessAnimation(true)
              if (soundEnabled) {
                playSuccessSound()
              }

              // Auto-redirect back to return URL if available (after showing success)
              // SECURITY: Validate returnUrl against allowed domains to prevent open redirect attacks
              // Priority: 1. returnUrl parameter, 2. httpOnly cookie (via API), 3. document.referrer
              let redirectTo: string | null = null;
              if (returnUrl) {
                redirectTo = decodeURIComponent(returnUrl);
                console.log('Key-Rex QR: Using returnUrl parameter:', redirectTo);
              } else {
                // Check httpOnly cookie via API as backup
                try {
                  const cookieRes = await fetch('/api/auth/get-k1', {
                    credentials: 'include',
                  });
                  if (cookieRes.ok) {
                    const cookieData = await cookieRes.json();
                    if (cookieData.returnUrl) {
                      redirectTo = cookieData.returnUrl;
                      console.log('Key-Rex QR: Using returnUrl from httpOnly cookie:', redirectTo);
                    }
                  }
                } catch (e) {
                  console.warn('Key-Rex QR: Failed to read returnUrl from cookie:', e);
                }
              }

              // Fallback to document.referrer (only if it's from an allowed domain)
              if (!redirectTo && document.referrer && document.referrer !== window.location.href) {
                redirectTo = document.referrer;
                console.log('Key-Rex QR: Using document.referrer:', redirectTo);
              }

              // SECURITY: Validate returnUrl against allowed domains before redirecting
              if (redirectTo && siteId) {
                try {
                  const validateRes = await fetch('/api/auth/validate-return-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ returnUrl: redirectTo, siteId }),
                  });

                  if (validateRes.ok) {
                    const validateData = await validateRes.json();
                    if (validateData.isValid && validateData.validatedUrl) {
                      redirectTo = validateData.validatedUrl;
                      console.log('Key-Rex QR: returnUrl validated:', redirectTo);
                    } else {
                      console.error('Key-Rex QR: returnUrl validation failed - redirect blocked for security');
                      console.error('Key-Rex QR: Invalid returnUrl:', redirectTo);
                      redirectTo = null; // Block redirect to unauthorized domain
                    }
                  } else {
                    console.error('Key-Rex QR: Failed to validate returnUrl - redirect blocked for security');
                    redirectTo = null; // Block redirect if validation fails
                  }
                } catch (e) {
                  console.error('Key-Rex QR: Error validating returnUrl - redirect blocked for security:', e);
                  redirectTo = null; // Block redirect if validation errors
                }
              }

              if (redirectTo) {
                // Append xpub to returnUrl so client site can detect authentication
                try {
                  const returnUrlObj = new URL(redirectTo);
                  returnUrlObj.searchParams.set('xpub', xpub);
                  redirectTo = returnUrlObj.toString();
                  console.log('Key-Rex QR: Added xpub to returnUrl');
                } catch (e) {
                  // If returnUrl is relative, append as query param
                  const separator = redirectTo.includes('?') ? '&' : '?';
                  redirectTo = redirectTo + separator + 'xpub=' + encodeURIComponent(xpub);
                  console.log('Key-Rex QR: Added xpub to returnUrl (relative path)');
                }

                // Reset cancellation flag
                redirectCancelledRef.current = false

                // Start countdown from 3
                setRedirectCountdown(3)

                // Redirect after 3.5 seconds (gives time to see countdown and success)
                redirectTimeoutRef.current = setTimeout(() => {
                  if (!redirectCancelledRef.current && redirectTo) { // Only redirect if user didn't click "Return Now" and redirectTo is set
                    console.log('Key-Rex QR: Redirecting to:', redirectTo);
                    window.location.href = redirectTo;
                  }
                }, 3500) // Increased from 2000ms to 3500ms
              } else {
                console.warn('Key-Rex QR: No valid return URL available for redirect (blocked for security or not provided)');
                setAuthMessage('Authentication successful! However, redirect was blocked for security. Please return to the website manually.');
              }
              return
            }

            // If not in popup and not redirect (edge case), update message
            setAuthMessage('Authentication successful! Return to the website to complete sign-in.')

            return
          }
        }

        // If we've polled too many times, stop and show error
        if (pollCount >= maxPolls) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          setAuthStatus('error')
          setAuthMessage('Authentication timed out. The QR code has expired. Please generate a new one and try again.')

          // If in popup, notify parent of error
          try {
            if (window.opener && !window.opener.closed) {
              const targetOrigin = parentOrigin || '*'
              window.opener.postMessage({
                type: 'keyrex-auth-error',
                error: 'Authentication timed out',
                siteId: siteId
              }, targetOrigin)
            }
          } catch (e) {
            console.log('Could not communicate error to parent window:', e)
          }
        }
      } catch (error) {
        console.error('Error polling for xpub:', error)
        // Don't stop polling on network errors, just log them
      }
    }

    // Expose poll function for immediate visibility-triggered checks
    pollFnRef.current = doPoll

    // Start polling after a short delay to allow QR code to be scanned
    const delay = setTimeout(() => {
      pollingIntervalRef.current = setInterval(doPoll, 2000)
    }, 2000) // Wait 2 seconds before starting to poll

    // Cleanup function
    return () => {
      pollFnRef.current = null
      clearTimeout(delay)
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [isAdmin, k1, loading, qrCode, siteId])

  // Copy to clipboard function
  const copyToClipboard = async (text: string, type: 'plain' | 'lightning' = 'lightning') => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        toast.showSuccess(type === 'lightning' ? 'Lightning LNURL copied to clipboard!' : 'LNURL copied to clipboard!')
        
        // Show enhanced modal if in desktop tab with wallet selected, otherwise use simple feedback
        if (!isMobile && !isAdmin && activeTab === 'desktop' && selectedWallet) {
          setShowCopyModal(true)
        } else {
          setTimeout(() => setCopied(false), 2000)
        }
        return
      }
      
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        const successful = document.execCommand('copy')
        if (successful) {
          setCopied(true)
          toast.showSuccess(type === 'lightning' ? 'Lightning LNURL copied to clipboard!' : 'LNURL copied to clipboard!')
          
          // Show enhanced modal if in desktop tab with wallet selected, otherwise use simple feedback
          if (!isMobile && !isAdmin && activeTab === 'desktop' && selectedWallet) {
            setShowCopyModal(true)
          } else {
            setTimeout(() => setCopied(false), 2000)
          }
        } else {
          throw new Error('Copy command failed')
        }
      } catch (err) {
        throw new Error('Copy command not supported')
      } finally {
        document.body.removeChild(textArea)
      }
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.showError('Failed to copy. Please copy manually from the text below.')
    }
  }

  const handleReturnNow = () => {
    // Mark redirect as cancelled
    redirectCancelledRef.current = true
    
    // Clear the redirect timeout if it exists
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current)
      redirectTimeoutRef.current = null
    }
    
    setRedirectCountdown(0) // Stop countdown
    
    if (document.referrer && document.referrer !== window.location.href) {
      window.location.href = document.referrer
    } else {
      window.history.back()
    }
  }

  // If k1 is missing, fetch a new one from the server
  // Use a ref to prevent multiple simultaneous fetches
  const k1FetchRef = useRef(false)
  useEffect(() => {
    if (!k1 && !loading && !k1FetchRef.current) {
      k1FetchRef.current = true
      setLoading(true)
      fetch('/api/auth/lnurl', {
        credentials: 'include',
      })
        .then(async res => {
          if (!res.ok) {
            const errorText = await res.text()
            let errorMessage = 'Failed to get LNURL from server'
            try {
              const errorData = JSON.parse(errorText)
              errorMessage = errorData.error || errorMessage
            } catch {
              errorMessage = errorText || errorMessage
            }
            console.error('LNURL fetch failed:', res.status, errorMessage)
            
            // If rate limited, show user-friendly message
            if (res.status === 429) {
              toast.showError('Too many requests. Please wait a moment and refresh the page.')
            } else {
              toast.showError(`Failed to get authentication challenge: ${errorMessage}`)
            }
            setLoading(false)
            k1FetchRef.current = false
            return
          }
          return res.json()
        })
        .then(data => {
          if (data && data.k1) {
            // Update URL with the new k1 only if it's different and we haven't already updated
            if (!urlUpdateRef.current) {
              const currentUrl = new URL(window.location.href)
              const currentK1 = currentUrl.searchParams.get('k1')
              // Only update if the URL k1 doesn't match the new k1
              if (currentK1 !== data.k1) {
                urlUpdateRef.current = true // Mark that we're updating
                currentUrl.searchParams.set('k1', data.k1)
                router.replace(currentUrl.toString(), { scroll: false })
                // Reset the flag after a delay to allow URL to update
                setTimeout(() => {
                  urlUpdateRef.current = false
                }, 1000)
              }
            }
            // Reset ref after a delay to allow URL update
            setTimeout(() => {
              k1FetchRef.current = false
            }, 1000)
          } else {
            setLoading(false)
            k1FetchRef.current = false
          }
        })
        .catch(err => {
          console.error('Error fetching k1:', err)
          toast.showError('Failed to initialize authentication. Please try again.')
          setLoading(false)
          k1FetchRef.current = false
        })
    }
  }, [k1, loading, router, toast])
  
  // Show loading state while fetching k1
  if (!k1) {
    return (
      <Layout showNav={false}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card variant="default" className="p-6 text-center max-w-md">
            <p className="text-white font-semibold">Initializing authentication...</p>
            <p className="text-white/400 text-sm mt-2">Please wait while we prepare your QR code.</p>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout showNav={false}>
      <style jsx>{`
        @keyframes scale-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes draw-checkmark {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes confetti-fall {
          0% {
            transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(-60px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) rotate(var(--rotation)) translateY(200px) scale(0);
            opacity: 0;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
      `}</style>
      <div className="flex items-center justify-center p-4 py-6" role="main" aria-labelledby="qr-page-heading">
        <Card className="p-4 sm:p-6 max-w-lg w-full text-center">
          {/* Header */}
          <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg border-2 border-orange-400/30">
            <span className="text-white font-bold text-2xl">⚡</span>
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold mb-2 text-white" id="qr-page-heading">
            {isAdmin ? 'Admin Portal Authentication' : 'Scan with your Lightning wallet'}
          </h2>
          
          <p className="text-white/300 text-sm mb-4" role="note" aria-describedby="qr-page-heading">
            {isAdmin 
              ? 'Scan this QR code with your mobile Lightning wallet to sign in to the admin portal.'
              : isRedirect && !isPopup
              ? 'Use your Lightning wallet to complete authentication. You\'ll be redirected back to the website when done.'
              : isPopup
              ? 'Scan this QR code with your mobile Lightning wallet to complete authentication. This window will close automatically when done.'
              : (isMobile 
                ? 'Open your Lightning wallet app and scan this QR code, or copy the LNURL below.'
                : 'Use your mobile Lightning wallet to scan this QR code, or copy the LNURL to paste into your wallet.')}
          </p>

          {/* Authentication Status - Admin */}
          {isAdmin && authStatus !== 'waiting' && (
            <div className={`mb-4 p-4 rounded-lg border ${
              authStatus === 'success' 
                ? 'bg-orange-500/20 border-orange-500/50' 
                : 'bg-red-500/20 border-red-500/50'
            }`}>
              <p className={`text-sm font-semibold ${
                authStatus === 'success' ? 'text-orange-400' : 'text-red-400'
              }`}>
                {authStatus === 'success' ? '✓ ' : '✗ '}
                {authMessage}
              </p>
            </div>
          )}

          {/* Waiting for Admin Authentication */}
          {isAdmin && authStatus === 'waiting' && qrCode && !loading && (
            <div className="mb-4 p-4 bg-orange-500/20 border border-orange-500/50 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <p className="text-blue-400 text-sm font-semibold">Waiting for authentication...</p>
              </div>
              <p className="text-blue-300 text-xs mt-2 text-center">
                Scan the QR code with your mobile wallet and approve the authentication request.
              </p>
            </div>
          )}

          {/* Success Animation Overlay */}
          {showSuccessAnimation && authStatus === 'success' && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
              role="status"
              aria-live="polite"
              aria-label="Authentication successful"
            >
              <div className="relative">
                {/* Animated Checkmark */}
                <div className="animate-scale-in">
                  <svg 
                    className="w-24 h-24 text-orange-400 drop-shadow-lg"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                      style={{
                        strokeDasharray: 24,
                        strokeDashoffset: 24,
                        animation: 'draw-checkmark 0.5s ease-out forwards'
                      }}
                    />
                  </svg>
                </div>
                {/* Confetti particles */}
                {[...Array(12)].map((_, i) => {
                  const rotation = i * 30
                  return (
                    <div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'][i % 4],
                        left: '50%',
                        top: '50%',
                        '--rotation': `${rotation}deg`,
                        animation: `confetti-fall 1s ease-out ${i * 0.1}s forwards`,
                      } as React.CSSProperties & { '--rotation': string }}
                      aria-hidden="true"
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Authentication Status - Regular Users */}
          {!isAdmin && authStatus !== 'waiting' && (
            <div className={`mb-4 p-4 rounded-lg border ${
              authStatus === 'success' 
                ? 'bg-orange-500/20 border-orange-500/50' 
                : 'bg-red-500/20 border-red-500/50'
            }`}>
              <p className={`text-sm font-semibold ${
                authStatus === 'success' ? 'text-orange-400' : 'text-red-400'
              }`}>
                {authStatus === 'success' ? '✓ ' : '✗ '}
                {authMessage}
              </p>
              {authStatus === 'success' && retrievedXpub && (
                <div className="mt-3 space-y-3">
                  {isRedirect && !isPopup ? (
                    <div className="space-y-3">
                      {/* More prominent success message */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-4xl mb-1">✓</div>
                        <p className="text-orange-300 text-base font-semibold text-center">
                          Authentication Successful!
                        </p>
                        <p className="text-orange-200 text-sm text-center">
                          Your sign-in information has been saved
                        </p>
                      </div>
                      
                      {document.referrer && document.referrer !== window.location.href ? (
                        <div className="space-y-2">
                          {redirectCountdown !== null && redirectCountdown > 0 ? (
                            <p className="text-white/300 text-sm text-center">
                              Redirecting in <span className="font-bold text-orange-400">{redirectCountdown}</span> second{redirectCountdown !== 1 ? 's' : ''}...
                            </p>
                          ) : (
                            <p className="text-white/300 text-sm text-center">
                              Redirecting you back to the website...
                            </p>
                          )}
                          <Button
                            onClick={handleReturnNow}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
                          >
                            Return Now
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-orange-200 text-sm text-center font-semibold">
                            ✓ Your authentication information has been saved
                          </p>
                          <Button
                            onClick={() => window.history.back()}
                            className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
                          >
                            Return to Website
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="text-orange-300 text-xs text-center">
                        Your authentication was successful! Return to the website to complete sign-in.
                      </p>
                      <p className="text-orange-200 text-xs text-center font-semibold">
                        ✓ Your authentication information has been saved
                      </p>
                    </>
                  )}
                </div>
              )}
              {authStatus === 'error' && (
                <div className="mt-3 space-y-3">
                  <div className="bg-dark-800/50 rounded-lg p-3 border border-dark-700/50">
                    <p className="text-white/300 text-xs font-semibold mb-2">Troubleshooting Tips:</p>
                    <ul className="text-white/400 text-xs space-y-1 ml-4 list-disc">
                      <li>Make sure your wallet supports LNURL-auth</li>
                      <li>Check that you have a stable internet connection</li>
                      <li>Try scanning again with a new QR code</li>
                      <li>If using a desktop wallet, ensure you copied the full LNURL</li>
                    </ul>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={refreshQRCode}
                      disabled={isRefreshing}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isRefreshing ? 'Generating New QR Code...' : 'Generate New QR Code'}
                    </button>
                    {isPopup && (
                      <button
                        onClick={() => {
                          // Close popup and let parent handle retry
                          if (window.opener && !window.opener.closed) {
                            window.opener.postMessage({
                              type: 'keyrex-auth-error',
                              error: 'Authentication timed out',
                              siteId: siteId,
                              retry: true
                            }, '*')
                            window.close()
                          }
                        }}
                        className="w-full bg-dark-700 hover:bg-dark-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                      >
                        Close and Try Again from Website
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Waiting for Regular User Authentication */}
          {!isAdmin && authStatus === 'waiting' && qrCode && !loading && (
            <div 
              className="mb-4 p-4 bg-orange-500/20 border border-orange-500/50 rounded-lg"
              role="status"
              aria-live="polite"
              aria-label="Waiting for authentication"
            >
              <div className="flex items-center justify-center gap-2">
                <div 
                  className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"
                  aria-hidden="true"
                ></div>
                <p className="text-blue-400 text-sm font-semibold">
                  {isRefreshing ? 'Generating new QR code...' : 'Waiting for authentication...'}
                </p>
              </div>
              {!isRefreshing && (
                <div className="mt-2 space-y-2">
                  {isMobile && deepLinkAttempted ? (
                    <>
                      {!showPersistentReminder && (
                        <>
                          <p className="text-blue-300 text-xs text-center">
                            <strong>Did you approve in your wallet?</strong> Return to this browser tab to complete authentication.
                          </p>
                          <p className="text-blue-200 text-xs text-center font-semibold">
                            ⚠️ Keep this tab open while you approve in your wallet
                          </p>
                        </>
                      )}
                      {showPersistentReminder && (
                        <p className="text-blue-300 text-xs text-center">
                          Authentication is in progress. If you already approved in your wallet, this page will automatically detect it.
                        </p>
                      )}
                    </>
                  ) : isMobile ? (
                    <p className="text-blue-300 text-xs text-center">
                      Tap "Open in Wallet" above, or copy the LNURL and paste it into your wallet, then approve the authentication request.
                    </p>
                  ) : (
                    <p className="text-blue-300 text-xs text-center">
                      Scan the QR code with your mobile wallet and approve the authentication request.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="bg-white p-8 rounded-lg mb-4 flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-600 text-sm">Generating QR code...</p>
              </div>
            </div>
          )}

          {/* Keep Popup Open Reminder - Desktop users in popup */}
          {isPopup && !isMobile && authStatus === 'waiting' && qrCode && !loading && (
            <div className="mb-4 p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg">
              <p className="text-blue-300 text-xs text-center">
                ⚠️ <strong>Keep this window open</strong> while you scan the QR code with your mobile wallet.
              </p>
            </div>
          )}

          {/* Expiration Timer */}
          {qrCode && !loading && authStatus === 'waiting' && (
            <div className={`mb-4 p-3 rounded-lg border text-center ${
              timeRemaining === 0
                ? 'bg-red-500/20 border-red-500/50'
                : timeRemaining < 60 
                ? 'bg-orange-500/20 border-orange-500/50' 
                : 'bg-dark-800/50 border-dark-700/50'
            }`}>
              {timeRemaining === 0 ? (
                <div className="space-y-2">
                  <p className="text-red-300 text-xs font-semibold">
                    ⏰ QR code expired
                  </p>
                  {isRefreshing ? (
                    <p className="text-red-200 text-xs">
                      Generating new QR code...
                    </p>
                  ) : (
                    <p className="text-red-200 text-xs">
                      A new QR code is being generated automatically...
                    </p>
                  )}
                </div>
              ) : (
                <p className={`text-xs font-semibold ${
                  timeRemaining < 60 ? 'text-orange-300' : 'text-white/400'
                }`}>
                  {timeRemaining < 60 ? '⏰ ' : ''}
                  Authentication expires in {formatTime(timeRemaining)}
                  {timeRemaining < 60 && ' - Please scan soon!'}
                </p>
              )}
            </div>
          )}

          {/* Network Status Indicator */}
          {qrCode && !loading && authStatus === 'waiting' && networkStatus && (
            <div className={`mb-4 p-2 rounded-lg border text-center ${
              networkStatus === 'offline'
                ? 'bg-red-500/20 border-red-500/50'
                : networkStatus === 'slow'
                ? 'bg-yellow-500/20 border-yellow-500/50'
                : 'bg-orange-500/20 border-orange-500/50'
            }`}>
              <p className={`text-xs font-medium ${
                networkStatus === 'offline'
                  ? 'text-red-300'
                  : networkStatus === 'slow'
                  ? 'text-yellow-300'
                  : 'text-orange-300'
              }`}>
                {networkStatus === 'offline' && '⚠️ No internet connection'}
                {networkStatus === 'slow' && '🐌 Slow connection detected'}
                {networkStatus === 'online' && '✓ Connection active'}
              </p>
            </div>
          )}

          {/* Persistent Return Reminder - Shown when user returns to tab after deep link */}
          {showPersistentReminder && isMobile && !isAdmin && deepLinkAttempted && authStatus === 'waiting' && (
            <div className="mb-4 bg-gradient-to-r from-green-500/20 to-green-600/20 border-2 border-green-400/60 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl animate-spin" style={{ animationDuration: '2s' }}>&#9203;</div>
                <div className="flex-1">
                  <p className="text-green-200 font-bold text-sm mb-1">
                    Checking for authentication...
                  </p>
                  <p className="text-green-300 text-xs">
                    If you approved in your wallet, sign-in will complete automatically in a moment. If not, tap &ldquo;Open in Wallet&rdquo; to try again.
                  </p>
                </div>
                <button
                  onClick={() => setShowPersistentReminder(false)}
                  className="text-green-300 hover:text-green-200 text-lg font-bold"
                  aria-label="Dismiss reminder"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Mobile: Open in Wallet Button (Primary Action) - Only for end users, not admin */}
          {isMobile && !isAdmin && lightningLnurl && qrCode && !loading && authStatus === 'waiting' && (
            <div className="mb-3 space-y-1.5">
              {!showWalletPicker ? (
                <>
                  <button
                    onClick={() => setShowWalletPicker(true)}
                    className="block w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-all transform hover:scale-105 shadow-lg text-center"
                  >
                    📱 Open in Wallet
                  </button>
                  <p className="text-white/40 text-xs text-center">
                    Choose which Lightning wallet to authenticate with
                  </p>
                </>
              ) : (
                <div className="bg-dark-800/90 border border-orange-500/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-sm font-semibold">Choose your wallet</p>
                    <button
                      onClick={() => setShowWalletPicker(false)}
                      className="text-white/40 hover:text-white/60 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  {[
                    { name: 'Zeus', scheme: 'zeusln:lightning:', icon: '⚡' },
                    { name: 'Phoenix', scheme: 'phoenix:lightning:', icon: '🔥' },
                    { name: 'Breez', scheme: 'breez:lightning:', icon: '🌊' },
                    { name: 'BlueWallet', scheme: 'bluewallet:lightning:', icon: '🔵' },
                    { name: 'Blixt', scheme: 'blixt:lightning:', icon: '💜' },
                  ].map((wallet) => {
                    // Extract the bare LNURL (without lightning: prefix) from lightningLnurl
                    const bareLnurl = lightningLnurl.replace(/^lightning:/i, '')
                    const walletDeepLink = `${wallet.scheme}${bareLnurl}`
                    return (
                      <a
                        key={wallet.name}
                        href={walletDeepLink}
                        className="flex items-center gap-3 w-full bg-dark-700/60 hover:bg-dark-700 border border-dark-600/50 hover:border-orange-500/40 text-white py-2.5 px-3 rounded-lg transition-all text-left"
                        onClick={() => {
                          setDeepLinkAttempted(true)
                          setShowReturnReminder(true)
                          setShowWalletPicker(false)
                          deepLinkTimeoutRef.current = setTimeout(() => {
                            if (document.hasFocus() && document.visibilityState === 'visible') {
                              console.log('Deep link may not have worked for', wallet.name)
                            }
                          }, 1000)
                        }}
                      >
                        <span className="text-lg">{wallet.icon}</span>
                        <span className="text-sm font-medium">{wallet.name}</span>
                      </a>
                    )
                  })}
                  {/* Generic option using lightning: scheme */}
                  <a
                    href={lightningLnurl}
                    className="flex items-center gap-3 w-full bg-dark-700/60 hover:bg-dark-700 border border-dark-600/50 hover:border-orange-500/40 text-white py-2.5 px-3 rounded-lg transition-all text-left"
                    onClick={() => {
                      setDeepLinkAttempted(true)
                      setShowReturnReminder(true)
                      setShowWalletPicker(false)
                      deepLinkTimeoutRef.current = setTimeout(() => {
                        if (document.hasFocus() && document.visibilityState === 'visible') {
                          console.log('Deep link may not have worked (generic)')
                        }
                      }, 1000)
                    }}
                  >
                    <span className="text-lg">📱</span>
                    <span className="text-sm font-medium">Other Wallet</span>
                    <span className="text-white/30 text-xs ml-auto">Default</span>
                  </a>
                  <p className="text-white/30 text-xs text-center pt-1">
                    Select your wallet, then approve the login request
                  </p>
                </div>
              )}
              {deepLinkAttempted && !showWalletPicker && (
                <>
                  <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-3 mt-2 animate-pulse">
                    <p className="text-blue-200 text-xs text-center font-semibold mb-1">
                      After approving in your wallet:
                    </p>
                    <p className="text-blue-300 text-xs text-center">
                      Tap <strong>&ldquo;{'<'} Safari&rdquo;</strong> in the top-left corner of your screen, or switch back using your app switcher. Authentication will complete automatically.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowWalletPicker(true)}
                    className="w-full text-orange-400/80 hover:text-orange-400 text-xs text-center py-1 underline underline-offset-2"
                  >
                    Try a different wallet
                  </button>
                </>
              )}
            </div>
          )}

          {/* Phase 1: Tabbed Interface for Desktop Users (not mobile, not admin) */}
          {!isMobile && !isAdmin && qrCode && !loading && lnurl && (
            <div className="mb-6">
              {/* Tab Buttons */}
              <div className="flex gap-2 mb-4 border-b border-dark-700/50">
                <button
                  onClick={() => setActiveTab('mobile')}
                  className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors border-b-2 ${
                    activeTab === 'mobile'
                      ? 'text-orange-400 border-orange-400 bg-orange-500/10'
                      : 'text-white/400 border-transparent hover:text-white/300'
                  }`}
                  aria-selected={activeTab === 'mobile'}
                  role="tab"
                >
                  📱 Mobile Wallet
                </button>
                <button
                  onClick={() => setActiveTab('desktop')}
                  className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors border-b-2 ${
                    activeTab === 'desktop'
                      ? 'text-orange-400 border-orange-400 bg-orange-500/10'
                      : 'text-white/400 border-transparent hover:text-white/300'
                  }`}
                  aria-selected={activeTab === 'desktop'}
                  role="tab"
                >
                  💻 Desktop Wallet
                </button>
              </div>

              {/* Mobile Wallet Tab Content */}
              {activeTab === 'mobile' && (
                <div role="tabpanel" aria-labelledby="mobile-tab">
                  {/* QR Code */}
                  <div 
                    className="bg-white p-3 sm:p-4 rounded-lg mb-3 shadow-inner"
                    role="img"
                    aria-label="QR code for Lightning wallet authentication"
                  >
                    <img 
                      src={qrCode} 
                      alt="LNURL Auth QR Code - Scan with your Lightning wallet to authenticate" 
                      className="mx-auto w-full max-w-full h-auto"
                      style={{ 
                        maxWidth: '320px',
                        minWidth: '200px'
                      }}
                    />
                  </div>

                  {/* Important Note about Mobile Wallet QR Scanners */}
                  {isMobile && !isAdmin && (
                    <div className="mb-3 bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                      <p className="text-red-300 text-xs font-semibold mb-2">⚠️ Mobile Wallet QR Scanners Don't Work for Authentication</p>
                      <p className="text-white/300 text-xs mb-2">
                        Most mobile wallet QR scanners (Phoenix, Zeus, etc.) are designed for <strong>payment invoices only</strong>, not LNURL-auth authentication. 
                        Scanning will give errors like "not a lightning invoice" or "not a valid address".
                      </p>
                      <div className="bg-dark-800/50 rounded p-2 mt-2">
                        <p className="text-orange-300 text-xs font-semibold mb-1">✅ Use This Instead:</p>
                        <ol className="text-white/300 text-xs space-y-1 ml-4 list-decimal">
                          <li>Tap the <strong>"Open in Wallet"</strong> button above (uses deep link - most reliable)</li>
                          <li>Or copy the LNURL below and look for an "Authenticate"/"Login" option in your wallet's menu</li>
                          <li>Or use Alby browser extension on desktop (automatic, no scanning needed)</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* Scanning Tips - Collapsible */}
                  <div className="mb-4">
                    <button
                      onClick={() => setShowScanningTips(!showScanningTips)}
                      className="w-full text-left p-2 bg-dark-800/30 hover:bg-dark-800/50 rounded-lg border border-dark-700/30 transition-colors"
                      aria-expanded={showScanningTips}
                      aria-controls="scanning-tips-content"
                      aria-label={showScanningTips ? 'Hide scanning tips' : 'Show scanning tips'}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white/400 text-xs font-medium">
                          💡 Scanning Tips
                        </span>
                        <span className="text-white/500 text-xs" aria-hidden="true">
                          {showScanningTips ? '▼' : '▶'}
                        </span>
                      </div>
                    </button>
                    {showScanningTips && (
                      <div 
                        id="scanning-tips-content"
                        className="mt-2 bg-dark-800/30 rounded-lg p-3 border border-dark-700/30"
                        role="region"
                        aria-label="Scanning tips"
                      >
                        <ul className="text-white/400 text-xs space-y-1.5 ml-4 list-disc">
                          <li>Hold your phone steady while scanning</li>
                          <li>Ensure good lighting for better recognition</li>
                          <li>Move closer if the code doesn't scan immediately</li>
                          <li>Make sure your wallet app is open and ready</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Desktop Wallet Tab Content */}
              {activeTab === 'desktop' && (
                <div role="tabpanel" aria-labelledby="desktop-tab" className="space-y-4">
                  {/* Phase 2: Wallet Selector */}
                  <div className="bg-dark-800/30 rounded-lg p-4 border border-dark-700/30">
                    <label className="block text-white/300 text-xs font-semibold mb-2">
                      Select your desktop wallet:
                    </label>
                    <select
                      value={selectedWallet}
                      onChange={(e) => setSelectedWallet(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Choose your wallet...</option>
                      <option value="alby">Alby (Browser Extension or Desktop)</option>
                      <option value="zeus">Zeus (Mobile or Desktop)</option>
                      <option value="sparrow">Sparrow Wallet</option>
                      <option value="electrum">Electrum</option>
                      <option value="bluewallet">BlueWallet Desktop</option>
                      <option value="wasabi">Wasabi Wallet</option>
                      <option value="other">Other desktop wallet</option>
                    </select>
                  </div>

                  {/* Phase 1: Prominent Copy Section */}
                  <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-lg p-4 border-2 border-orange-500/50">
                    <p className="text-orange-200 text-sm font-semibold mb-3 text-center">
                      💻 Copy the LNURL below and paste it into your desktop wallet
                    </p>
                    
                    {/* Copy Button */}
                    <Button
                      onClick={() => copyToClipboard(lightningLnurl, 'lightning')}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg text-base"
                    >
                      {copied ? '✓ LNURL Copied!' : '📋 Copy LNURL'}
                    </Button>

                    {/* Simple feedback for when modal is not shown */}
                    {copied && !showCopyModal && (
                      <div className="mt-3 p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg">
                        <p className="text-orange-300 text-sm text-center font-semibold">
                          ✓ LNURL copied! Now paste it into your desktop wallet.
                        </p>
                      </div>
                    )}

                    {/* Manual Copy Fallback */}
                    <div className="mt-4 bg-dark-900/50 rounded-lg p-3 border border-dark-700/50">
                      <p className="text-white/400 text-xs mb-2 text-left">Or copy manually:</p>
                      <div className="bg-dark-950 rounded p-2 text-left">
                        <code className="text-xs text-white/300 break-all select-all">
                          {lightningLnurl}
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Phase 2: Wallet-Specific Instructions */}
                  {selectedWallet && (
                    <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
                      <h4 className="text-white font-semibold text-sm mb-3">
                        How to use with {selectedWallet === 'alby' ? 'Alby' :
                                         selectedWallet === 'zeus' ? 'Zeus' :
                                         selectedWallet === 'sparrow' ? 'Sparrow Wallet' : 
                                         selectedWallet === 'electrum' ? 'Electrum' :
                                         selectedWallet === 'bluewallet' ? 'BlueWallet Desktop' :
                                         selectedWallet === 'wasabi' ? 'Wasabi Wallet' :
                                         'your wallet'}:
                      </h4>
                      {selectedWallet === 'zeus' && (
                        <div className="text-white/300 text-xs space-y-3">
                          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
                            <p className="text-yellow-300 font-semibold mb-2">⚠️ Zeus LNURL-auth Limitation</p>
                            <p className="text-white/300 text-xs mb-2">
                              When you paste the LNURL into Zeus, it may generate a signature but <strong>not automatically submit it</strong> back to complete authentication.
                            </p>
                            <p className="text-white/300 text-xs">
                              <strong>This is a limitation of Zeus</strong> - the wallet should automatically send the signature back, but it doesn't always do this.
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold mb-2">Recommended: Use "Open in Wallet" Button Instead</p>
                            <p className="text-white/300 text-xs mb-2">For mobile users, use the <strong>"Open in Wallet"</strong> button above (if available) - this uses deep linking and works better than manual pasting.</p>
                          </div>
                          <div>
                            <p className="font-semibold mb-2">If You See a Signature in Zeus:</p>
                            <ol className="space-y-1.5 ml-5 list-decimal text-white/300 text-xs">
                              <li>Zeus should automatically submit the signature - wait a few seconds</li>
                              <li>If nothing happens, <strong>return to this browser tab</strong> and refresh the page</li>
                              <li>If authentication still doesn't complete, Zeus may not fully support LNURL-auth</li>
                              <li>Try using the "Open in Wallet" button or use a different wallet like Alby extension</li>
                            </ol>
                            <p className="mt-2 text-white/400 italic text-xs">
                              Note: You cannot manually submit the signature - it must be sent automatically by the wallet to the callback URL.
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedWallet === 'alby' && (
                        <div className="text-white/300 text-xs space-y-3">
                          <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-3">
                            <p className="text-orange-300 font-semibold mb-2">✅ Alby Browser Extension (Automatic - Recommended)</p>
                            <ol className="space-y-1.5 ml-5 list-decimal text-white/300">
                              <li>Make sure the Alby browser extension is installed and enabled</li>
                              <li>Go back to the website and click the <strong>Key-Rex logo button</strong></li>
                              <li>Alby will automatically pop up asking you to approve the authentication</li>
                              <li>Click <strong>Approve</strong> in the Alby popup</li>
                              <li>You're done! No copying or pasting needed.</li>
                            </ol>
                            <p className="mt-2 text-white/400 text-xs">⚠️ <strong>Important:</strong> The Alby browser extension does NOT have a manual "paste LNURL" option. It only works automatically via WebLN. Don't paste into the "Send" field - that's for payments, not authentication.</p>
                          </div>
                          <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-3">
                            <p className="text-blue-300 font-semibold mb-2">🧪 For Manual Testing</p>
                            <p className="text-white/300 text-xs mb-2">If you need to test manual LNURL-auth pasting, try these options:</p>
                            <ul className="ml-5 list-disc space-y-1 text-white/300">
                              <li><strong>Alby Hub (Desktop App):</strong> Check if there's an "Authenticate", "LNURL", or "Connect" option in the menu or settings. If you find it, paste the LNURL there.</li>
                              <li><strong>Mobile wallets:</strong> Phoenix, Zeus, or Breez - scan the QR code or paste LNURL in their authentication section</li>
                              <li><strong>Other desktop wallets:</strong> Select "Sparrow Wallet" or "Electrum" from the dropdown above for manual paste instructions</li>
                            </ul>
                            <p className="mt-2 text-white/400 text-xs italic">Note: Alby Hub may or may not support manual LNURL-auth. If you can't find an option, use a mobile wallet or other desktop wallet instead.</p>
                          </div>
                        </div>
                      )}
                      {selectedWallet === 'sparrow' && (
                        <ol className="text-white/300 text-xs space-y-2 ml-5 list-decimal">
                          <li>Open Sparrow Wallet</li>
                          <li>Go to <strong>Tools</strong> → <strong>Sign Message</strong> (or look for LNURL option)</li>
                          <li>Paste the copied LNURL into the input field</li>
                          <li>Approve the authentication request</li>
                        </ol>
                      )}
                      {selectedWallet === 'electrum' && (
                        <ol className="text-white/300 text-xs space-y-2 ml-5 list-decimal">
                          <li>Open Electrum</li>
                          <li>Look for <strong>Tools</strong> → <strong>Sign/Verify Message</strong> or LNURL option</li>
                          <li>Paste the copied LNURL into the input field</li>
                          <li>Approve the authentication request</li>
                        </ol>
                      )}
                      {selectedWallet === 'bluewallet' && (
                        <ol className="text-white/300 text-xs space-y-2 ml-5 list-decimal">
                          <li>Open BlueWallet Desktop</li>
                          <li>Look for <strong>LNURL</strong> or <strong>Authenticate</strong> option in the menu</li>
                          <li>Paste the copied LNURL</li>
                          <li>Approve the authentication request</li>
                        </ol>
                      )}
                      {selectedWallet === 'wasabi' && (
                        <ol className="text-white/300 text-xs space-y-2 ml-5 list-decimal">
                          <li>Open Wasabi Wallet</li>
                          <li>Go to <strong>Tools</strong> → <strong>Sign Message</strong> (if available)</li>
                          <li>Paste the copied LNURL</li>
                          <li>Note: Wasabi may not support LNURL-auth. Consider using a mobile wallet or different desktop wallet.</li>
                        </ol>
                      )}
                      {selectedWallet === 'other' && (
                        <div className="text-white/300 text-xs space-y-2">
                          <p>For other desktop wallets:</p>
                          <ol className="ml-5 list-decimal space-y-1.5">
                            <li>Open your desktop Lightning wallet</li>
                            <li>Look for an <strong>Authenticate</strong>, <strong>LNURL</strong>, or <strong>Sign Message</strong> option</li>
                            <li>Paste the copied LNURL into the appropriate field</li>
                            <li>Approve the authentication request</li>
                          </ol>
                          <p className="mt-2 text-white/400 italic">
                            Note: Not all desktop wallets support LNURL-auth. If your wallet doesn't have this option, you may need to use a mobile wallet instead.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mobile/Admin: Original QR Code Display (no tabs) */}
          {(isMobile || isAdmin) && qrCode && !loading && (
            <div 
              className="bg-white p-2 sm:p-3 rounded-lg mb-3 shadow-inner"
              role="img"
              aria-label="QR code for Lightning wallet authentication"
            >
              <img 
                src={qrCode} 
                alt="LNURL Auth QR Code - Scan with your Lightning wallet to authenticate" 
                className="mx-auto w-full max-w-full h-auto"
                style={{ 
                  maxWidth: isMobile ? '280px' : '320px',
                  minWidth: '200px'
                }}
              />
            </div>
          )}

          {/* Mobile/Admin: Copy Buttons (original layout) */}
          {lnurl && !loading && (isMobile || isAdmin) && (
            <div className="space-y-3 mb-6">
              <div className="bg-dark-800/30 rounded-lg p-3 border border-dark-700/30">
                {isMobile && !isAdmin ? (
                  <p className="text-white/400 text-xs mb-2 text-center">
                    <strong className="text-white/300">Alternative:</strong> If "Open in Wallet" didn't work or you don't have a wallet installed, copy the LNURL below and paste it into your wallet
                  </p>
                ) : (
                  <p className="text-white/400 text-xs mb-2 text-center">
                    <strong className="text-white/300">Desktop wallet users:</strong> Copy the LNURL below and paste it into your wallet
                  </p>
                )}
                <Button
                  onClick={() => copyToClipboard(lightningLnurl, 'lightning')}
                  className="w-full bg-dark-700 hover:bg-dark-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
                >
                  {copied ? '✓ Copied!' : '📋 Copy LNURL'}
                </Button>
                {/* Simple feedback for when modal is not shown */}
                {copied && !showCopyModal && (
                  <p className="text-orange-400 text-xs text-center mt-2">
                    {isMobile && !isAdmin
                      ? 'LNURL copied to clipboard! Paste it into your wallet app.'
                      : 'LNURL copied to clipboard! Paste it into your desktop wallet.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Instructions - Simplified for desktop users (instructions are in tabs) */}
          {(!isMobile || isAdmin) && (
            <div 
              className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50 text-left"
              role="region"
              aria-labelledby="instructions-heading"
            >
              <h3 id="instructions-heading" className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <span className="text-orange-400" aria-hidden="true">ℹ️</span>
                {!isMobile && !isAdmin ? 'General Information' : 'How to authenticate'}
              </h3>
              
              {isMobile && isAdmin ? (
                <div className="text-white/300 text-sm space-y-3">
                  <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
                    <p className="text-yellow-300 font-semibold mb-2">⚠️ Important: Not all wallets support LNURL-auth</p>
                    <p className="text-white/300 text-xs">Some wallets (like Phoenix) have QR scanners designed for payments, not authentication. Use a wallet that supports LNURL-auth.</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-2">How to use LNURL-auth (mobile wallets):</p>
                    <ol className="space-y-2 ml-5 list-decimal text-white/300 text-xs">
                      <li><strong>Use the "Open in Wallet" button</strong> above - this uses deep linking and works with most wallets</li>
                      <li><strong>Or copy the LNURL</strong> and look for "Authenticate", "Login", or "LNURL" option in your wallet's menu</li>
                      <li><strong>Don't use QR scanners</strong> - they're for payments, not authentication</li>
                    </ol>
                    <p className="mt-3 font-semibold mb-2">Recommended for desktop:</p>
                    <p className="text-white/300 text-xs ml-5"><strong>Alby browser extension</strong> - works automatically via WebLN, no scanning or pasting needed</p>
                  </div>
                </div>
              ) : !isMobile && !isAdmin ? (
                <div className="text-white/300 text-xs space-y-2">
                  <p>
                    Use the tabs above to switch between <strong>Mobile Wallet</strong> (scan QR code) and <strong>Desktop Wallet</strong> (copy LNURL) options.
                  </p>
                  <p>
                    If you're using a desktop wallet, select your wallet from the dropdown in the Desktop Wallet tab to see specific instructions.
                  </p>
                </div>
              ) : null}

              <div className="mt-4 pt-3 border-t border-dark-700/50">
                <p className="text-white/400 text-xs mb-2">
                  <strong className="text-white/300">Best methods for LNURL-auth:</strong>
                </p>
                <ul className="text-white/400 text-xs ml-4 list-disc space-y-1">
                  <li><strong>Mobile:</strong> Use the "Open in Wallet" button above (deep link) - works with most wallets</li>
                  <li><strong>Desktop:</strong> Alby browser extension (automatic via WebLN)</li>
                </ul>
                <p className="text-white/400 text-xs mt-2">
                  <strong>Note:</strong> Mobile wallet QR scanners don't work for authentication (they're for payments only). Use the "Open in Wallet" button or Alby extension instead.
                </p>
              </div>
            </div>
          )}

          {/* Instructions for Mobile End Users */}
          {isMobile && !isAdmin && (
            <div 
              className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50 text-left"
              role="region"
              aria-labelledby="instructions-heading"
            >
              <h3 id="instructions-heading" className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <span className="text-orange-400" aria-hidden="true">📱</span>
                How to authenticate
              </h3>
              
              <div>
                <h4 className="text-white font-semibold text-xs mb-2 flex items-center gap-2">
                  <span className="text-orange-400">📱</span>
                  Using a mobile wallet?
                </h4>
                <ol className="text-white/300 text-xs space-y-1.5 ml-5 list-decimal">
                  <li>Tap the "Open in Wallet" button above</li>
                  <li>If you have multiple wallets installed, choose one from the list that appears</li>
                  <li>Your Lightning wallet app will open automatically</li>
                  <li>Approve the authentication request in your wallet</li>
                  <li><strong>Return to this browser tab</strong> after approving (authentication will complete automatically)</li>
                  <li>If the button doesn't work, copy the LNURL below and paste it into your wallet manually</li>
                </ol>
              </div>

              <div className="mt-4 pt-3 border-t border-dark-700/50">
                <p className="text-white/400 text-xs mb-2">
                  <strong className="text-white/300">Best methods:</strong>
                </p>
                <ul className="text-white/400 text-xs ml-4 list-disc space-y-1 mb-2">
                  <li><strong>Mobile:</strong> Use "Open in Wallet" button (works with Phoenix, Zeus, Breez, etc.)</li>
                  <li><strong>Desktop:</strong> Alby browser extension (automatic)</li>
                </ul>
                <p className="text-white/400 text-xs">
                  <strong>Note:</strong> Mobile wallet QR scanners don't work for authentication. Use the "Open in Wallet" button or Alby extension.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Enhanced Copy Success Modal */}
        {!isMobile && !isAdmin && activeTab === 'desktop' && selectedWallet && (
          <CopySuccessModal
            selectedWallet={selectedWallet}
            isVisible={showCopyModal}
            onDismiss={() => {
              setShowCopyModal(false)
              setCopied(false)
            }}
          />
        )}
      </div>
    </Layout>
  )
}

export default function QRPage() {
  return (
    <Suspense fallback={
      <Layout showNav={false}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-white/400">Loading...</p>
          </div>
        </div>
      </Layout>
    }>
      <QRContent />
    </Suspense>
  )
}
