# BitPass to Key-Rex Migration Plan

## Overview
Complete rebranding from BitPass to Key-Rex across the entire codebase, including code, UI text, file names, and assets.

**Important Notes:**
- Brand name: **Key-Rex** (with hyphen)
- No Bitcoin symbol (₿) - removed
- No backward compatibility needed (no existing users)
- Full migration approach

---

## Categories of Changes

### 1. FILE NAMES TO RENAME

#### Component Files
- `components/BitPassButtonPreview.tsx` → `components/KeyRexButtonPreview.tsx`

#### Image Files (in `public/images/`)
- `bitpass-logo.png` → `keyrex-logo.png` (replace with new Key-Rex logo)
- `bitpasslogo-button-v1-transparent.png` → `keyrexlogo-button-v1-transparent.png` (replace with new Key-Rex logo)
- `bitpasslogo-button-v1.PNG` → `keyrexlogo-button-v1.PNG` (replace with new Key-Rex logo)
- `bitpasslogo-button-v2signin.png` → `keyrexlogo-button-v2signin.png` (replace with new Key-Rex logo)

**Note:** You have new Key-Rex logo images. These should be added to `public/images/` with the new names before or during migration.

---

### 2. PACKAGE.JSON & CONFIG FILES

#### `package.json`
- Line 2: `"name": "bitpass"` → `"name": "keyrex"` (package names typically use lowercase, no hyphens)

#### `README.md`
- Title: `# BitPass - Bitcoin Lightning Login` → `# Key-Rex - Bitcoin Lightning Login`
- All references to BitPass → Key-Rex

---

### 3. JAVASCRIPT OBJECT NAMES (CRITICAL - BREAKING CHANGES)

These are used in the embed script that customers include on their websites. Changing these will break existing integrations unless handled carefully.

#### Global Window Object
- `window.BitPass` → `window.KeyRex` (JavaScript object names cannot have hyphens, use camelCase)
- `BitPass.init()` → `KeyRex.init()`
- `BitPass.onSuccess()` → `KeyRex.onSuccess()`
- `BitPass.onError()` → `KeyRex.onError()`

**Files affected:**
- `app/embed/route.ts` (embed script generation)
- `app/dashboard/page.tsx` (documentation/examples)
- All customer-facing documentation

**Note:** JavaScript variable names cannot contain hyphens, so `window.KeyRex` (camelCase) is used in code, but UI text will show "Key-Rex" (with hyphen).

---

### 4. HTML ELEMENT IDs & CSS CLASSES

#### Element IDs
- `bitpass-container` → `keyrex-container` (HTML IDs use lowercase, no hyphens)
- `bitpass-button` → `keyrex-button`

#### CSS Classes & Data Attributes
- `data-bitpass` → `data-keyrex` (HTML attributes use lowercase, no hyphens)
- `data-bitpass-container` → `data-keyrex-container`
- `data-bitpass-button` → `data-keyrex-button`
- `data-bitpass-card` → `data-keyrex-card`
- `data-bitpass-wrapper` → `data-keyrex-wrapper`
- All other `data-bitpass-*` → `data-keyrex-*`

**Note:** HTML IDs and data attributes use lowercase without hyphens for consistency and compatibility.

**Files affected:**
- `app/embed/route.ts` (embed script)
- `components/BitPassButtonPreview.tsx`
- Any CSS/styling files

---

### 5. COOKIE NAMES

#### Cookie Prefixes
- `bitpass_` → `keyrex_` (cookie names use lowercase, no hyphens)
- `bitpass_k1` → `keyrex_k1`
- `bitpass_xpub_` → `keyrex_xpub_`
- `bitpass_return_url` → `keyrex_return_url`

**Note:** Cookie names use lowercase without hyphens for compatibility.

**Files affected:**
- `app/embed/route.ts`
- `app/api/auth/callback/route.ts`
- `app/api/auth/store-k1/route.ts`
- `app/dashboard/page.tsx` (diagnostics)

**Note:** This will invalidate existing user sessions. Users will need to re-authenticate after deployment.

---

### 6. CONSOLE MESSAGES & ERROR MESSAGES

All console.log, console.error messages containing "BitPass" → "Key-Rex" (in user-facing messages)

**Files affected:**
- `app/embed/route.ts`
- `app/api/embed/config/route.ts`
- `app/dashboard/page.tsx`
- All API routes

---

### 7. UI TEXT (USER-FACING)

#### Main Landing Page (`app/page.tsx`)
- "₿itPass" → "Key-Rex" (Bitcoin symbol removed)
- "BitPass" → "Key-Rex"
- "BitPass account" → "Key-Rex account"
- All instances of "₿itPass" → "Key-Rex"

#### Navigation (`components/Layout.tsx`)
- "₿itPass" → "Key-Rex" (Bitcoin symbol removed)
- "BitPass" → "Key-Rex"
- "BitPass Home" → "Key-Rex Home"
- "Already have a ₿itPass Account?" → "Already have a Key-Rex Account?"
- "Sign in with BitPass" → "Sign in with Key-Rex"

