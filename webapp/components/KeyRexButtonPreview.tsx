'use client'

import { useState, useEffect, useRef } from 'react'
import { EmbedConfig } from '@/types'
import { DEFAULT_BUTTON_STYLE, BUTTON_HOVER_STYLE, BUTTON_NORMAL_STYLE } from '@/lib/button-styles'

interface KeyRexButtonPreviewProps {
  siteId?: string // Optional - if not provided, uses default styling
  className?: string
  customCSS?: string // Optional - custom CSS to apply to the button
  showInCard?: boolean // Whether to show in white card wrapper (default: true)
}

// Wallet logo component with tooltip (non-intrusive - 500ms delay)
function WalletLogoWithTooltip({ name, url, logoUrl, isDarkMode, index = 0 }: { name: string; url: string; logoUrl: string; isDarkMode: boolean; index?: number }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const handleMouseEnter = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true)
    }, 500) // 500ms delay - only shows if user hovers intentionally
  }
  
  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current)
    }
    setShowTooltip(false)
  }
  
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current)
      }
    }
  }, [])
  
  const containerBg = isDarkMode ? 'bg-orange-500/10' : 'bg-orange-500/5'
  const containerBorder = isDarkMode ? 'border-orange-500/20' : 'border-orange-500/10'
  const hoverBg = isDarkMode ? 'hover:bg-orange-500/20' : 'hover:bg-orange-500/10'
  const hoverBorder = isDarkMode ? 'hover:border-orange-500/30' : 'hover:border-orange-500/20'
  const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.6)'
  const tooltipBg = isDarkMode ? 'rgba(0, 0, 0, 0.95)' : 'rgba(26, 26, 26, 0.95)'
  
  {/* COMPACT MODE: Reduced sizes and gaps */}
  return (
    <div 
      className="flex flex-col items-center gap-1"
      style={{
        opacity: 0,
        animation: 'keyrex-fade-in-stagger 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        animationDelay: `${0.2 + (index * 0.1)}s`
      }}
    >
      {/* COMPACT: Reduced wallet circle from w-12 h-12 to w-10 h-10 */}
      <div 
        className={`relative flex items-center justify-center w-10 h-10 ${containerBg} rounded-full border ${containerBorder} transition-all duration-300 ease-out focus-within:outline-2 focus-within:outline-orange-500/50 focus-within:outline-offset-2`}
        onMouseEnter={(e) => {
          handleMouseEnter()
          e.currentTarget.style.transform = 'translateY(-3px) scale(1.08)'
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(249, 115, 22, 0.2), 0 2px 6px rgba(249, 115, 22, 0.15), 0 0 20px rgba(249, 115, 22, 0.2)'
          e.currentTarget.style.animation = 'keyrex-glow 2s ease-in-out infinite'
        }}
        onMouseLeave={(e) => {
          handleMouseLeave()
          e.currentTarget.style.transform = 'translateY(0) scale(1)'
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.animation = 'none'
        }}
      >
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center p-2 w-full h-full rounded-full"
          style={{ textDecoration: 'none' }}
          aria-label={`${name} wallet`}
          onFocus={handleMouseEnter}
          onBlur={handleMouseLeave}
        >
          {/* COMPACT: Reduced logo size from h-7 to h-6 */}
          <img
            src={logoUrl}
            alt={name}
            className="h-6 w-auto object-contain transition-transform duration-300"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const parent = target.parentElement?.parentElement;
              if (parent) {
                parent.textContent = name.charAt(0);
                parent.className = `flex items-center justify-center w-12 h-12 ${isDarkMode ? 'bg-orange-500/20' : 'bg-orange-500/10'} rounded-full border ${isDarkMode ? 'border-orange-500/30' : 'border-orange-500/20'} font-semibold text-sm text-orange-500`;
              }
            }}
          />
        </a>
        
        {/* Subtle tooltip - only shows after delay */}
        {showTooltip && (
          <div
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-1 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white whitespace-nowrap pointer-events-none z-50 shadow-lg transition-all duration-200"
            style={{ 
              background: tooltipBg,
              opacity: showTooltip ? 1 : 0,
              transform: showTooltip ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-4px)'
            }}
          >
            Get {name} wallet
            {/* Tooltip arrow */}
            <div 
              className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent"
              style={{ borderTopColor: tooltipBg }}
            />
          </div>
        )}
      </div>
      {/* COMPACT: Reduced font size from text-xs to text-[0.6875rem] (11px) */}
      <span className="text-center leading-tight font-medium" style={{ fontSize: '0.6875rem', color: textColor, letterSpacing: '0.01em' }}>
        {name}
      </span>
    </div>
  )
}

