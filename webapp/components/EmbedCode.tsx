'use client'

import { useState, useEffect } from 'react'
import { EmbedConfig, FeaturedWallet } from '@/types'
import KeyRexButtonPreview from './KeyRexButtonPreview'
import { useToast } from '@/components/ToastContainer'

interface EmbedCodeProps {
  siteId: string
  hasCustomStyling?: boolean
  customCSS?: string
  customButtonText?: string
}

export default function EmbedCode({ siteId, hasCustomStyling = false, customCSS, customButtonText }: EmbedCodeProps) {
  const toast = useToast()
  const [copied, setCopied] = useState<boolean | 'manual'>(false)
  const [embedConfig, setEmbedConfig] = useState<EmbedConfig | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)

  // Debug: Log when customCSS changes
  useEffect(() => {
    console.log('=== EmbedCode: customCSS prop changed ===')
    console.log('customCSS provided:', !!customCSS)
    if (customCSS) {
      console.log('EmbedCode: customCSS received:', customCSS.substring(0, 100) + '...')
      console.log('EmbedCode: CSS length:', customCSS.length)
      console.log('EmbedCode: Full CSS:', customCSS)
    } else {
      console.log('EmbedCode: No customCSS provided')
    }
    console.log('customButtonText:', customButtonText)
  }, [customCSS, customButtonText])

  // Inject CSS into document head for maximum compatibility and force re-apply
  useEffect(() => {
    const styleId = 'keyrex-custom-css-preview'
    
    if (customCSS) {
      console.log('=== EmbedCode: customCSS changed, injecting into document head ===')
      console.log('CSS length:', customCSS.length)
      console.log('CSS (first 200 chars):', customCSS.substring(0, 200))
      
      // Remove existing style tag if it exists
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
        console.log('Removed existing style tag')
      }
      
      // Create and inject new style tag into document head
      // Ensure CSS targets the preview button - add #keyrex-button-preview if only #keyrex-button is present
      let previewCSS = customCSS
      // If CSS only targets #keyrex-button, also add #keyrex-button-preview
      if (previewCSS.includes('#keyrex-button') && !previewCSS.includes('#keyrex-button-preview')) {
        // Replace #keyrex-button with both selectors for preview
        previewCSS = previewCSS.replace(/#keyrex-button(?![-a-z])/g, '#keyrex-button, #keyrex-button-preview')
      }
      
      const styleEl = document.createElement('style')
      styleEl.id = styleId
      styleEl.textContent = previewCSS
      document.head.appendChild(styleEl)
      console.log('✓ Injected CSS into document head')
      console.log('CSS targets preview button:', previewCSS.includes('#keyrex-button-preview'))
      
      // Force apply to preview button immediately if it exists
      const previewButton = document.getElementById('keyrex-button-preview')
      if (previewButton) {
        console.log('✓ Preview button found, CSS should apply immediately')
        // Force a reflow to ensure styles apply
        void previewButton.offsetHeight
      }
      
      // Also set up a MutationObserver to watch for button creation/recreation
      const observer = new MutationObserver((mutations) => {
        // Check both button IDs (preview and actual)
        const button = document.getElementById('keyrex-button') || document.getElementById('keyrex-button-preview')
        if (button) {
          // Button exists, verify styles are applied
          const computedStyle = window.getComputedStyle(button)
          // Check if styles are applied (not transparent background or default border-radius)
          const bgColor = computedStyle.backgroundColor
          const isTransparent = bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent'
          const hasDefaultBorderRadius = computedStyle.borderRadius === '0px'
          
          if (isTransparent || hasDefaultBorderRadius) {
            // Styles not applied, ensure style tag exists
            let existingStyle = document.getElementById(styleId)
            if (!existingStyle) {
              console.log('MutationObserver: Style tag missing, re-injecting...')
              // Ensure CSS targets preview button
              let previewCSS = customCSS
              if (previewCSS.includes('#keyrex-button') && !previewCSS.includes('#keyrex-button-preview')) {
                previewCSS = previewCSS.replace(/#keyrex-button(?![-a-z])/g, '#keyrex-button, #keyrex-button-preview')
              }
              const newStyleEl = document.createElement('style')
              newStyleEl.id = styleId
              newStyleEl.textContent = previewCSS
              document.head.appendChild(newStyleEl)
            }
          }
        }
      })
      
      // Observe the document body for button additions
      observer.observe(document.body, {
        childList: true,
        subtree: true
      })
      
      // Store observer for cleanup
      ;(window as any).__keyrexStyleObserver = observer
      
      // Verify button and styles after a short delay - use multiple attempts to catch button after React re-render
      const verifyStyles = (attempt = 1) => {
        // Check both button IDs (preview and actual)
        const button = document.getElementById('keyrex-button') || document.getElementById('keyrex-button-preview')
        if (button) {
          console.log(`✓ EmbedCode: Button found (attempt ${attempt})`)
          const computedStyle = window.getComputedStyle(button)
          console.log('EmbedCode: Button computed background-color:', computedStyle.backgroundColor)
          console.log('EmbedCode: Button computed color:', computedStyle.color)
          console.log('EmbedCode: Button computed border-radius:', computedStyle.borderRadius)
          console.log('EmbedCode: Button computed padding:', computedStyle.padding)
          
          // Verify style tag exists
          const injectedStyle = document.getElementById(styleId)
          if (injectedStyle) {
            console.log('✓ EmbedCode: Style tag verified in document head')
            console.log('Style tag content length:', injectedStyle.textContent?.length)
            console.log('Style tag content (first 200 chars):', injectedStyle.textContent?.substring(0, 200))
            
            // Force re-injection if styles aren't applied (button might have been recreated)
            if (computedStyle.backgroundColor === 'rgba(0, 0, 0, 0)' || computedStyle.borderRadius === '0px') {
              console.warn('⚠️ EmbedCode: Styles not applied, button may have been recreated. Re-injecting CSS...')
              // Remove and re-add style tag
              injectedStyle.remove()
              // Ensure CSS targets preview button
              let previewCSS = customCSS
              if (previewCSS.includes('#keyrex-button') && !previewCSS.includes('#keyrex-button-preview')) {
                previewCSS = previewCSS.replace(/#keyrex-button(?![-a-z])/g, '#keyrex-button, #keyrex-button-preview')
              }
              const newStyleEl = document.createElement('style')
              newStyleEl.id = styleId
              newStyleEl.textContent = previewCSS
              document.head.appendChild(newStyleEl)
              console.log('✓ Re-injected CSS after button recreation')
              
              // Check again after a brief delay
              setTimeout(() => {
                const newComputedStyle = window.getComputedStyle(button)
                console.log('EmbedCode: After re-injection - background-color:', newComputedStyle.backgroundColor)
                console.log('EmbedCode: After re-injection - border-radius:', newComputedStyle.borderRadius)
              }, 100)
            }
          } else {
            console.error('✗ EmbedCode: Style tag NOT found in document head! Re-injecting...')
            // Re-inject if missing
            // Ensure CSS targets preview button
            let previewCSS = customCSS
            if (previewCSS.includes('#keyrex-button') && !previewCSS.includes('#keyrex-button-preview')) {
              previewCSS = previewCSS.replace(/#keyrex-button(?![-a-z])/g, '#keyrex-button, #keyrex-button-preview')
            }
            const newStyleEl = document.createElement('style')
            newStyleEl.id = styleId
            newStyleEl.textContent = previewCSS
            document.head.appendChild(newStyleEl)
          }
          
          // Also check all style tags for #keyrex-button
          const allStyleTags = Array.from(document.querySelectorAll('style'))
          const ourStyle = allStyleTags.find(tag => tag.textContent?.includes('#keyrex-button'))
          if (ourStyle) {
            console.log('✓ EmbedCode: Found style tag with #keyrex-button selector')
          } else {
            console.error('✗ EmbedCode: No style tag found with #keyrex-button selector!')
            console.log('All style tags:', allStyleTags.map(t => ({
              id: t.id,
              content: t.textContent?.substring(0, 100)
            })))
          }
        } else if (attempt < 5) {
          // Retry if button not found (might be re-rendering)
          console.log(`EmbedCode: Button not found (attempt ${attempt}), retrying...`)
          setTimeout(() => verifyStyles(attempt + 1), 200)
        } else {
          console.warn('✗ EmbedCode: Button not found after multiple attempts')
        }
      }
      
      // Start verification after initial delay
      const timer = setTimeout(() => verifyStyles(), 300)
      
      return () => {
        clearTimeout(timer)
        // Clean up: remove style tag when component unmounts or CSS changes
        const styleToRemove = document.getElementById(styleId)
        if (styleToRemove) {
          styleToRemove.remove()
          console.log('Cleaned up style tag')
        }
        // Clean up MutationObserver
        if ((window as any).__keyrexStyleObserver) {
          (window as any).__keyrexStyleObserver.disconnect()
          delete (window as any).__keyrexStyleObserver
          console.log('Cleaned up MutationObserver')
        }
      }
    } else {
      // Remove style tag if customCSS is removed
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
        console.log('Removed custom CSS style tag (no customCSS)')
      }
    }
  }, [customCSS])
  
  // Force re-apply CSS when component becomes visible (tab switch) or customCSS changes
  useEffect(() => {
    if (customCSS) {
      // Use a longer delay to ensure DOM is fully ready after tab switch
      const timer = setTimeout(() => {
        const styleId = 'keyrex-custom-css-preview'
        const previewButton = document.getElementById('keyrex-button-preview')
        const existingStyle = document.getElementById(styleId)
        
        if (previewButton) {
          // Ensure CSS targets preview button
          let previewCSS = customCSS
          if (previewCSS.includes('#keyrex-button') && !previewCSS.includes('#keyrex-button-preview')) {
            previewCSS = previewCSS.replace(/#keyrex-button(?![-a-z])/g, '#keyrex-button, #keyrex-button-preview')
          }
          
          // Remove and re-inject to ensure it's fresh
          if (existingStyle) {
            existingStyle.remove()
          }
          
          const newStyle = document.createElement('style')
          newStyle.id = styleId
          newStyle.textContent = previewCSS
          document.head.appendChild(newStyle)
          
          // Force a reflow to ensure styles apply
          void previewButton.offsetHeight
          console.log('✓ Force re-applied CSS to preview button after tab switch/CSS change')
        }
      }, 200)
      
      return () => clearTimeout(timer)
    }
  }, [customCSS])

  // Fetch embed configuration from server for live preview
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
        const response = await fetch(`${baseUrl}/api/embed/config?siteId=${siteId}`, {
          cache: 'no-cache',
        })
        if (response.ok) {
          const config = await response.json()
          setEmbedConfig(config)
        }
      } catch (error) {
        console.error('Failed to load embed config:', error)
      } finally {
        setLoadingConfig(false)
      }
    }
    loadConfig()
    
    // Refresh config periodically to show updates in real-time
    const interval = setInterval(loadConfig, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [siteId])

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const embedUrl = `${baseUrl}/embed?siteId=${siteId}`

  // Updated embed code - now fetches config dynamically from server
  const code = `<!-- Key-Rex Integration Code -->
<script src="${embedUrl}"></script>
<script>KeyRex.init();</script>`

  const copyToClipboard = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code)
        setCopied(true)
        toast.showSuccess('✓ Integration code copied to clipboard!')
        setTimeout(() => setCopied(false), 2000)
      } else {
        // Fallback for older browsers or non-HTTPS contexts
        throw new Error('Clipboard API not available')
      }
    } catch (error) {
      // Fallback: Select text in a textarea and show instructions
      console.warn('Clipboard copy failed, using fallback method:', error)
      
      // Create a temporary textarea element
      const textarea = document.createElement('textarea')
      textarea.value = code
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '0'
      textarea.setAttribute('readonly', '')
      document.body.appendChild(textarea)
      
      // Select and copy
      textarea.select()
      textarea.setSelectionRange(0, code.length)
      
      try {
        // Try execCommand as fallback
        const successful = document.execCommand('copy')
        document.body.removeChild(textarea)
        
        if (successful) {
          setCopied(true)
          toast.showSuccess('✓ Integration code copied to clipboard!')
          setTimeout(() => setCopied(false), 2000)
        } else {
          // If execCommand also fails, show manual copy instructions
          showManualCopyInstructions()
        }
      } catch (execError) {
        document.body.removeChild(textarea)
        // Show manual copy instructions
        showManualCopyInstructions()
      }
    }
  }

  const showManualCopyInstructions = () => {
    toast.showWarning('Manual copy required - see instructions below', 5000)
    
    // Show manual copy instructions in the UI
    setCopied('manual')
    
    // Clear the manual copy indicator after 10 seconds
    setTimeout(() => {
      setCopied((current) => {
        // Only clear if it's still set to 'manual' (user hasn't clicked copy again)
        return current === 'manual' ? false : current
      })
    }, 10000)
  }

  // Preview button text - use config from server if available, otherwise fallback
  const previewButtonText = embedConfig?.buttonText || customButtonText || 'Sign in with Key-Rex'
  
  // Get featured wallets from config
  const featuredWallets = embedConfig?.featuredWallets || []

  return (
    <div className="space-y-4">
      {/* Instructions - Moved to top */}
      <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4">
        <h3 className="font-semibold text-white mb-3">How to Add Key-Rex to Your Website</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-white/80">
          <li>Copy the code below by clicking the "Copy Code" button</li>
          <li>Paste the code into your website's HTML, just before the closing <code className="bg-dark-900 px-1 rounded text-orange-400">&lt;/body&gt;</code> tag</li>
          <li>Add a container element where you want the login button to appear: <code className="bg-dark-900 px-1 rounded text-orange-400">&lt;div id="keyrex-container"&gt;&lt;/div&gt;</code></li>
          <li>Save your website and the Key-Rex login button will appear automatically</li>
        </ol>
        <p className="mt-3 text-sm text-yellow-300">
          Important: the identifier Key-Rex returns is not a secret. Your server must verify the signed login token before starting a session.{' '}
          <a href="/docs" className="underline">See the integration guide</a>
        </p>
      </div>

      {/* Your Integration Code - Moved to second position */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Your Integration Code:
        </label>
        <div className="bg-dark-900 text-white p-4 rounded-lg font-mono text-sm border border-dark-700">
          <pre 
            className="whitespace-pre-wrap select-all cursor-text" 
            onClick={(e) => {
              // Select all text when clicking on the code
              const range = document.createRange()
              range.selectNodeContents(e.currentTarget)
              const selection = window.getSelection()
              selection?.removeAllRanges()
              selection?.addRange(range)
            }}
          >
            {code}
          </pre>
        </div>
        {copied === 'manual' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-2">
            <p className="text-sm text-yellow-200 font-medium mb-2">
              ⚠️ Manual Copy Required
            </p>
            <p className="text-xs text-yellow-200">
              Click inside the code box above, then press <kbd className="bg-yellow-600/30 px-1.5 py-0.5 rounded text-xs">Ctrl+A</kbd> (or <kbd className="bg-yellow-600/30 px-1.5 py-0.5 rounded text-xs">Cmd+A</kbd> on Mac) to select all, then <kbd className="bg-yellow-600/30 px-1.5 py-0.5 rounded text-xs">Ctrl+C</kbd> (or <kbd className="bg-yellow-600/30 px-1.5 py-0.5 rounded text-xs">Cmd+C</kbd>) to copy.
            </p>
          </div>
        )}
        <button
          onClick={copyToClipboard}
          className="w-full mt-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-3 px-4 rounded-lg transition-all transform hover:scale-105 shadow-lg border border-orange-400/30"
        >
          {copied === true ? '✓ Copied to Clipboard!' : copied === 'manual' ? '⚠️ Manual Copy Required' : '📋 Copy Code'}
        </button>
        {copied === true && (
          <div className="bg-green-500/10 border border-green-500/30 p-3 mt-3 rounded-lg">
            <p className="text-sm text-green-400 font-medium text-center">
              ✓ Code copied! Now paste it into your website's HTML before the &lt;/body&gt; tag.
            </p>
          </div>
        )}
      </div>

      {/* Live Preview - Moved to third position */}
      <div className="bg-dark-800/70 border border-orange-500/20 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-white mb-2">Live Preview</h3>
        <p className="text-sm text-white/80">
          This is exactly how your button and featured wallets will appear on your website:
        </p>
        {loadingConfig ? (
          <div className="bg-dark-900 border border-dark-600 rounded-lg p-6 flex items-center justify-center min-h-[150px]">
            <p className="text-white/400">Loading preview...</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <KeyRexButtonPreview 
              siteId={siteId} 
              customCSS={customCSS}
              showInCard={true}
              className="max-w-[420px] w-full shadow-lg border-orange-500"
            />
          </div>
        )}
        <p className="text-xs text-white/80">
          Preview updates automatically when featured wallets are added or changed.
        </p>
      </div>

      <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded-lg">
        <p className="text-sm text-orange-400 font-medium">
          ✓ Button and featured wallets are fetched from server — no code updates needed when wallets are added
        </p>
      </div>
    </div>
  )
}