#### Dashboard (`app/dashboard/page.tsx`)
- "Manage your ₿itPass integration" → "Manage your Key-Rex integration" (Bitcoin symbol removed)
- "Getting Started with ₿itPass" → "Getting Started with Key-Rex"
- "Add ₿itPass to Your Website" → "Add Key-Rex to Your Website"
- All tooltips and help text: "BitPass" → "Key-Rex"
- All code examples showing `BitPass.onSuccess()` → `KeyRex.onSuccess()` (JavaScript uses camelCase)

#### Login Button (`components/LoginButton.tsx`)
- "Sign in with ₿itPass" → "Sign in with Key-Rex" (Bitcoin symbol removed)
- "Sign in with BitPass" → "Sign in with Key-Rex"
- Default button text
- Image alt text

#### Onboarding Wizard (`components/OnboardingWizard.tsx`)
- All references to BitPass → Key-Rex
- All references to ₿itPass → Key-Rex (Bitcoin symbol removed)
- Disclaimer text
- Step descriptions

#### All Other Pages
- `app/how-it-works/page.tsx`
- `app/why-bitpass/page.tsx` (also rename file to `why-keyrex`)
- `app/faq/page.tsx`
- `app/support/page.tsx`
- `app/docs/page.tsx`
- `app/requirements/page.tsx`
- `app/for-wallets/page.tsx`
- `app/open-source/page.tsx`
- `app/onboarding/page.tsx`
- `app/admin/login/page.tsx`
- `app/admin/dashboard/page.tsx`

---

### 8. ROUTE/PAGE FILE NAMES

#### Consider Renaming (Optional)
- `app/why-bitpass/page.tsx` → `app/why-keyrex/page.tsx` (or keep route, update content)
- Update all links/navigation that reference `/why-bitpass` → `/why-keyrex`

**Note:** Route names typically use lowercase without hyphens. Consider keeping `/why-bitpass` route for SEO, but update page content to show "Key-Rex".

---

### 9. API ROUTE COMMENTS & DOCUMENTATION

All API route files contain comments mentioning BitPass:
- `app/api/embed/route.ts`
- `app/api/embed/config/route.ts`
- `app/api/auth/*/route.ts`
- `app/api/admin/*/route.ts`
- All other API routes

---

### 10. TEST FILES

#### Test Scripts
- `test-e2e.js` - Contains BitPass references in test descriptions
- `test-admin-e2e.js` - Contains BitPass references
- `test-phase1.js`, `test-phase2.js`, etc.

#### Test Documentation
- `E2E_TESTING_PLAN.md`
- `ADMIN_E2E_TESTING_PLAN.md`
- `CLIENT_SITE_AUTH_E2E_TESTING_PLAN.md`
- `FINAL_TEST_RESULTS.md`
- All other test-related markdown files

---

### 11. DOCUMENTATION FILES

All `.md` files contain BitPass references:
- `README.md`
- `DEPLOYMENT.md`
- `PROJECT_OVERVIEW.md`
- All other documentation files

---

### 12. IMAGE ALT TEXT & ARIA LABELS

- All `alt="BitPass"` → `alt="KeyRex"`
- All `aria-label="BitPass"` → `aria-label="KeyRex"`
- All `title="BitPass"` → `title="KeyRex"`

---

### 13. ENVIRONMENT VARIABLES & CONFIG

#### Environment Variable Names (Consider Keeping)
- `ADMIN_XPUB` - Keep as is (not BitPass-specific)
- `NEXT_PUBLIC_BASE_URL` - Keep as is

**Note:** These don't need to change as they're not user-facing.

---

## Implementation Strategy

### Phase 1: UI & Text Updates (Safe to Deploy)
1. Update UI text (all user-facing text: "BitPass" → "Key-Rex")
2. Remove Bitcoin symbol (₿) from all UI text
3. Update file names (components, images)
4. Update package.json
5. Update documentation files
6. Update console messages
7. Update CSS classes and data attributes

### Phase 2: Code & Technical Updates (No Users - Safe to Deploy)
1. Update `window.BitPass` → `window.KeyRex` (JavaScript uses camelCase)
2. Update cookie names (`bitpass_*` → `keyrex_*`)
3. Update HTML element IDs (`bitpass-*` → `keyrex-*`)

**Note:** Since you have no existing users, full migration is safe. No backward compatibility needed.

---

## Detailed File-by-File Changes

### Critical Files (Must Update)

1. **`app/embed/route.ts`**
   - `window.BitPass` → `window.KeyRex` (JavaScript camelCase)
   - `BitPass.init()` → `KeyRex.init()`
   - `bitpass-container` → `keyrex-container`
   - `bitpass-button` → `keyrex-button`
   - All `data-bitpass-*` → `data-keyrex-*`
   - All cookie names `bitpass_*` → `keyrex_*`
   - All console messages: "BitPass" → "Key-Rex" (with hyphen in user-facing text)
   - All error messages: "BitPass" → "Key-Rex"
   - Remove Bitcoin symbol (₿) from all user-facing strings

2. **`components/Layout.tsx`**
   - Logo image path
   - Alt text
   - Navigation text
   - Footer text

3. **`app/page.tsx`**
   - Main heading "₿itPass" → "KeyRex"
   - All UI text references

