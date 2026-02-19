# Featured Wallets — Embed Script Reference

Saved reference of the original embed script wallet rendering code, removed when converting featured wallet slots to paid ad space. Use this as a starting point when implementing paid wallet placements.

## Original Wallet Data (Hardcoded Defaults)

```js
const featuredWallets = [
  { name: 'Alby', url: 'https://getalby.com', logoUrl: baseUrl + '/images/wallets/alby-logo.svg' },
  { name: 'Phoenix', url: 'https://phoenix.acinq.co', logoUrl: baseUrl + '/images/wallets/phoenix-logo.svg' },
  { name: 'Zeus', url: 'https://zeusln.app', logoUrl: baseUrl + '/images/wallets/zeus-logo.svg' }
];
```

## Logo Assets

Located in `public/images/wallets/`:
- `alby-logo.svg`
- `phoenix-logo.svg`
- `zeus-logo.svg`

## Original Embed Script Rendering Code

This code lived in `app/embed/route.ts` inside `renderButtonAndWallets()`. It renders in the right side of the embed card, next to the Key-Rex login button.

```js
// Create right side container for wallets only - COMPACT MODE
const rightContainer = document.createElement('div');
rightContainer.setAttribute('data-keyrex', 'right-container');
rightContainer.style.cssText = 'display: flex; flex-direction: column; gap: 0.25rem; justify-content: center; align-items: center;';

// Label above featured wallets
const walletsLabel = document.createElement('div');
walletsLabel.textContent = 'Featured Wallets';
walletsLabel.style.cssText = 'font-size: 0.6875rem; font-weight: 500; color: ' + (isDarkMode ? 'rgb(148, 163, 184)' : 'rgb(100, 116, 139)') + '; margin-bottom: 0.125rem; text-align: center; width: 100%;';
rightContainer.appendChild(walletsLabel);

// Create featured wallets section
const walletsContainer = document.createElement('div');
walletsContainer.setAttribute('data-keyrex', 'wallets');
walletsContainer.style.cssText = 'display: flex; justify-content: center; align-items: flex-start; gap: 0.75rem; padding: 0.125rem 0; flex-wrap: wrap;';

featuredWallets.forEach((wallet, index) => {
  // Wrapper with staggered fade-in animation
  const walletWrapper = document.createElement('div');
  walletWrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 0.25rem; opacity: 0; animation: keyrex-fade-in-stagger 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards; animation-delay: ' + (0.2 + (index * 0.1)) + 's;';

  // Logo circle container with dark mode support
  const containerBg = isDarkMode ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.05)';
  const containerBorder = isDarkMode ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.1)';
  const logoContainer = document.createElement('div');
  logoContainer.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; background: ' + containerBg + '; border-radius: 50%; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid ' + containerBorder + '; position: relative;';

  // Clickable link wrapping the logo
  const walletLink = document.createElement('a');
  walletLink.setAttribute('data-keyrex', 'wallet');
  walletLink.setAttribute('aria-label', wallet.name + ' wallet');
  walletLink.href = wallet.url;
  walletLink.target = '_blank';
  walletLink.rel = 'noopener noreferrer';
  walletLink.style.cssText = 'display: flex; align-items: center; justify-content: center; padding: 0.5rem; text-decoration: none; width: 100%; height: 100%; border-radius: 50%;';

  // Tooltip (shows on hover after 500ms delay)
  const tooltip = document.createElement('div');
  tooltip.setAttribute('data-keyrex', 'tooltip');
  tooltip.textContent = 'Get ' + wallet.name + ' wallet';
  const tooltipBg = isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(30, 41, 59, 0.95)';
  tooltip.style.cssText = 'position: absolute; bottom: calc(100% + 0.5rem); left: 50%; transform: translateX(-50%) translateY(-4px); background: ' + tooltipBg + '; color: white; padding: 0.375rem 0.75rem; border-radius: 0.5rem; font-size: 0.75rem; white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 0.2s ease, transform 0.2s ease; z-index: 1000; font-weight: 500; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);';

  // Tooltip arrow
  const tooltipArrow = document.createElement('div');
  tooltipArrow.style.cssText = 'position: absolute; top: 100%; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 4px solid ' + tooltipBg + ';';
  tooltip.appendChild(tooltipArrow);
  logoContainer.appendChild(tooltip);

  // Tooltip hover logic with 500ms delay
  let tooltipTimeout;
  const showTooltip = function() {
    tooltipTimeout = setTimeout(function() {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateX(-50%) translateY(0)';
    }, 500);
  };
  const hideTooltip = function() {
    clearTimeout(tooltipTimeout);
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translateX(-50%) translateY(-4px)';
  };

  // Wallet logo image
  const walletLogo = document.createElement('img');
  walletLogo.src = wallet.logoUrl;
  walletLogo.alt = wallet.name;
  walletLogo.style.cssText = 'height: 1.5rem; width: auto; object-fit: contain; display: block; transition: transform 0.3s ease;';

  // Hover effects — lift, glow, scale
  logoContainer.onmouseenter = function() {
    this.style.transform = 'translateY(-3px) scale(1.08)';
    const hoverBg = isDarkMode ? 'rgba(249, 115, 22, 0.2)' : 'rgba(249, 115, 22, 0.1)';
    this.style.background = hoverBg;
    this.style.boxShadow = '0 6px 16px rgba(249, 115, 22, 0.2), 0 2px 6px rgba(249, 115, 22, 0.15), 0 0 20px rgba(249, 115, 22, 0.2)';
    this.style.animation = 'keyrex-glow 2s ease-in-out infinite';
    const hoverBorder = isDarkMode ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)';
    this.style.borderColor = hoverBorder;
    this.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    walletLogo.style.transform = 'scale(1.08)';
    walletLogo.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    showTooltip();
  };
  logoContainer.onmouseleave = function() {
    this.style.transform = 'translateY(0) scale(1)';
    this.style.background = containerBg;
    this.style.boxShadow = 'none';
    this.style.animation = 'none';
    this.style.borderColor = containerBorder;
    this.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    walletLogo.style.transform = 'scale(1)';
    walletLogo.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    hideTooltip();
  };

  // Focus state for accessibility
  walletLink.onfocus = function() {
    logoContainer.style.outline = '2px solid rgba(249, 115, 22, 0.5)';
    logoContainer.style.outlineOffset = '2px';
    showTooltip();
  };
  walletLink.onblur = function() {
    logoContainer.style.outline = 'none';
    hideTooltip();
  };

  // Fallback to initial letter if logo fails to load
  walletLogo.onerror = function() {
    this.style.display = 'none';
    logoContainer.textContent = wallet.name.charAt(0);
    logoContainer.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; background: rgba(249, 115, 22, 0.1); border-radius: 50%; font-size: 0.75rem; font-weight: 600; color: rgb(249, 115, 22);';
  };

  walletLink.appendChild(walletLogo);
  logoContainer.appendChild(walletLink);
  walletWrapper.appendChild(logoContainer);

  // Wallet name label below logo
  const walletName = document.createElement('span');
  walletName.textContent = wallet.name;
  const walletNameColor = isDarkMode ? 'rgb(148, 163, 184)' : 'rgb(113, 128, 150)';
  walletName.style.cssText = 'font-size: 0.6875rem; color: ' + walletNameColor + '; text-align: center; line-height: 1.2; font-weight: 500; letter-spacing: 0.01em;';
  walletWrapper.appendChild(walletName);

  walletsContainer.appendChild(walletWrapper);
});

rightContainer.appendChild(walletsContainer);
wrapper.appendChild(rightContainer);
```