/**
 * Shared component for Key-Rex button preview
 * This ensures all previews (dashboard, landing page) use the same styling
 * and stay in sync with the actual embed script
 */
export default function KeyRexButtonPreview({ siteId, className = '', customCSS, showInCard = true }: KeyRexButtonPreviewProps) {
  const [config, setConfig] = useState<EmbedConfig | null>(null)
  const [loading, setLoading] = useState(!!siteId)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showLogoTooltip, setShowLogoTooltip] = useState(false)
  
  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      const hasDarkClass = document.documentElement.classList.contains('dark')
      setIsDarkMode(prefersDark || hasDarkClass)
    }
    
    checkDarkMode()
    
    // Listen for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', checkDarkMode)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(checkDarkMode)
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', checkDarkMode)
      } else {
        mediaQuery.removeListener(checkDarkMode)
      }
    }
  }, [])

  // Fetch config from server (works for both landing page and dashboard)
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
        // If siteId provided, include it; otherwise fetch default config (for landing page)
        const url = siteId 
          ? `${baseUrl}/api/embed/config?siteId=${siteId}`
          : `${baseUrl}/api/embed/config`
        
        const response = await fetch(url, {
          cache: 'no-cache',
        })
        if (response.ok) {
          const configData = await response.json()
          setConfig(configData)
        } else {
          // Fallback to default
          setConfig({
            siteId: siteId || '',
            buttonText: 'Sign in with Key-Rex',
            showBranding: true,
            featuredWallets: [],
            footerText: siteId ? 'Powered by Key-Rex — open-source' : 'Works with any lightning wallet',
          })
        }
      } catch (error) {
        console.error('Failed to load embed config:', error)
        // Fallback to default
        setConfig({
          siteId: siteId || '',
            buttonText: 'Sign in with Key-Rex',
          showBranding: true,
          featuredWallets: [],
            footerText: siteId ? 'Powered by Key-Rex — open-source' : 'Works with any lightning wallet',
        })
      } finally {
        setLoading(false)
      }
    }

    loadConfig()

    // Refresh config periodically (both landing page and dashboard)
    const interval = setInterval(loadConfig, 30000) // Every 30 seconds
    
    // Listen for wallet update events (from admin dashboard)
    const handleWalletUpdate = () => {
      loadConfig()
    }
    window.addEventListener('keyrex-wallet-updated', handleWalletUpdate)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('keyrex-wallet-updated', handleWalletUpdate)
    }
  }, [siteId])

  // Apply custom CSS if provided
  useEffect(() => {
    if (customCSS) {
      const styleId = 'keyrex-custom-css-preview-shared'
      let styleEl = document.getElementById(styleId)
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = styleId
        document.head.appendChild(styleEl)
      }
      // Ensure CSS targets preview button
      let previewCSS = customCSS
      if (previewCSS.includes('#keyrex-button') && !previewCSS.includes('#keyrex-button-preview')) {
        previewCSS = previewCSS.replace(/#keyrex-button(?![-a-z])/g, '#keyrex-button, #keyrex-button-preview')
      }
      styleEl.textContent = previewCSS
    } else {
      // Remove custom CSS if not provided
      const styleId = 'keyrex-custom-css-preview-shared'
      const styleEl = document.getElementById(styleId)
      if (styleEl) {
        styleEl.remove()
      }
    }
  }, [customCSS])

  if (loading) {
    return (
      <div className={showInCard ? `bg-white rounded-[1.25rem] py-6 px-8 border border-orange-500/20 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] ${className}` : className}>
        <div className="flex flex-row items-center gap-6">
          {/* Skeleton logo button */}
          <div className="w-20 h-20 bg-gradient-to-r from-dark-600 via-dark-500 to-dark-600 rounded-lg animate-pulse bg-[length:200%_100%]" style={{ animation: 'keyrex-skeleton 1.5s ease-in-out infinite' }}></div>
          {/* Skeleton wallets */}
          <div className="flex gap-4 flex-1">
            {[0, 1, 2].map((i) => (
              <div 
                key={i} 
                className="w-12 h-12 bg-gradient-to-r from-dark-600 via-dark-500 to-dark-600 rounded-full animate-pulse bg-[length:200%_100%]" 
                style={{ animation: 'keyrex-skeleton 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }}
              ></div>
            ))}
          </div>
        </div>
        <style jsx>{`
          @keyframes keyrex-skeleton {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    )
  }

  if (!config) {
    return null
  }

  // Use shared styling constants - automatically stays in sync with embed script
  // Only apply default styles if customCSS is not provided
  const defaultButtonStyle: React.CSSProperties = customCSS ? {} : DEFAULT_BUTTON_STYLE
  
  // Default Tailwind classes if no custom CSS
  const defaultButtonClasses = customCSS ? '' : 'w-full'

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!customCSS) {
      e.currentTarget.style.transform = BUTTON_HOVER_STYLE.transform
      e.currentTarget.style.background = BUTTON_HOVER_STYLE.background
      e.currentTarget.style.boxShadow = BUTTON_HOVER_STYLE.boxShadow
    }
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!customCSS) {
      e.currentTarget.style.transform = BUTTON_NORMAL_STYLE.transform
      e.currentTarget.style.background = BUTTON_NORMAL_STYLE.background
      e.currentTarget.style.boxShadow = BUTTON_NORMAL_STYLE.boxShadow
    }
  }

  const buttonContent = (
    // Match embed script layout: logo and wallets side‑by‑side on desktop, stacked only on small screens
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
      {/* Left side container - logo button */}
      <div className="flex-shrink-0 flex flex-col items-center gap-2 relative">
        {/* Main Login Button - transparent background with orange glow on hover */}
        <button
          id="keyrex-button-preview"
          className="bg-transparent border-none cursor-pointer transition-all duration-300 ease-out outline-none focus:outline-2 focus:outline-orange-500/50 focus:outline-offset-4 rounded-lg flex items-center justify-center"
          style={{
            transform: 'scale(1)',
            minWidth: '12rem',
            overflow: 'hidden',
            padding: '0.5rem',
            boxShadow: 'none',
          }}
          onMouseEnter={(e) => {
            if (!customCSS) {
              e.currentTarget.style.transform = 'scale(1.03)'
              e.currentTarget.style.boxShadow = '0 0 12px rgba(249, 115, 22, 0.5), 0 0 24px rgba(249, 115, 22, 0.25)'
              e.currentTarget.style.outline = '2px solid rgba(249, 115, 22, 0.6)'
            }
            setShowLogoTooltip(true)
          }}
          onMouseLeave={(e) => {
            if (!customCSS) {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.outline = 'none'
            }
            setShowLogoTooltip(false)
          }}
          onMouseDown={(e) => {
            if (!customCSS) {
              e.currentTarget.style.transform = 'scale(0.98)'
              e.currentTarget.style.boxShadow = '0 0 16px rgba(249, 115, 22, 0.7), 0 0 32px rgba(249, 115, 22, 0.4)'
              e.currentTarget.style.outline = '2px solid rgba(249, 115, 22, 0.8)'
            }
          }}
          onMouseUp={(e) => {
            if (!customCSS) {
              e.currentTarget.style.transform = 'scale(1.03)'
              e.currentTarget.style.boxShadow = '0 0 12px rgba(249, 115, 22, 0.5), 0 0 24px rgba(249, 115, 22, 0.25)'
              e.currentTarget.style.outline = '2px solid rgba(249, 115, 22, 0.6)'
            }
          }}
          onFocus={() => {
            setShowLogoTooltip(true)
          }}
          onBlur={() => {
            setShowLogoTooltip(false)
          }}
          onClick={(e) => {
            e.preventDefault()
            alert('This is a preview. After adding the integration code to your website, this button will allow your users to authenticate with their Lightning wallets.')
          }}
          disabled={!!siteId} // Disable if siteId provided (dashboard preview)
          aria-label="Sign in with Key-Rex"
          title="Don't see your wallet? Click Sign in with Key-Rex"
        >
          <img
            src="/images/sign-in-with-paw.png"
            alt="Sign in with Key-Rex"
            style={{ height: 'auto', width: 'auto', maxHeight: '7rem', objectFit: 'contain', display: 'block' }}
          />
        </button>

        {/* Instant, subtle tooltip for logo in preview */}
        {showLogoTooltip && (
          <div
            className="absolute -top-3 left-1/2 transform -translate-x-1/2 -translate-y-full px-3 py-1.5 rounded-lg text-xs font-medium text-white whitespace-nowrap z-50 shadow-lg"
            style={{
              background: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(30, 41, 59, 0.95)',
            }}
          >
            Don't see your wallet? Click Sign in with Key-Rex
            <div
              className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
              style={{
                borderTopColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(30, 41, 59, 0.95)',
              }}
            />
          </div>
        )}
      </div>

      {/* Right side container - wallets only - COMPACT MODE */}
      <div className="flex flex-col gap-1 justify-center items-center">
        <p className="text-[0.6875rem] font-medium text-white/60 mb-1 text-center w-full">Featured Wallets</p>
        <p className="text-[0.625rem] text-white/40 italic">Coming Soon</p>
        
        {customCSS && (
          <div className="mt-1 text-xs text-green-500 text-left">
            ✓ Custom styling applied
          </div>
        )}
      </div>
      
      {/* FOOTER REMOVED - COMPACT MODE */}
      {/* To restore footer, uncomment below: */}
      {/* <div 
        className="text-center mt-6 pt-6 border-t"
        style={{ 
          fontSize: '0.8125rem', 
          color: isDarkMode ? 'rgb(148, 163, 184)' : 'rgb(113, 128, 150)', 
          lineHeight: '1.4', 
          letterSpacing: '0.01em', 
          fontWeight: 400,
          borderTopColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }}
      >
        Powered by Key-Rex - Open Source
      </div> */}
    </div>
  )


  if (showInCard) {
    return (
      <div 
        // COMPACT MODE: Reduced padding and width so card closely hugs its contents
        className={`inline-block rounded-[1.25rem] py-4 px-5 border shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(249,115,22,0.1)] max-w-[440px] animate-[keyrex-fade-in_0.4s_ease-out_forwards] ${className} ${
          isDarkMode 
            ? 'bg-dark-200 border-orange-500/40 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.5),0_4px_6px_-2px_rgba(0,0,0,0.3),0_0_0_1px_rgba(249,115,22,0.3)]' 
            : 'bg-white border-orange-500/20'
        }`}
        style={{ opacity: 0 }}
      >
        <style jsx>{`
          @keyframes keyrex-fade-in {
            from {
              opacity: 0;
              transform: translateY(-4px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes keyrex-fade-in-stagger {
            from {
              opacity: 0;
              transform: translateY(8px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes keyrex-glow {
            0%, 100% {
              box-shadow: 0 0 0 rgba(249, 115, 22, 0);
            }
            50% {
              box-shadow: 0 0 20px rgba(249, 115, 22, 0.3), 0 0 40px rgba(249, 115, 22, 0.15);
            }
          }
          @keyframes keyrex-logo-glow {
            0%, 100% {
              box-shadow: 0 8px 16px rgba(249, 115, 22, 0.2), 0 2px 4px rgba(249, 115, 22, 0.1), 0 0 0 rgba(249, 115, 22, 0);
            }
            50% {
              box-shadow: 0 8px 16px rgba(249, 115, 22, 0.3), 0 2px 4px rgba(249, 115, 22, 0.15), 0 0 30px rgba(249, 115, 22, 0.4), 0 0 60px rgba(249, 115, 22, 0.2);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-\\[keyrex-fade-in_0\\.4s_ease-out_forwards\\] {
              animation: none;
              opacity: 1;
            }
            [data-keyrex-wallet] {
              animation: none !important;
              opacity: 1 !important;
              transform: none !important;
            }
          }
        `}</style>
        {buttonContent}
      </div>
    )
  }

  return (
    <div className={className}>
      {buttonContent}
    </div>
  )
}

