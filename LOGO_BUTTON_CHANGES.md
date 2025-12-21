# Logo Button Implementation - Reversion Guide

## Summary
Added BitPass logo to the authentication button that appears on customer websites and in all previews.

## Files Modified

### 1. `app/embed/route.ts`
**Changes:**
- Modified button creation to include logo image alongside text
- Added logo image element with styling (height: 1.25rem, margin-right: 0.5rem)
- Added flex display to button for proper logo/text alignment
- Updated branding verification to check for logo OR text (not just text)

**Original code (lines 179-184):**
```javascript
const button = document.createElement('button');
button.id = 'bitpass-button';
button.setAttribute('data-bitpass', 'button');
button.textContent = config.buttonText || 'Sign in with ₿itPass';
button.onclick = handleLogin;
```

**New code:**
```javascript
const button = document.createElement('button');
button.id = 'bitpass-button';
button.setAttribute('data-bitpass', 'button');
button.onclick = handleLogin;

// Add logo and text to button
const logoImg = document.createElement('img');
logoImg.src = baseUrl + '/images/bitpass-logo.png';
logoImg.alt = '₿itPass';
logoImg.style.cssText = 'height: 1.25rem; width: auto; margin-right: 0.5rem; display: inline-block; vertical-align: middle;';

const buttonText = document.createElement('span');
buttonText.textContent = config.buttonText || 'Sign in with ₿itPass';

button.appendChild(logoImg);
button.appendChild(buttonText);
```

**Branding verification change (lines 67-73):**
- Original: Only checked for "bitpass" in button text
- New: Checks for logo image OR "bitpass" in text

### 2. `components/BitPassButtonPreview.tsx`
**Changes:**
- Added logo image to preview button
- Added flex display styling to match embed script
- Logo appears before text, same as embed script

**Original code (button element):**
```jsx
<button>
  {config.buttonText}
</button>
```

**New code:**
```jsx
<button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
  <img src="/images/bitpass-logo.png" alt="₿itPass" style={{ height: '1.25rem', width: 'auto' }} />
  <span>{config.buttonText}</span>
</button>
```

## How to Revert

### To revert `app/embed/route.ts`:
1. Replace button creation code (lines 179-199) with original `button.textContent` version
2. Revert branding verification (lines 67-73) to only check text

### To revert `components/BitPassButtonPreview.tsx`:
1. Remove logo image from button
2. Remove flex styling from button
3. Restore simple `{config.buttonText}` content

## Dependencies
- Logo file must exist at: `public/images/bitpass-logo.png`
- Logo should have transparent background
- Logo is served from BitPass server and accessible to customer websites

## Testing
- Button should display logo + text on customer websites
- Preview buttons (dashboard and landing page) should match
- Branding verification should pass with logo present
- Button styling should remain consistent