## Required CSS Animations

These are already defined in the embed script's isolated styles (`keyrex-isolated-styles`):

```css
@keyframes keyrex-fade-in-stagger {
  from { opacity: 0; transform: translateY(8px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes keyrex-glow {
  0%, 100% { box-shadow: 0 0 0 rgba(249, 115, 22, 0); }
  50% { box-shadow: 0 0 20px rgba(249, 115, 22, 0.3), 0 0 40px rgba(249, 115, 22, 0.15); }
}
```

## Where to Re-integrate

Replace the "Coming Soon" placeholder in `app/embed/route.ts` inside `renderButtonAndWallets()` (currently around line 574-589). The current placeholder code:

```js
// Create right side container - Featured Wallets ad space (Coming Soon)
const rightContainer = document.createElement('div');
rightContainer.setAttribute('data-keyrex', 'right-container');
rightContainer.style.cssText = 'display: flex; flex-direction: column; gap: 0.25rem; justify-content: center; align-items: center;';

const walletsLabel = document.createElement('div');
walletsLabel.textContent = 'Featured Wallets';
// ...
const comingSoonText = document.createElement('div');
comingSoonText.textContent = 'Coming Soon';
// ...
```

## Other Files That Were Changed

These files had wallet references (Alby, Phoenix, Zeus) replaced with generic language or Coming Soon placeholders. When re-adding paid wallets, you may want to update some of these:

- `components/OnboardingWizard.tsx` — Step 1 wallet cards (now Coming Soon box)
- `components/KeyRexButtonPreview.tsx` — Button preview wallet logos (now Coming Soon text)
- `app/onboarding/page.tsx` — Onboarding wallet links (now Coming Soon box)
- `app/how-it-works/page.tsx` — Wallet cards section (now Coming Soon box)
- `app/docs/page.tsx` — Wallet download links (now Coming Soon box)
- `app/api/embed/config/route.ts` — Default fallback wallet array (now empty)

## Admin API (Still Active)

The admin wallet management API is still in place at `app/api/admin/featured-wallets/route.ts` — it can be used to manage paid wallet placements when ready.