4. **`app/dashboard/page.tsx`**
   - All UI text
   - Code examples
   - Tooltips
   - Help text

5. **`components/LoginButton.tsx`**
   - Default button text
   - Image alt text

6. **`components/BitPassButtonPreview.tsx`**
   - Rename file to `KeyRexButtonPreview.tsx`
   - Update all references
   - Update imports in files that use it

7. **`package.json`**
   - `"name": "bitpass"` → `"name": "keyrex"`

8. **`README.md`**
   - Title and all content

---

## Search & Replace Patterns

### Exact Matches (Case-Sensitive)
- `BitPass` → `Key-Rex` (in UI text)
- `bitpass` → `keyrex` (in code/IDs/cookies - lowercase, no hyphen)
- `Bitpass` → `Key-Rex` (in UI text)
- `₿itPass` → `Key-Rex` (Bitcoin symbol removed)

### In Code (JavaScript/TypeScript)
- `window.BitPass` → `window.KeyRex` (JavaScript uses camelCase, no hyphen)
- `BitPass.init` → `KeyRex.init`
- `BitPass.onSuccess` → `KeyRex.onSuccess`
- `BitPass.onError` → `KeyRex.onError`
- `#bitpass-container` → `#keyrex-container` (HTML IDs lowercase, no hyphen)
- `#bitpass-button` → `#keyrex-button`
- `data-bitpass` → `data-keyrex` (HTML attributes lowercase, no hyphen)
- `bitpass_` (cookie prefix) → `keyrex_` (cookie names lowercase, no hyphen)

### In Strings/Text (User-Facing)
- "BitPass" → "Key-Rex" (with hyphen)
- "₿itPass" → "Key-Rex" (Bitcoin symbol removed)
- "BitPass account" → "Key-Rex account"
- All user-facing text uses "Key-Rex" with hyphen

---

## Files Requiring Manual Review

These files need careful review as they may have context-specific references:

1. **`app/embed/route.ts`** - Embed script (most critical)
2. **`app/dashboard/page.tsx`** - Customer-facing documentation
3. **`components/OnboardingWizard.tsx`** - User onboarding flow
4. **`lib/storage.ts`** - May have internal comments
5. **All test files** - Test descriptions and assertions

---

## Breaking Changes Impact

### Customer Impact
- **No existing users:** Full migration is safe - no backward compatibility needed
- **Changing `window.BitPass`:** Will be `window.KeyRex` (JavaScript camelCase)
- **Changing cookie names:** All user sessions will be invalidated (acceptable since no users)
- **Changing element IDs:** Customer CSS targeting these IDs will need updates (acceptable since no users)

### Recommendation
Since you have no existing users, proceed with full migration:
1. Complete replacement of `window.BitPass` → `window.KeyRex`
2. Complete replacement of all cookie names
3. Complete replacement of all element IDs
4. No backward compatibility needed

---

## Testing Checklist

After migration:
- [ ] All UI text shows "Key-Rex" (with hyphen) not "BitPass"
- [ ] No Bitcoin symbol (₿) appears in UI text
- [ ] Logo images load correctly (new Key-Rex logos)
- [ ] Embed script works with new `window.KeyRex` object
- [ ] All navigation links work
- [ ] Dashboard loads and functions correctly
- [ ] Authentication flow works
- [ ] Admin portal works
- [ ] No console errors
- [ ] All pages render correctly
- [ ] Mobile responsiveness maintained

---

## Estimated Scope

- **Total files to update:** ~100+ files
- **Total references to change:** ~1,300+ instances
- **Breaking changes:** 2-3 major areas (window object, cookies, element IDs)
- **Estimated time:** 2-4 hours for automated changes, 1-2 hours for testing

---

## Next Steps

1. Review this plan
2. Decide on backward compatibility strategy
3. Create backup of current codebase
4. Execute Phase 1 changes (non-breaking)
5. Test thoroughly
6. Execute Phase 2 changes (breaking) if proceeding
7. Update Vercel deployment
8. Update GitHub repository

---

## Important Naming Conventions

### Brand Name: "Key-Rex" (with hyphen)
- **UI Text:** Always use "Key-Rex" with hyphen (user-facing)
- **JavaScript Variables:** Use `KeyRex` (camelCase, no hyphen - JavaScript doesn't allow hyphens in variable names)
- **HTML IDs/Attributes:** Use `keyrex` (lowercase, no hyphen - HTML convention)
- **Cookie Names:** Use `keyrex_` (lowercase, no hyphen - cookie convention)
- **Package Names:** Use `keyrex` (lowercase, no hyphen - npm convention)
- **File Names:** Use `keyrex` or `KeyRex` depending on file type

### Bitcoin Symbol
- **Removed:** All Bitcoin symbols (₿) removed from UI text
- **UI shows:** "Key-Rex" (no symbol)

### Logo Images
- **Status:** You have new Key-Rex logo images ready
- **Action:** Add logo images to `public/images/` before or during migration
- **File names:** Use `keyrex-logo.png`, `keyrexlogo-button-*.png` (lowercase, no hyphen in filenames)

