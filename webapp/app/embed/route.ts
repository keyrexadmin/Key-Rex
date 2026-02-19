// @ts-nocheck - This file generates JavaScript code as a string, so TypeScript parsing of template literals is not applicable
import { NextRequest, NextResponse } from 'next/server'
import { getEmbedButtonCSS, HOVER_TRANSFORM, HOVER_BACKGROUND, HOVER_BOX_SHADOW, NORMAL_TRANSFORM, NORMAL_BACKGROUND, NORMAL_BOX_SHADOW } from '@/lib/button-styles'
import { getUserBySiteId } from '@/lib/storage'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const siteId = searchParams.get('siteId')

  if (!siteId) {
    return NextResponse.json({ error: 'Missing siteId' }, { status: 400 })
  }

  // Check if siteId belongs to a valid user
  const user = await getUserBySiteId(siteId)

  // Debug logging
  console.log('=== Embed script requested ===')
  console.log('SiteId:', siteId)
  console.log('User found:', !!user)
  if (user) {
    console.log('User xpub:', user.xpub.substring(0, 20) + '...')
    console.log('User siteId:', user.siteId)
  } else {
    // Log all users to help debug
    const { getAllUsers } = await import('@/lib/storage')
    const allUsers = await getAllUsers()
    console.log('Total users in storage:', allUsers.length)
    console.log('All siteIds in storage:', allUsers.map(u => u.siteId))
  }

  if (!user) {
    // Return JavaScript error instead of JSON so browser can load it
    const errorScript = `
      console.error('Key-Rex: Invalid siteId "${siteId}". Please verify your siteId is correct.');
      console.error('Key-Rex: Make sure you are logged into the dashboard and using the correct siteId.');
      console.error('Key-Rex: If you just restarted the server, visit the dashboard first to recreate your user record.');
      if (window.KeyRex && window.KeyRex.onError) {
        window.KeyRex.onError(new Error('Invalid siteId. Please check your Key-Rex dashboard for the correct siteId.'));
      }
    `
    return new NextResponse(errorScript, {
      status: 200, // Return 200 so script loads, but show error in console
      headers: {
        'Content-Type': 'application/javascript',
      },
    })
  }

  // All users are free users - no subscription check needed

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
  const configUrl = `${baseUrl}/api/embed/config?siteId=${siteId}`

  // Generate embed script that fetches config from server
  const script = `
(function() {
  console.log('Key-Rex: Embed script starting to load...');
  const siteId = '${siteId}';
  const baseUrl = '${baseUrl}';
  console.log('Key-Rex: siteId =', siteId, 'baseUrl =', baseUrl);
  const configUrl = '${configUrl}';
  
  let config = null;
  let configLoaded = false;
  
  // Fetch configuration from server
  async function loadConfig() {
    if (configLoaded) return config;
    
    try {
      const response = await fetch(configUrl, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.integrationEnabled === false) {
            console.error('Key-Rex: Integration is disabled');
            return { integrationEnabled: false, error: 'Integration is disabled' };
          }
        }
        console.error('Key-Rex: Failed to load configuration');
        return null;
      }
      
      config = await response.json();
      configLoaded = true;
      return config;
    } catch (error) {
      console.error('Key-Rex: Error loading configuration:', error);
      return null;
    }
  }
  
  // Mobile device detection
  function isMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    const isSmallScreen = window.innerWidth < 768;
    return isMobileUA || isSmallScreen;
  }
  
  const handleLogin = async () => {
    try {
      // Ensure config is loaded
      await loadConfig();
      
      // Check if integration is disabled
      if (config && config.integrationEnabled === false) {
        const errorMsg = 'Key-Rex authentication is currently disabled. Please contact the website owner.';
        alert(errorMsg);
        console.error('Key-Rex: ' + errorMsg);
        if (window.KeyRex && window.KeyRex.onError) {
          window.KeyRex.onError(new Error(errorMsg));
        }
        return;
      }
      
      // Get bech32-encoded LNURL from server
      const lnurlRes = await fetch(baseUrl + '/api/auth/lnurl');
      const { k1: challenge, lnurl: lnurlBech32 } = await lnurlRes.json();

      console.log('Key-Rex: Checking for WebLN. window.webln exists:', !!window.webln);
      console.log('Key-Rex: window.webln type:', typeof window.webln);
      console.log('Key-Rex: window.webln keys:', window.webln ? Object.keys(window.webln) : 'N/A');
      
      // Check for WebLN with retry (sometimes extensions inject it late)
      let webln = window.webln;
      if (!webln) {
        // Wait a bit and check again (extensions might inject late)
        console.log('Key-Rex: WebLN not found immediately, waiting 200ms and retrying...');
        await new Promise(resolve => setTimeout(resolve, 200));
        webln = window.webln;
        console.log('Key-Rex: WebLN after wait:', !!webln);
      }
      
      if (webln) {
        console.log('Key-Rex: WebLN detected, attempting to enable...');
        try {
          await webln.enable();
          console.log('Key-Rex: WebLN enabled successfully');
          const result = await webln.lnurl(lnurlBech32);
          console.log('Key-Rex: WebLN lnurl() completed, result:', result);

          // Check if result contains sig/key (some wallets return them directly)
          if (result && result.sig && result.key) {
            console.log('Key-Rex: WebLN returned sig/key directly, verifying...');
            // Verify login and record usage
            const verifyRes = await fetch(baseUrl + '/api/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                k1: challenge,
                sig: result.sig,
                key: result.key,
                siteId: siteId,
              }),
            });

            if (verifyRes.ok) {
              const data = await verifyRes.json();
              if (window.KeyRex && window.KeyRex.onSuccess) {
                window.KeyRex.onSuccess(data.xpub);
              }
              return;
            } else {
              const errorData = await verifyRes.json().catch(() => ({}));
              const errorMsg = errorData.error || 'Authentication failed';
              if (window.KeyRex && window.KeyRex.onError) {
                window.KeyRex.onError(new Error(errorMsg));
              }
            }
          } else {
            // Wallet called callback directly (standard LNURL-auth flow)
            // Poll the callback endpoint to retrieve the xpub
            console.log('Key-Rex: WebLN completed, wallet called callback. Polling for xpub...');
            
            // Wait a moment for callback to complete, then poll
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            let retries = 10;
            while (retries > 0) {
              try {
                const callbackUrl = baseUrl + '/api/auth/callback?k1=' + encodeURIComponent(challenge);
                const callbackRes = await fetch(callbackUrl, {
                  credentials: 'include',
                });
                
                if (callbackRes.ok) {
                  const callbackData = await callbackRes.json();
                  if (callbackData.xpub) {
                    console.log('Key-Rex: Authentication successful, xpub retrieved');
                    if (window.KeyRex && window.KeyRex.onSuccess) {
                      window.KeyRex.onSuccess(callbackData.xpub);
                    }
                    return;
                  }
                }
              } catch (err) {
                console.log('Key-Rex: Polling attempt failed, retrying...', err);
              }
              
              await new Promise(resolve => setTimeout(resolve, 500));
              retries--;
            }
            
            // If polling failed, show error
            const errorMsg = 'Authentication timed out. Please try again.';
            console.error('Key-Rex: ' + errorMsg);
            if (window.KeyRex && window.KeyRex.onError) {
              window.KeyRex.onError(new Error(errorMsg));
            }
          }
        } catch (weblnError) {
          console.error('Key-Rex: WebLN error:', weblnError);
          if (window.KeyRex && window.KeyRex.onError) {
            window.KeyRex.onError(weblnError);
          }
        }
      } else {
        console.log('Key-Rex: WebLN not detected, falling back to QR code');
      }

      // Fallback to QR code - use full redirect on mobile, popup on desktop
      // Store return URL so QR page knows where to redirect back
      const returnUrl = encodeURIComponent(window.location.href);
      const qrUrl = baseUrl + '/embed/qr?siteId=' + siteId + '&k1=' + challenge + '&returnUrl=' + returnUrl;
      
      // Mobile: Use full redirect (more reliable, better UX)
      if (isMobileDevice()) {
        console.log('Key-Rex: Mobile device detected, using full redirect');
        // SECURITY: Store k1 in httpOnly cookie via server-side API (prevents XSS)
        try {
          const storeRes = await fetch(baseUrl + '/api/auth/store-k1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ k1: challenge, returnUrl: returnUrl }),
          });
          if (!storeRes.ok) {
            console.warn('Key-Rex: Failed to store k1 via API, proceeding anyway');
          }
        } catch (e) {
          console.error('Key-Rex: Failed to store k1 via API:', e);
          // Continue anyway - QR page can work without cookie
        }
        // Add redirect flag to URL so QR page knows it's a redirect
        window.location.href = qrUrl + '&redirect=true';
        return;
      }
      
      // Desktop: Use popup (better UX, maintains context)
      // Calculate popup dimensions (centered on screen) - increased for better QR code visibility
      const width = 600;
      const height = 800;
      const left = (screen.width / 2) - (width / 2);
      const top = (screen.height / 2) - (height / 2);
      
      // Open popup window
      const popup = window.open(
        qrUrl,
        'Key-Rex Authentication',
        'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',resizable=yes,scrollbars=yes'
      );
      
      if (!popup) {
        // Popup blocked - fallback to full redirect
        console.warn('Key-Rex: Popup blocked, falling back to full redirect');
        // SECURITY: Store k1 in httpOnly cookie via server-side API (prevents XSS)
        try {
          const storeRes = await fetch(baseUrl + '/api/auth/store-k1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ k1: challenge, returnUrl: returnUrl }),
          });
          if (!storeRes.ok) {
            console.warn('Key-Rex: Failed to store k1 via API, proceeding anyway');
          }
        } catch (e) {
          console.error('Key-Rex: Failed to store k1 via API:', e);
          // Continue anyway - QR page can work without cookie
        }
        window.location.href = qrUrl + '&redirect=true';
        return;
      }
      
      // Focus the popup
      popup.focus();
      
      // Listen for messages from popup
      const messageListener = function(event) {
        // SECURITY: Verify origin matches baseUrl to prevent postMessage injection attacks
        if (event.origin !== baseUrl) {
          console.error('Key-Rex: Rejected postMessage from invalid origin:', event.origin, 'expected:', baseUrl);
          return;
        }
        
        if (event.data && event.data.type === 'keyrex-auth-success' && event.data.siteId === siteId) {
          const xpub = event.data.xpub;
          if (xpub && window.KeyRex && window.KeyRex.onSuccess) {
            console.log('Key-Rex: Received xpub via postMessage from popup, calling onSuccess');
            
            // Show success micro-animation on logo button
            const logoButton = document.getElementById('keyrex-button');
            if (logoButton) {
              logoButton.style.animation = 'keyrex-success-pulse 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
              setTimeout(function() {
                logoButton.style.animation = '';
              }, 600);
            }
            
            // Show subtle success notification on parent window
            showSuccessNotification();
            
            window.KeyRex.onSuccess(xpub);
          }
          
          // Close popup if still open
          if (popup && !popup.closed) {
            popup.close();
          }
          
          // Remove message listener
          window.removeEventListener('message', messageListener);
        } else if (event.data && event.data.type === 'keyrex-auth-error') {
          // Handle error from popup
          if (window.KeyRex && window.KeyRex.onError) {
            window.KeyRex.onError(new Error(event.data.error || 'Authentication failed'));
          }
          
          // Close popup if still open
          if (popup && !popup.closed) {
            popup.close();
          }
          
          // Remove message listener
          window.removeEventListener('message', messageListener);
        } else if (event.data && event.data.type === 'keyrex-popup-closed') {
          // Popup was closed manually by user
          window.removeEventListener('message', messageListener);
        }
      };
      
      window.addEventListener('message', messageListener);
      
      // Check if popup is closed manually (polling fallback)
      const checkPopupClosed = setInterval(function() {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', messageListener);
          
          // If popup was closed and we haven't received success, check for stored xpub
          // (in case user authenticated but popup closed before message was sent)
          setTimeout(function() {
            checkForStoredXpub();
          }, 1000);
        }
      }, 1000);
      
      // Clean up interval after 5 minutes (timeout)
      setTimeout(function() {
        clearInterval(checkPopupClosed);
        window.removeEventListener('message', messageListener);
      }, 300000); // 5 minutes
    } catch (error) {
      console.error('Login error:', error);
      if (window.KeyRex && window.KeyRex.onError) {
        window.KeyRex.onError(error);
      }
    }
  };
  
    // Load Bebas Neue font
    if (!document.getElementById('bebas-neue-font')) {
      const fontLink = document.createElement('link');
      fontLink.id = 'bebas-neue-font';
      fontLink.rel = 'preconnect';
      fontLink.href = 'https://fonts.googleapis.com';
      document.head.appendChild(fontLink);
      
      const fontLink2 = document.createElement('link');
      fontLink2.rel = 'preconnect';
      fontLink2.href = 'https://fonts.gstatic.com';
      fontLink2.crossOrigin = 'anonymous';
      document.head.appendChild(fontLink2);
      
      const fontStyle = document.createElement('link');
      fontStyle.rel = 'stylesheet';
      fontStyle.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap';
      document.head.appendChild(fontStyle);
    }
    
    // Render button and featured wallets
    function renderButtonAndWallets(config) {
      console.log('Key-Rex: renderButtonAndWallets called with config:', config);
      const container = document.getElementById('keyrex-container') || document.body;
      console.log('Key-Rex: Container found:', container);
      
      // Remove existing Key-Rex elements (including skeleton)
      const existing = container.querySelectorAll('[data-keyrex], [data-keyrex="skeleton"]');
      console.log('Key-Rex: Removing', existing.length, 'existing elements');
      existing.forEach(el => el.remove());
      
      // Show loading skeleton while config loads
      if (!config || config.integrationEnabled === undefined) {
        const skeleton = document.createElement('div');
        skeleton.setAttribute('data-keyrex', 'skeleton');
        skeleton.setAttribute('data-keyrex-container', '');
        skeleton.style.cssText = 'max-width: 600px; margin: 0 auto; padding: 1.5rem 2rem; background: white; border-radius: 1.25rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border: 1px solid rgba(249, 115, 22, 0.2);';
        
        const skeletonContent = document.createElement('div');
        skeletonContent.style.cssText = 'display: flex; flex-direction: row; align-items: center; gap: 1.5rem;';
        
        // Skeleton logo button
        const skeletonButton = document.createElement('div');
        skeletonButton.style.cssText = 'width: 5rem; height: 5rem; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; border-radius: 0.75rem; animation: keyrex-skeleton 1.5s ease-in-out infinite;';
        skeletonContent.appendChild(skeletonButton);
        
        // Skeleton wallets
        const skeletonWallets = document.createElement('div');
        skeletonWallets.style.cssText = 'display: flex; gap: 1rem; flex: 1;';
        for (let i = 0; i < 3; i++) {
          const skeletonWallet = document.createElement('div');
          skeletonWallet.style.cssText = 'width: 3rem; height: 3rem; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; border-radius: 50%; animation: keyrex-skeleton 1.5s ease-in-out infinite; animation-delay: ' + (i * 0.1) + 's;';
          skeletonWallets.appendChild(skeletonWallet);
        }
        skeletonContent.appendChild(skeletonWallets);
        skeleton.appendChild(skeletonContent);
        container.appendChild(skeleton);
        return;
      }
    
    // Check if integration is disabled
    if (config && config.integrationEnabled === false) {
      const disabledMessage = document.createElement('div');
      disabledMessage.setAttribute('data-keyrex', 'disabled-message');
      disabledMessage.style.cssText = 'background: #fef3c7; border: 2px solid #f59e0b; border-radius: 0.75rem; padding: 1rem; margin: 0 auto; max-width: 420px; font-family: system-ui, -apple-system, sans-serif; text-align: center;';
      
      // SECURITY: Use createElement instead of innerHTML to prevent XSS
      const p1 = document.createElement('p');
      p1.style.cssText = 'color: #92400e; font-weight: 600; margin: 0;';
      p1.textContent = 'Key-Rex authentication is currently disabled';
      
      const p2 = document.createElement('p');
      p2.style.cssText = 'color: #78350f; font-size: 0.875rem; margin: 0.5rem 0 0 0;';
      p2.textContent = 'Please contact the website owner to enable authentication.';
      
      disabledMessage.appendChild(p1);
      disabledMessage.appendChild(p2);
      container.appendChild(disabledMessage);
      return;
    }
    
    // Add isolated CSS styles with scoped selectors to prevent conflicts.
    // IMPORTANT: We build this as a plain string so linters and TypeScript don't try to parse the CSS.
    if (!document.getElementById('keyrex-isolated-styles')) {
      const styleEl = document.createElement('style')
      styleEl.id = 'keyrex-isolated-styles'

      const isolatedStyles = [
        '/* Key-Rex Isolated Styles - Scoped to prevent conflicts */',
        '[data-keyrex-container] * { box-sizing: border-box; }',
        '[data-keyrex-container] { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }',
        '@keyframes keyrex-fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }',
        '@keyframes keyrex-skeleton { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }',
        '@keyframes keyrex-fade-in-stagger { from { opacity: 0; transform: translateY(8px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }',
        '@keyframes keyrex-success-pulse { 0%, 100% { transform: scale(1); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); } 50% { transform: scale(1.08); box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4), 0 4px 12px rgba(16, 185, 129, 0.3); } }',
        '@keyframes keyrex-glow { 0%, 100% { box-shadow: 0 0 0 rgba(249, 115, 22, 0); } 50% { box-shadow: 0 0 20px rgba(249, 115, 22, 0.3), 0 0 40px rgba(249, 115, 22, 0.15); } }',
        '@keyframes keyrex-logo-glow { 0%, 100% { box-shadow: 0 8px 16px rgba(249, 115, 22, 0.2), 0 2px 4px rgba(249, 115, 22, 0.1), 0 0 0 rgba(249, 115, 22, 0); } 50% { box-shadow: 0 8px 16px rgba(249, 115, 22, 0.3), 0 2px 4px rgba(249, 115, 22, 0.15), 0 0 30px rgba(249, 115, 22, 0.4), 0 0 60px rgba(249, 115, 22, 0.2); } }',
        '@media (prefers-reduced-motion: reduce) { [data-keyrex="card"] { animation: none !important; opacity: 1 !important; } [data-keyrex-skeleton] { animation: none !important; } [data-keyrex="wallet"] { animation: none !important; opacity: 1 !important; transform: none !important; } }'
      ].join(' ')

      styleEl.textContent = isolatedStyles
      document.head.appendChild(styleEl)
    }
    
    // Create premium card wrapper with enhanced styling and fade-in animation
    const card = document.createElement('div');
    card.setAttribute('data-keyrex', 'card');
    card.setAttribute('data-keyrex-container', ''); // For CSS isolation
    
    // Detect dark mode preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDarkMode = prefersDark || document.documentElement.classList.contains('dark');
    
    // Base styles with dark mode support - COMPACT MODE
    const cardBg = isDarkMode ? 'rgb(30, 41, 59)' : 'white';
    const cardBorder = isDarkMode ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)';
    const cardShadow = isDarkMode 
      ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(249, 115, 22, 0.2)'
      : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(249, 115, 22, 0.1)';
    
    // COMPACT: Reduced padding and overall width so card closely hugs its content.
    // Use display: inline-block so the card width is driven purely by its contents (up to max-width).
    card.style.cssText = 'background: ' + cardBg + '; border-radius: 1.25rem; box-shadow: ' + cardShadow + '; border: 1px solid ' + cardBorder + '; max-width: 440px; margin: 0 auto; padding: 0.875rem 1.25rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; opacity: 0; animation: keyrex-fade-in 0.4s ease-out forwards; display: inline-block;';
    
    // Create inner wrapper for content (horizontal layout with responsive support)
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-keyrex', 'wrapper');
    wrapper.style.cssText = 'display: flex; flex-direction: row; align-items: center; gap: 1.5rem;';
    
    // Add responsive media query for mobile - COMPACT MODE
    if (!document.getElementById('keyrex-responsive-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'keyrex-responsive-styles';
      // COMPACT: Reduced mobile logo size from 4rem to 3rem
      styleEl.textContent = '@media (max-width: 640px) { [data-keyrex="wrapper"] { flex-direction: column; gap: 0.75rem; } [data-keyrex="button"] img { max-height: 3rem !important; } }';
      document.head.appendChild(styleEl);
    }
    
    // Create left side container with logo button - COMPACT MODE
    const leftContainer = document.createElement('div');
    // COMPACT: Reduced gap from 0.5rem to 0.25rem
    leftContainer.style.cssText = 'display: flex; flex-direction: column; flex-shrink: 0; align-items: center; gap: 0.25rem;';
    
    // Key-Rex logo image as the button itself - transparent background with orange glow on hover
    const logoButton = document.createElement('button');
    logoButton.id = 'keyrex-button';
    logoButton.setAttribute('data-keyrex', 'button');
    logoButton.setAttribute('aria-label', 'Sign in with Key-Rex');
    // Very discrete native tooltip for users who don't see their wallet
    logoButton.title = "Don't see your wallet? Click Sign in with Key-Rex";
    logoButton.onclick = handleLogin;
    logoButton.style.cssText = 'background: transparent; border: none; padding: 0.5rem; border-radius: 0.75rem; cursor: pointer; transition: all 0.3s ease; outline: none; box-shadow: none; min-width: 12rem; overflow: hidden; display: flex; align-items: center; justify-content: center;';

    const logoImg = document.createElement('img');
    logoImg.src = baseUrl + '/images/sign-in-with-paw.png';
    logoImg.alt = 'Sign in with Key-Rex';
    logoImg.style.cssText = 'height: auto; width: auto; max-height: 5rem; object-fit: contain; display: block;';
    logoImg.onload = function() {
      console.log('Key-Rex: Main logo loaded successfully:', logoImg.src);
    };
    logoImg.onerror = function() {
      console.error('Key-Rex: Main logo failed to load:', logoImg.src);
    };
    logoButton.appendChild(logoImg);

    // Hover: orange outline glow
    logoButton.onmouseover = function() {
      this.style.transform = 'scale(1.03)';
      this.style.boxShadow = '0 0 12px rgba(249, 115, 22, 0.5), 0 0 24px rgba(249, 115, 22, 0.25)';
      this.style.outline = '2px solid rgba(249, 115, 22, 0.6)';
    };
    logoButton.onmouseout = function() {
      this.style.transform = 'scale(1)';
      this.style.boxShadow = 'none';
      this.style.outline = 'none';
    };
    // Active (click): brighter glow
    logoButton.onmousedown = function() {
      this.style.transform = 'scale(0.98)';
      this.style.boxShadow = '0 0 16px rgba(249, 115, 22, 0.7), 0 0 32px rgba(249, 115, 22, 0.4)';
      this.style.outline = '2px solid rgba(249, 115, 22, 0.8)';
    };
    logoButton.onmouseup = function() {
      this.style.transform = 'scale(1.03)';
      this.style.boxShadow = '0 0 12px rgba(249, 115, 22, 0.5), 0 0 24px rgba(249, 115, 22, 0.25)';
      this.style.outline = '2px solid rgba(249, 115, 22, 0.6)';
    };

    // Focus state for accessibility (keyboard nav)
    logoButton.onfocus = function() {
      this.style.outline = '2px solid rgba(249, 115, 22, 0.5)';
      this.style.outlineOffset = '4px';
    };
    logoButton.onblur = function() {
      this.style.outline = 'none';
      this.style.outlineOffset = '0';
    };
    
    leftContainer.appendChild(logoButton);
    
    wrapper.appendChild(leftContainer);
    
    // Create right side container - Featured Wallets ad space (Coming Soon)
    const rightContainer = document.createElement('div');
    rightContainer.setAttribute('data-keyrex', 'right-container');
    rightContainer.style.cssText = 'display: flex; flex-direction: column; gap: 0.25rem; justify-content: center; align-items: center;';

    // Featured Wallets - Coming Soon placeholder
    const walletsLabel = document.createElement('div');
    walletsLabel.textContent = 'Featured Wallets';
    walletsLabel.style.cssText = 'font-size: 0.6875rem; font-weight: 500; color: ' + (isDarkMode ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)') + '; margin-bottom: 0.125rem; text-align: center; width: 100%;';
    rightContainer.appendChild(walletsLabel);

    const comingSoonText = document.createElement('div');
    const comingSoonColor = isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.35)';
    comingSoonText.textContent = 'Coming Soon';
    comingSoonText.style.cssText = 'font-size: 0.625rem; color: ' + comingSoonColor + '; font-style: italic; text-align: center; padding: 0.25rem 0;';
    rightContainer.appendChild(comingSoonText);
    wrapper.appendChild(rightContainer);
    card.appendChild(wrapper);
    
    // FOOTER REMOVED - COMPACT MODE
    // To restore footer, uncomment below:
    // const footer = document.createElement('div');
    // footer.setAttribute('data-keyrex', 'footer');
    // footer.textContent = 'Powered by Key-Rex - Open Source';
    // const footerColor = isDarkMode ? 'rgb(148, 163, 184)' : 'rgb(113, 128, 150)';
    // footer.style.cssText = 'font-size: 0.8125rem; color: ' + footerColor + '; text-align: center; margin: 1.5rem 0 0 0; padding-top: 1.5rem; border-top: 1px solid ' + (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)') + '; line-height: 1.4; letter-spacing: 0.01em; font-weight: 400;';
    // card.appendChild(footer);
    
    console.log('Key-Rex: Appending card to container. Card children:', card.children.length);
    container.appendChild(card);
    console.log('Key-Rex: Card appended. Container now has', container.querySelectorAll('[data-keyrex="card"]').length, 'card(s)');
  }

  // Show subtle success notification on parent window
  function showSuccessNotification() {
    // Create notification element
    const notification = document.createElement('div');
    notification.setAttribute('data-keyrex', 'success-notification');
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); z-index: 10000; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; display: flex; align-items: center; gap: 8px; animation: keyrex-slide-in 0.3s ease-out;';
    
    // SECURITY: Use createElement instead of innerHTML to prevent XSS
    const checkmark = document.createElement('span');
    checkmark.style.cssText = 'font-size: 18px;';
    checkmark.textContent = '✓';
    
    const message = document.createElement('span');
    message.textContent = 'Authentication successful';
    
    notification.appendChild(checkmark);
    notification.appendChild(message);
    
    // Add animation keyframes if not already added
    if (!document.getElementById('keyrex-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'keyrex-notification-styles';
      style.textContent = '@keyframes keyrex-slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes keyrex-slide-out { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }';
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(function() {
      notification.style.animation = 'keyrex-slide-out 0.3s ease-out';
      setTimeout(function() {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Check for xpub by checking URL params, cookies, or polling callback endpoint (in case user returned from QR page)
  function checkForStoredXpub() {
    try {
      // Method 1: Check URL params first (QR page redirect passes xpub in URL)
      const urlParams = new URLSearchParams(window.location.search);
      const xpubFromUrl = urlParams.get('xpub');
      
      if (xpubFromUrl) {
        console.log('Key-Rex: Found xpub in URL params (redirect from QR page), calling onSuccess');
        
        // Clean up URL params (remove xpub from URL without reload)
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('xpub');
        window.history.replaceState({}, '', newUrl.toString());
        
        // Call success callback
        if (window.KeyRex && window.KeyRex.onSuccess) {
          window.KeyRex.onSuccess(xpubFromUrl);
        }
        return true; // Found and processed
      }
      
      // Method 2: Poll callback endpoint to retrieve xpub (popup mode or fallback)
      // Note: Cookies are now httpOnly and cannot be read client-side
      // xpub is passed via URL parameter after QR authentication (handled in Method 1 above)
      const cookies = document.cookie.split(';');
      let storedK1 = null;
      for (let c of cookies) {
        const [name, value] = c.trim().split('=');
        if (name.trim() === 'keyrex_k1') {
          storedK1 = decodeURIComponent(value);
          break;
        }
      }
      if (storedK1) {
        fetch(baseUrl + '/api/auth/callback?k1=' + encodeURIComponent(storedK1) + '&siteId=' + siteId, {
          credentials: 'include'
        })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'OK' && data.xpub) {
            // Clean up cookie
            document.cookie = 'keyrex_k1=; path=/; max-age=0';
            
            // Call success callback
            if (window.KeyRex && window.KeyRex.onSuccess) {
              console.log('Key-Rex: Retrieved xpub after returning from QR page, calling onSuccess');
              window.KeyRex.onSuccess(data.xpub);
            }
          }
        })
        .catch(e => {
          console.error('Key-Rex: Error checking for stored xpub:', e);
        });
      }
      
      return false; // Don't block init, just check in background
    } catch (e) {
      console.error('Key-Rex: Error checking for stored xpub:', e);
      return false;
    }
  }

  // Listen for postMessage from QR page (if opened in popup)
  window.addEventListener('message', function(event) {
    // SECURITY: Verify origin matches baseUrl to prevent postMessage injection attacks
    if (event.origin !== baseUrl) {
      console.error('Key-Rex: Rejected postMessage from invalid origin:', event.origin, 'expected:', baseUrl);
      return;
    }
    
    // Verify it's from Key-Rex domain
    if (event.data && event.data.type === 'keyrex-auth-success' && event.data.siteId === siteId) {
      const xpub = event.data.xpub;
      if (xpub && window.KeyRex && window.KeyRex.onSuccess) {
        console.log('Key-Rex: Received xpub via postMessage, calling onSuccess');
        window.KeyRex.onSuccess(xpub);
      }
    }
  });

  window.KeyRex = {
    init: async function(options) {
      options = options || {};
      
      // Check for stored xpub first (in case user returned from QR page)
      // But only skip rendering if we actually found and processed an xpub
      const foundXpub = checkForStoredXpub();
      if (foundXpub) {
        console.log('Key-Rex: xpub found, onSuccess called, skipping button render');
        return; // xpub found and onSuccess called, don't render button again
      }
      
      // Load configuration from server
      const config = await loadConfig();
      console.log('Key-Rex: Config loaded:', config);
      
      // Even if config fails, try to render with a default config (better UX than nothing)
      if (!config) {
        console.warn('Key-Rex: Failed to load configuration, using default config');
        // Use default config so card still renders
        const defaultConfig = {
          siteId: siteId,
          buttonText: 'Sign in with Key-Rex',
          showBranding: true,
          featuredWallets: [],
          footerText: 'Powered by Key-Rex — open-source',
          integrationEnabled: true,
        };
        console.log('Key-Rex: Using default config, calling renderButtonAndWallets');
        renderButtonAndWallets(defaultConfig);
        if (window.KeyRex && window.KeyRex.onError) {
          window.KeyRex.onError(new Error('Failed to load configuration - using default'));
        }
        return;
      }
      
      // Render button and wallets
      console.log('Key-Rex: Calling renderButtonAndWallets with config:', config);
      renderButtonAndWallets(config);
      console.log('Key-Rex: renderButtonAndWallets completed');
    },
    onSuccess: null,
    onError: null
  };
  
  // Auto-init if DOM is ready
  function autoInit() {
    console.log('Key-Rex: autoInit called, document.readyState:', document.readyState);
    // Check for stored xpub first (in case user returned from QR page)
    const hasStoredXpub = checkForStoredXpub();
    console.log('Key-Rex: checkForStoredXpub returned:', hasStoredXpub);
    
    // Also set up periodic check for stored xpub (in case redirect happens after initial check)
    // This helps catch cases where user returns from QR page after initial load
    let checkCount = 0;
    const maxChecks = 10; // Check for 10 seconds
    const storedXpubCheckInterval = setInterval(function() {
      checkCount++;
      if (checkCount >= maxChecks) {
        clearInterval(storedXpubCheckInterval);
        return;
      }
      
      // Check cookies for stored xpub
      const cookies = document.cookie.split(';');
      let foundXpub = false;
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name.trim().startsWith('keyrex_xpub_')) {
          foundXpub = true;
          console.log('Key-Rex: Found stored xpub in periodic check, calling onSuccess');
          if (window.KeyRex && window.KeyRex.onSuccess) {
            window.KeyRex.onSuccess(value);
            // Clean up cookie
          }
          clearInterval(storedXpubCheckInterval);
          break;
        }
      }
    }, 1000); // Check every second
    
    // Then initialize normally
    if (window.KeyRex && window.KeyRex.init) {
      console.log('Key-Rex: Calling window.KeyRex.init()');
      window.KeyRex.init();
    } else {
      console.error('Key-Rex: window.KeyRex or window.KeyRex.init not found!');
    }
  }
  
  // Check for xpub in URL params immediately (user returned from QR page redirect)
  // But wait a moment for onSuccess callback to be set up by customer site
  (function checkUrlParamsImmediately() {
    var immediateParams = new URLSearchParams(window.location.search);
    var xpubFromUrl = immediateParams.get('xpub');
    
    if (xpubFromUrl) {
      // Wait a bit for customer site to set up onSuccess callback
      setTimeout(function() {
        if (window.KeyRex && window.KeyRex.onSuccess) {
          console.log('Key-Rex: Found xpub in URL params on script load, calling onSuccess');
          
          // Clean up URL params (remove xpub from URL without reload)
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('xpub');
          window.history.replaceState({}, '', newUrl.toString());
          
          // Call success callback
          window.KeyRex.onSuccess(xpubFromUrl);
        } else {
          console.log('Key-Rex: xpub found in URL but onSuccess not set yet, will check in checkForStoredXpub');
        }
      }, 500); // Give customer site 500ms to set up callbacks
    }
  })();
  
  console.log('Key-Rex: Script loaded, document.readyState:', document.readyState);
  if (document.readyState === 'loading') {
    console.log('Key-Rex: DOM still loading, adding DOMContentLoaded listener');
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    // DOM already ready
    console.log('Key-Rex: DOM already ready, calling autoInit immediately');
    autoInit();
  }
})();
`

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=300', // 5 minutes cache for the script itself
      'Access-Control-Allow-Origin': '*', // Allow embedding from any domain
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

