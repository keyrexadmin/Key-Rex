'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'
import CopySuccessModal from '@/components/CopySuccessModal'

declare global {
  interface Window {
    webln?: {
      enable: () => Promise<void>
      lnurl: (lnurl: string) => Promise<any>
      request?: (method: string, params?: any) => Promise<any>
    }
  }
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [qrK1, setQrK1] = useState<string | null>(null)
  const [authStatus, setAuthStatus] = useState<'waiting' | 'success' | 'error'>('waiting')
  const [authMessage, setAuthMessage] = useState<string>('')
  const [lightningLnurl, setLightningLnurl] = useState<string>('')
  const [plainLnurl, setPlainLnurl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number>(300) // 5 minutes in seconds
  const [isMobile, setIsMobile] = useState(false)
  const [deepLinkAttempted, setDeepLinkAttempted] = useState(false)
  const [showReturnReminder, setShowReturnReminder] = useState(false)
  const [tabWasHidden, setTabWasHidden] = useState(false)
  const [showPersistentReminder, setShowPersistentReminder] = useState(false)
  const [activeTab, setActiveTab] = useState<'mobile' | 'desktop'>('mobile') // Phase 1: Tab selection
  const [selectedWallet, setSelectedWallet] = useState<string>('') // Phase 2: Wallet selector
  const [showCopyModal, setShowCopyModal] = useState(false) // Enhanced copy feedback modal
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false) // Phase 3: Success animation
  const [soundEnabled, setSoundEnabled] = useState(true) // Phase 3: Sound preference
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'slow' | null>(null) // Phase 4: Network status
  const [isRefreshing, setIsRefreshing] = useState(false) // Phase 4: QR refresh state
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const expirationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const deepLinkTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Check if already authenticated as admin
    const checkAdminSession = async () => {
      try {
        const res = await fetch('/api/admin/auth/verify', {
          credentials: 'include',
        })
        
        if (res.ok) {
          const data = await res.json()
          if (data.isAdmin) {
            // Already authenticated, redirect to dashboard
            router.push('/admin/dashboard')
            return
          }
        }
      } catch (err) {
        console.error('Error checking admin session:', err)
      } finally {
        setCheckingSession(false)
      }
    }
    
    checkAdminSession()
  }, [router])

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

  // Phase 1: Set default tab to desktop for desktop users (to highlight the improvement)
  useEffect(() => {
    if (!isMobile) {
      setActiveTab('desktop')
    }
  }, [isMobile])

  // Page Visibility API - detect when user returns to tab after deep link
  useEffect(() => {
    if (!isMobile || !deepLinkAttempted || authStatus !== 'waiting') return

    let hideTimeout: NodeJS.Timeout | null = null

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab was hidden - user likely switched to wallet app
        setTabWasHidden(true)
        // Clear any existing timeout
        if (hideTimeout) {
          clearTimeout(hideTimeout)
          hideTimeout = null
        }
      } else {
        // Tab is visible again - user returned
        if (tabWasHidden && authStatus === 'waiting') {
          // Show persistent reminder that they need to return
          setShowPersistentReminder(true)
          
          // Auto-hide after 10 seconds
          hideTimeout = setTimeout(() => {
            setShowPersistentReminder(false)
            hideTimeout = null
          }, 10000)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (hideTimeout) {
        clearTimeout(hideTimeout)
      }
    }
  }, [isMobile, deepLinkAttempted, tabWasHidden, authStatus])

  // Phase 3: Play success sound function
  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator1 = audioContext.createOscillator()
      const oscillator2 = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator1.connect(gainNode)
      oscillator2.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator1.frequency.value = 523.25 // C5
      oscillator2.frequency.value = 659.25 // E5
      oscillator1.type = 'sine'
      oscillator2.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator1.start(audioContext.currentTime)
      oscillator2.start(audioContext.currentTime)
      oscillator1.stop(audioContext.currentTime + 0.3)
      oscillator2.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      // Sound playback failed, that's okay
      console.log('Could not play success sound:', error)
    }
  }

  // Reset persistent reminder when auth succeeds and trigger success animation/sound
  useEffect(() => {
    if (authStatus === 'success') {
      setShowPersistentReminder(false)
      setTabWasHidden(false)
      // Phase 3: Show success animation
      setShowSuccessAnimation(true)
      // Phase 3: Play success sound
      if (soundEnabled) {
        playSuccessSound()
      }
    }
  }, [authStatus, soundEnabled])

  // Phase 4: Network status detection
  useEffect(() => {
    if (!showQRCode || !qrCodeDataUrl || authStatus !== 'waiting') return

    let consecutiveFailures = 0

    const checkNetwork = async () => {
      try {
        const startTime = performance.now()
        const response = await fetch('/api/admin/auth/verify', {
          method: 'HEAD',
          cache: 'no-cache',
        })
        const endTime = performance.now()
        const latency = endTime - startTime

        if (response.ok) {
          consecutiveFailures = 0
          if (latency > 2000) {
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

    // Check network every 5 seconds
    const networkCheckInterval = setInterval(checkNetwork, 5000)
    checkNetwork() // Initial check

    return () => {
      clearInterval(networkCheckInterval)
    }
  }, [showQRCode, qrCodeDataUrl, authStatus])

  // Phase 4: QR code auto-refresh function
  const refreshQRCode = useCallback(async () => {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    setError(null)
    
    try {
      // Get new admin LNURL from server
      const lnurlRes = await fetch('/api/admin/auth/lnurl')
      if (!lnurlRes.ok) {
        throw new Error('Failed to get admin LNURL')
      }
      
      const { k1, lnurl: lnurlBech32 } = await lnurlRes.json()
      setQrK1(k1)
      setTimeRemaining(300) // Reset to 5 minutes
      setAuthStatus('waiting')
      setAuthMessage('Waiting for authentication...')
      
      // Generate new QR code
      const domain = window.location.origin
      const callbackUrl = `${domain}/api/admin/auth/login?k1=${k1}`
      const lightningProtocol = `lightning:${callbackUrl}`
      
      setLightningLnurl(lightningProtocol)
      setPlainLnurl(callbackUrl)
      
      QRCode.toDataURL(lightningProtocol, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1a1a1a',
          light: '#FFFFFF'
        }
      })
      .then((dataUrl) => {
        setQrCodeDataUrl(dataUrl)
        setIsRefreshing(false)
      })
      .catch((err) => {
        console.error('QR code generation error:', err)
        setError('Failed to generate QR code. Please try again.')
        setIsRefreshing(false)
      })
    } catch (err) {
      console.error('QR refresh error:', err)
      setError('Failed to refresh QR code. Please try again.')
      setIsRefreshing(false)
    }
  }, [isRefreshing])

  // Poll for admin authentication status when QR code is shown
  useEffect(() => {
    if (!showQRCode || !qrK1 || !qrCodeDataUrl || authStatus !== 'waiting') return

    // Start polling after QR code is generated
    const startPolling = () => {
      let pollCount = 0
      const maxPolls = 60 // Poll for up to 60 seconds
      
      pollingIntervalRef.current = setInterval(async () => {
        pollCount++
        
        try {
          const verifyRes = await fetch('/api/admin/auth/verify', {
            credentials: 'include',
          })
          
          if (verifyRes.ok) {
            const verifyData = await verifyRes.json()
            if (verifyData.isAdmin) {
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
            setAuthMessage('Authentication timed out. Please try again.')
          }
        } catch (error) {
          console.error('Error polling admin auth status:', error)
          // Don't stop polling on network errors, just log them
        }
      }, 1000) // Poll every 1 second
    }
    
    // Start polling after a short delay to allow QR code to be scanned
    const delay = setTimeout(() => {
      startPolling()
    }, 2000) // Wait 2 seconds before starting to poll
    
    // Cleanup function
    return () => {
      clearTimeout(delay)
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [showQRCode, qrK1, qrCodeDataUrl, authStatus, router])

  // Countdown timer for QR code expiration
  useEffect(() => {
    if (!showQRCode || !qrK1) return

    expirationTimerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (expirationTimerRef.current) {
            clearInterval(expirationTimerRef.current)
            expirationTimerRef.current = null
          }
          // Phase 4: Auto-refresh QR code on expiration
          if (authStatus === 'waiting') {
            refreshQRCode()
          } else {
            setAuthStatus('error')
            setAuthMessage('QR code expired. Please generate a new one.')
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
  }, [showQRCode, qrK1, authStatus, refreshQRCode])

  // Copy to clipboard function
  const copyToClipboard = async (text: string, type: 'lightning' | 'plain' = 'lightning') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        
        // Show enhanced modal if in desktop tab with wallet selected, otherwise use simple feedback
        if (!isMobile && activeTab === 'desktop' && selectedWallet) {
          setShowCopyModal(true)
        } else {
          setTimeout(() => setCopied(false), 2000)
        }
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        
        // Show enhanced modal if in desktop tab with wallet selected, otherwise use simple feedback
        if (!isMobile && activeTab === 'desktop' && selectedWallet) {
          setShowCopyModal(true)
        } else {
          setTimeout(() => setCopied(false), 2000)
        }
      }
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Reset QR code state
  const resetQRCode = () => {
    setShowQRCode(false)
    setQrCodeDataUrl('')
    setQrK1(null)
    setAuthStatus('waiting')
    setAuthMessage('')
    setLightningLnurl('')
    setPlainLnurl('')
    setTimeRemaining(300)
    setDeepLinkAttempted(false)
    setShowReturnReminder(false)
    setTabWasHidden(false)
    setShowPersistentReminder(false)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    if (expirationTimerRef.current) {
      clearInterval(expirationTimerRef.current)
      expirationTimerRef.current = null
    }
    if (deepLinkTimeoutRef.current) {
      clearTimeout(deepLinkTimeoutRef.current)
      deepLinkTimeoutRef.current = null
    }
  }

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAdminLogin = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Get admin LNURL from server
      const lnurlRes = await fetch('/api/admin/auth/lnurl')
      if (!lnurlRes.ok) {
        throw new Error('Failed to get admin LNURL')
      }
      
      const { k1, lnurl: lnurlBech32 } = await lnurlRes.json()
      console.log('Admin login: Received challenge k1:', k1.substring(0, 20) + '...')
      
      // Check if WebLN is available
      if (typeof window !== 'undefined' && window.webln) {
        try {
          await window.webln.enable()
          
          if (window.webln.lnurl) {
            console.log('Admin login: Calling WebLN.lnurl() - wallet should show authentication popup')
            const result = await window.webln.lnurl(lnurlBech32)
            console.log('Admin login: WebLN result:', result)
            
            // WebLN.lnurl() resolves when the wallet calls the callback
            // The callback sets the admin_session cookie
            // Wait a moment for the cookie to be set, then verify
            console.log('Admin login: Waiting for callback to complete...')
            
            // Poll for admin session with retries
            let retries = 10
            let authenticated = false
            
            while (retries > 0 && !authenticated) {
              await new Promise(resolve => setTimeout(resolve, 1000))
              
              const verifyRes = await fetch('/api/admin/auth/verify', {
                credentials: 'include',
              })
              
              if (verifyRes.ok) {
                const verifyData = await verifyRes.json()
                if (verifyData.isAdmin) {
                  console.log('✓ Admin authentication successful')
                  authenticated = true
                  router.push('/admin/dashboard')
                  return
                } else {
                  console.log(`Admin login: Not authenticated yet (${retries} retries left)`)
                }
              }
              
              retries--
            }
            
            if (!authenticated) {
              // Check one more time after all retries
              const finalVerifyRes = await fetch('/api/admin/auth/verify', {
                credentials: 'include',
              })
              
              if (finalVerifyRes.ok) {
                const finalVerifyData = await finalVerifyRes.json()
                if (finalVerifyData.isAdmin) {
                  router.push('/admin/dashboard')
                  return
                } else {
                  // Check if we got an error response with details
                  const errorText = await finalVerifyRes.text().catch(() => '')
                  console.error('Admin login: Final verification failed', errorText)
                  
                  // Try to get the derived xpub from server logs
                  // The callback should have logged it, but we can't access it from client
                  // Instead, show helpful error message
                  setError('Authentication completed but this xpub is not authorized for admin access. Please check your server logs for the derived xpub and set ADMIN_XPUB in .env.local to match it.')
                }
              } else {
                const errorText = await finalVerifyRes.text().catch(() => '')
                console.error('Admin login: Verification request failed', finalVerifyRes.status, errorText)
                setError('Failed to verify admin access. Please check server logs for details. The wallet may not have called the callback, or ADMIN_XPUB may not be set.')
              }
            }
          }
        } catch (weblnError) {
          console.error('WebLN error:', weblnError)
          // If WebLN fails, offer QR code as fallback
          setQrK1(k1)
          setShowQRCode(true)
          setAuthStatus('waiting')
          setAuthMessage('Waiting for authentication...')
          setError(null) // Clear any previous errors
          
          // Generate QR code
          const domain = window.location.origin
          const callbackUrl = `${domain}/api/admin/auth/login?k1=${k1}`
          const lightningProtocol = `lightning:${callbackUrl}`
          
          setLightningLnurl(lightningProtocol)
          setPlainLnurl(callbackUrl)
          setTimeRemaining(300) // Reset to 5 minutes
          
          QRCode.toDataURL(lightningProtocol, {
            width: 300,
            margin: 2,
            color: {
              dark: '#1a1a1a',
              light: '#FFFFFF'
            }
          })
          .then((dataUrl) => {
            setQrCodeDataUrl(dataUrl)
          })
          .catch((err) => {
            console.error('QR code generation error:', err)
            setError('Failed to generate QR code. Please try again.')
            setShowQRCode(false)
          })
        }
      } else {
        // WebLN not available, show QR code inline
        console.log('Admin login: WebLN not available, showing QR code inline')
        setQrK1(k1)
        setShowQRCode(true)
        setAuthStatus('waiting')
        setAuthMessage('Waiting for authentication...')
        setTimeRemaining(300) // Reset to 5 minutes
        
        // Generate QR code
        const domain = window.location.origin
        const callbackUrl = `${domain}/api/admin/auth/login?k1=${k1}`
        const lightningProtocol = `lightning:${callbackUrl}`
        
        setLightningLnurl(lightningProtocol)
        setPlainLnurl(callbackUrl)
        
        QRCode.toDataURL(lightningProtocol, {
          width: 300,
          margin: 2,
          color: {
            dark: '#1a1a1a',
            light: '#FFFFFF'
          }
        })
        .then((dataUrl) => {
          setQrCodeDataUrl(dataUrl)
        })
        .catch((err) => {
          console.error('QR code generation error:', err)
          setError('Failed to generate QR code. Please try again.')
          setShowQRCode(false)
        })
        
        setLoading(false)
        return
      }
    } catch (err) {
      console.error('Admin login error:', err)
      setError('An error occurred during login. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen relative flex items-center justify-center" style={{ backgroundColor: '#1a1a1a' }}>
        {/* Subtle T-Rex scale pattern overlay - matching main site */}
        <div className="fixed inset-0 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg%3E%3Cpath d='M0 15 L15 0 M15 30 L30 15 M30 45 L45 30 M45 60 L60 45 M60 75 L75 60 M75 90 L90 75 M90 100 L100 85' stroke='%23f97316' stroke-width='1.1' stroke-opacity='0.22' fill='none'/%3E%3Cpath d='M0 30 L15 15 M15 45 L30 30 M30 60 L45 45 M45 75 L60 60 M60 90 L75 75 M75 100 L90 85' stroke='%23f97316' stroke-width='1.1' stroke-opacity='0.22' fill='none'/%3E%3Cpath d='M15 0 L30 15 M30 15 L45 30 M45 30 L60 45 M60 45 L75 60 M75 60 L90 75 M90 75 L100 90' stroke='%23f97316' stroke-width='1.1' stroke-opacity='0.22' fill='none'/%3E%3Cpath d='M15 15 L30 30 M30 30 L45 45 M45 45 L60 60 M60 60 L75 75 M75 75 L90 90 M90 90 L100 100' stroke='%23f97316' stroke-width='1.1' stroke-opacity='0.22' fill='none'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px',
          backgroundPosition: '0 0',
          opacity: 0.16,
        }} />
        
        {/* Enhanced radial glow accents - matching main site */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-orange-500/12 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-orange-500/12 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="text-white text-lg">Checking session...</div>
      </div>
    )
  }

  return (
    <>
      {/* Phase 3: Success Animation Overlay */}
      {showSuccessAnimation && authStatus === 'success' && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          role="status"
          aria-live="polite"
          aria-label="Authentication successful"
        >
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
      
      <div className="min-h-screen relative flex items-center justify-center p-4" style={{ backgroundColor: '#1a1a1a' }}>
        {/* Subtle T-Rex scale pattern overlay - matching main site */}
        <div className="fixed inset-0 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg%3E%3Cpath d='M0 15 L15 0 M15 30 L30 15 M30 45 L45 30 M45 60 L60 45 M60 75 L75 60 M75 90 L90 75 M90 100 L100 85' stroke='%23f97316' stroke-width='1.1' stroke-opacity='0.22' fill='none'/%3E%3Cpath d='M0 30 L15 15 M15 45 L30 30 M30 60 L45 45 M45 75 L60 60 M60 90 L75 75 M75 100 L90 85' stroke='%23f97316' stroke-width='1.1' stroke-opacity='0.22' fill='none'/%3E%3Cpath d='M15 0 L30 15 M30 15 L45 30 M45 30 L60 45 M60 45 L75 60 M75 60 L90 75 M90 75 L100 90' stroke='%23f97316' stroke-width='1.1' stroke-opacity='0.22' fill='none'/%3E%3Cpath d='M15 15 L30 30 M30 30 L45 45 M45 45 L60 60 M60 60 L75 75 M75 75 L90 90 M90 90 L100 100' stroke='%23f97316' stroke-width='1.1' stroke-opacity='0.22' fill='none'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px',
          backgroundPosition: '0 0',
          opacity: 0.16,
        }} />
        
        {/* Enhanced radial glow accents - matching main site */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-orange-500/12 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-orange-500/12 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="w-full max-w-md">
        {/* Back to Home Link */}
        <div className="mb-4">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-white/400 hover:text-orange-400 transition-colors text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Home
          </Link>
        </div>
        
        <div className="bg-dark-200/90 rounded-2xl shadow-2xl border border-orange-500/20 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full mb-4">
              <span className="text-white font-bold text-2xl">⚡</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
            <p className="text-white/400">Sign in with your Lightning wallet</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* QR Code Section */}
          {showQRCode && qrCodeDataUrl && (
            <div className="mb-6 space-y-4">
              {/* Persistent Return Reminder - Shown when user returns to tab */}
              {showPersistentReminder && isMobile && deepLinkAttempted && authStatus === 'waiting' && (
                <div className="bg-gradient-to-r from-orange-500/30 to-orange-600/30 border-2 border-orange-400 rounded-lg p-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">⚠️</div>
                    <div className="flex-1">
                      <p className="text-orange-200 font-bold text-sm mb-1">
                        Welcome back! Did you approve in your wallet?
                      </p>
                      <p className="text-orange-300 text-xs">
                        Authentication is waiting for your approval. If you already approved in your wallet, this page will automatically detect it and sign you in.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPersistentReminder(false)}
                      className="text-orange-300 hover:text-orange-200 text-lg font-bold"
                      aria-label="Dismiss reminder"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 1: Tabbed Interface for Desktop Users (not mobile) */}
              {!isMobile && (
                <div className="mb-4">
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
                </div>
              )}

              <div className="text-center">
                <h3 className="text-white font-semibold mb-2">Authenticate with your Lightning wallet</h3>
                {isMobile ? (
                  <p className="text-white/400 text-sm mb-2">
                    Tap "Open in Wallet" to authenticate, or copy the LNURL if that doesn't work.
                  </p>
                ) : (
                  <p className="text-white/400 text-sm mb-2">
                    {activeTab === 'mobile' 
                      ? 'Use your mobile wallet to scan the QR code below.'
                      : 'Copy the LNURL below and paste it into your desktop wallet.'}
                  </p>
                )}
                {timeRemaining > 0 && (
                  <p className="text-white/500 text-xs">
                    Authentication expires in {formatTime(timeRemaining)}
                  </p>
                )}
                {timeRemaining === 0 && !isRefreshing && (
                  <p className="text-orange-400 text-xs font-semibold">
                    QR code expired. Generating new one...
                  </p>
                )}
              </div>

              {/* Phase 4: Network Status Indicator */}
              {networkStatus && authStatus === 'waiting' && (
                <div className={`p-2 rounded-lg border text-center ${
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

              {/* Mobile: Open in Wallet Button (Primary Action) - Always shown for mobile */}
              {isMobile && lightningLnurl && (
                <div className="space-y-2">
                  <a
                    href={lightningLnurl}
                    className="block w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg text-center"
                    onClick={(e) => {
                      setDeepLinkAttempted(true)
                      setShowReturnReminder(true)
                      
                      // Check if deep link worked after a delay
                      deepLinkTimeoutRef.current = setTimeout(() => {
                        // If page still has focus after 1 second, deep link might have failed
                        if (document.hasFocus() && document.visibilityState === 'visible') {
                          // Deep link likely didn't work - wallet app didn't open
                          console.log('Deep link may not have worked')
                          // Don't show error immediately - user might be slow to respond
                        }
                      }, 1000)
                    }}
                  >
                    📱 Open in Wallet
                  </a>
                  <p className="text-white/400 text-xs text-center">
                    {deepLinkAttempted 
                      ? 'If you have multiple wallets, choose one from the list that appears'
                      : 'This will open your Lightning wallet app directly'}
                  </p>
                  {deepLinkAttempted && (
                    <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-3 mt-2">
                      <p className="text-blue-300 text-xs text-center">
                        <strong className="text-orange-200">Important:</strong> After approving in your wallet, return to this browser tab to complete authentication.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* QR Code - Show in mobile tab for desktop users, or always for mobile users */}
              {((!isMobile && activeTab === 'mobile') || isMobile) && (
                <div className="bg-white p-4 rounded-lg shadow-inner flex justify-center">
                  <img 
                    src={qrCodeDataUrl} 
                    alt="Admin Login QR Code" 
                    className="w-full max-w-[300px] h-auto"
                  />
                </div>
              )}

              {/* Phase 1: Tabbed Content for Desktop Users */}
              {!isMobile ? (
                <>
                  {/* Mobile Wallet Tab Content */}
                  {activeTab === 'mobile' && (
                    <div role="tabpanel" aria-labelledby="mobile-tab" className="space-y-4">
                      {/* Mobile Wallet Instructions */}
                      <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50 text-left">
                        <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                          <span className="text-orange-400">📱</span>
                          Using a mobile wallet?
                        </h4>
                        <ol className="text-white/300 text-xs space-y-2 ml-5 list-decimal">
                          <li>Open your Lightning wallet app on your mobile device</li>
                          <li>Tap the scan button in your wallet</li>
                          <li>Point your camera at the QR code above</li>
                          <li>Approve the authentication request in your wallet</li>
                        </ol>
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
                          <option value="sparrow">Sparrow Wallet</option>
                          <option value="electrum">Electrum</option>
                          <option value="bluewallet">BlueWallet Desktop</option>
                          <option value="wasabi">Wasabi Wallet</option>
                          <option value="other">Other desktop wallet</option>
                        </select>
                      </div>

                      {/* Phase 2: Enhanced Copy Section */}
                      <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-lg p-4 border-2 border-orange-500/50">
                        <p className="text-orange-200 text-sm font-semibold mb-3 text-center">
                          💻 Copy the LNURL below and paste it into your desktop wallet
                        </p>
                        
                        {/* Large Copy Button */}
                        <button
                          onClick={() => copyToClipboard(lightningLnurl, 'lightning')}
                          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg text-base mb-3"
                        >
                          {copied ? '✓ LNURL Copied!' : '📋 Copy Lightning LNURL'}
                        </button>
                        
                        {/* Alternative Copy Button */}
                        <button
                          onClick={() => copyToClipboard(plainLnurl, 'plain')}
                          className="w-full bg-dark-700 hover:bg-dark-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
                        >
                          {copied ? '✓ Copied!' : 'Copy Plain LNURL'}
                        </button>

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
                            How to use with {selectedWallet === 'sparrow' ? 'Sparrow Wallet' : 
                                             selectedWallet === 'electrum' ? 'Electrum' :
                                             selectedWallet === 'bluewallet' ? 'BlueWallet Desktop' :
                                             selectedWallet === 'wasabi' ? 'Wasabi Wallet' :
                                             'your wallet'}:
                          </h4>
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
                </>
              ) : (
                /* Mobile Users - Original Layout */
                <>
                  {/* Mobile Wallet Instructions */}
                  <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50 text-left space-y-4">
                    <div>
                      <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                        <span className="text-orange-400">📱</span>
                        Using a mobile wallet?
                      </h4>
                      <ol className="text-white/300 text-xs space-y-2 ml-5 list-decimal">
                        <li>Tap the "Open in Wallet" button above</li>
                        <li>If you have multiple wallets installed, choose one from the list that appears</li>
                        <li>Your Lightning wallet app will open automatically</li>
                        <li>Approve the authentication request in your wallet</li>
                        <li><strong>Return to this browser tab</strong> after approving (authentication will complete automatically)</li>
                        <li>If the button doesn't work, copy the LNURL below and paste it into your wallet manually</li>
                      </ol>
                    </div>

                    <div className="pt-3 border-t border-dark-700/50">
                      <p className="text-white/400 text-xs mb-1">
                        <strong className="text-white/300">Recommended wallets:</strong> Alby (browser extension), Phoenix (mobile), Zeus (mobile), Breez (mobile)
                      </p>
                    </div>
                  </div>

                  {/* Copy LNURL Buttons for Mobile */}
                  {lightningLnurl && (
                    <div className="space-y-2">
                      <div className="bg-dark-800/30 rounded-lg p-3 border border-dark-700/30">
                        <p className="text-white/400 text-xs mb-2 text-center">
                          <strong className="text-white/300">Alternative:</strong> If "Open in Wallet" didn't work or you don't have a wallet installed, copy one of these LNURLs and paste it into your wallet
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => copyToClipboard(lightningLnurl, 'lightning')}
                            className="flex-1 bg-dark-700 hover:bg-dark-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                          >
                            {copied ? '✓ Copied!' : 'Copy Lightning LNURL'}
                          </button>
                          <button
                            onClick={() => copyToClipboard(plainLnurl, 'plain')}
                            className="flex-1 bg-dark-700 hover:bg-dark-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                          >
                            Copy Plain LNURL
                          </button>
                        </div>
                        {/* Simple feedback for when modal is not shown */}
                        {copied && !showCopyModal && (
                          <p className="text-orange-400 text-xs text-center mt-2">
                            LNURL copied to clipboard! Paste it into your wallet app.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Authentication Status */}
              {authStatus === 'waiting' && (
                <div className="p-4 bg-orange-500/20 border border-orange-500/50 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    <p className="text-blue-400 text-sm font-semibold">Waiting for authentication...</p>
                  </div>
                  {isMobile && deepLinkAttempted ? (
                    <div className="mt-3 space-y-2">
                      {!showPersistentReminder && (
                        <>
                          <p className="text-blue-300 text-xs text-center">
                            <strong>Did you approve in your wallet?</strong> Return to this browser tab to complete authentication.
                          </p>
                          <p className="text-orange-200 text-xs text-center font-semibold">
                            ⚠️ Keep this tab open while you approve in your wallet
                          </p>
                        </>
                      )}
                      {showPersistentReminder && (
                        <p className="text-blue-300 text-xs text-center">
                          Authentication is being verified... If you approved in your wallet, you'll be signed in automatically.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-blue-300 text-xs mt-2 text-center">
                      {isMobile 
                        ? 'Tap "Open in Wallet" above, or copy the LNURL and paste it into your wallet, then approve the authentication request.'
                        : 'Scan the QR code with your mobile wallet, or copy the LNURL for your desktop wallet, then approve the authentication request.'}
                    </p>
                  )}
                </div>
              )}

              {authStatus === 'success' && (
                <div className="p-4 bg-orange-500/20 border border-orange-500/50 rounded-lg">
                  <p className="text-orange-400 text-sm font-semibold text-center">
                    ✓ {authMessage}
                  </p>
                </div>
              )}

              {authStatus === 'error' && (
                <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm font-semibold text-center mb-3">
                    ✗ {authMessage}
                  </p>
                  
                  {/* Phase 5: Enhanced Error Handling with Troubleshooting Tips */}
                  <div className="bg-dark-800/50 rounded-lg p-3 border border-dark-700/50 mb-3">
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
                      onClick={() => {
                        resetQRCode()
                        handleAdminLogin()
                      }}
                      className="w-full bg-dark-700 hover:bg-dark-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      Try Again
                    </button>
                    {/* Phase 4: Generate New QR Code Button */}
                    <button
                      onClick={refreshQRCode}
                      disabled={isRefreshing}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isRefreshing ? 'Generating New QR Code...' : 'Generate New QR Code'}
                    </button>
                  </div>
                </div>
              )}

              {/* Cancel/Back Button */}
              <button
                onClick={resetQRCode}
                className="w-full text-white/400 hover:text-white font-medium py-2 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Pre-click Information */}
          {!showQRCode && (
            <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-blue-300 text-xs text-center">
                <span className="font-semibold">💡 Tip:</span> If you don't have a Lightning wallet browser extension (like Alby), you can use a mobile wallet to scan a QR code.
              </p>
            </div>
          )}

          {/* Login Button - Hidden when QR code is shown */}
          {!showQRCode && (
            <div className="space-y-4">
              <button
                onClick={handleAdminLogin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (window.webln ? 'Authenticating...' : 'Preparing QR code...') : 'Sign In to Admin Portal'}
              </button>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-dark-700/30 rounded-lg">
            <p className="text-white/400 text-xs text-center">
              Only authorized administrators can access this portal.
            </p>
          </div>
        </div>
      </div>
    </div>

    {/* Enhanced Copy Success Modal */}
    {!isMobile && activeTab === 'desktop' && selectedWallet && (
      <CopySuccessModal
        selectedWallet={selectedWallet}
        isVisible={showCopyModal}
        onDismiss={() => {
          setShowCopyModal(false)
          setCopied(false)
        }}
      />
    )}
    </>
  )
}

