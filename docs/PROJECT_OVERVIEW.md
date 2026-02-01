# BitPass - Complete Project Overview

## Purpose and Vision

BitPass is an open-source Bitcoin Lightning Network authentication service that allows websites to offer passwordless login using Lightning wallets. The service acts as a bridge between client websites and their end-users, providing a secure, privacy-focused authentication mechanism based on LNURL-auth protocol.

**Key Philosophy:**
- **Open source** (MIT license)
- **Minimal data collection** (only operational data, no tracking)
- **Bitcoin-only** (Lightning Network authentication)
- **Free forever** (no paid tiers, all users get full access)
- **Privacy-first** (users identified by deterministic xpub, not personal data)

---

## Technology Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Authentication:** LNURL-auth protocol (Lightning Network standard)
- **Cryptography:** 
  - `@noble/secp256k1` for signature verification
  - `elliptic` library for DER signature support
  - Node.js `crypto` for SHA256 hashing
- **Storage:** In-memory (development) - designed for Vercel KV or database in production
- **Deployment:** Vercel (serverless functions)

---

## Architecture Overview

### Two User Types

1. **BitPass Customers (Website Owners)**
   - Sign up with Lightning wallet to get a `siteId`
   - Access dashboard at `/dashboard` to manage domains and view analytics
   - Receive embed code to integrate BitPass on their website
   - All customers are free users (no subscription system)

2. **End Users (Client Website Visitors)**
   - Visit client websites that have integrated BitPass
   - Click "Sign in with ₿itPass" button
   - Authenticate with Lightning wallet (WebLN or QR code)
   - Receive `xpub` identifier that client website uses for user management

### Data Flow

```
End User → Client Website → BitPass Embed Script → BitPass API → Lightning Wallet
                                                                    ↓
End User ← Client Website ← xpub identifier ← BitPass API ← LNURL-auth callback
```

---

## Core Concepts

### xpub (Extended Public Key)
- **What it is:** A deterministic, unique, public identifier derived from a Lightning wallet's public key
- **Format:** `xpub_<32-char-hex-hash>`
- **Purpose:** Acts as a "username" - same wallet always produces same xpub
- **Derivation:** SHA256 hash of normalized public key (see `lib/auth.ts::deriveXpub()`)
- **Important:** BitPass does NOT store end-user xpubs. Only BitPass customers (website owners) have their xpubs stored.

### siteId
- **What it is:** Unique identifier for each BitPass customer (website owner)
- **Format:** Randomly generated string
- **Purpose:** Links embed code to a specific customer account
- **Usage:** Included in embed script URL: `/embed?siteId=<siteId>`

### k1 (Challenge)
- **What it is:** Random 32-byte hex string used for LNURL-auth challenge-response
- **Purpose:** Prevents replay attacks - each authentication attempt gets unique challenge
- **Lifetime:** 5 minutes (stored in `authSessions` Map)
- **Flow:** Generated → sent to wallet → wallet signs it → returned for verification

### LNURL-auth Protocol
- **Standard:** Lightning Network authentication protocol
- **Flow:**
  1. Server generates `k1` challenge
  2. Server encodes callback URL as bech32 LNURL
  3. Wallet receives LNURL, decodes it
  4. Wallet signs `SHA256(k1)` with private key
  5. Wallet calls callback URL with `sig` and `key` (public key)
  6. Server verifies signature cryptographically
  7. Server derives `xpub` from `key`
  8. Server returns `xpub` to client

---

## File Structure

```
bitpass/
├── app/
│   ├── api/                          # API routes (Next.js App Router)
│   │   ├── auth/                     # Authentication endpoints
│   │   │   ├── lnurl/route.ts        # Generate k1 challenge and LNURL
│   │   │   ├── callback/route.ts     # Handle wallet callback (verify sig, return xpub)
│   │   │   ├── login/route.ts        # WebLN login (for BitPass dashboard)
│   │   │   ├── set-session/route.ts  # Set session after QR auth
│   │   │   └── verify/route.ts       # Verify signature for client websites
│   │   ├── admin/                    # Admin-only endpoints
│   │   │   ├── auth/                 # Admin authentication
│   │   │   ├── analytics/route.ts   # Analytics data
│   │   │   ├── contacts/route.ts     # Contact submissions
│   │   │   ├── featured-wallets/     # Manage featured wallets
│   │   │   ├── stats/route.ts        # Statistics
│   │   │   └── users/route.ts        # User management
│   │   ├── embed/
│   │   │   ├── route.ts              # Serve embed script (JavaScript)
│   │   │   └── config/route.ts       # Get embed configuration
│   │   ├── user/route.ts             # Get current user (BitPass customer)
│   │   ├── verify/route.ts           # Verify login for client websites
│   │   ├── contact/route.ts          # Contact form submissions
│   │   └── domains/route.ts          # Domain management
│   ├── admin/                         # Admin portal pages
│   │   ├── dashboard/page.tsx        # Admin dashboard (analytics, users, contacts)
│   │   └── login/page.tsx            # Admin login (QR code inline)
│   ├── dashboard/page.tsx             # Customer dashboard
│   ├── onboarding/page.tsx           # New customer onboarding wizard
│   ├── embed/
│   │   └── qr/page.tsx               # QR code authentication page (popup)
│   ├── page.tsx                       # Homepage
│   ├── faq/page.tsx                  # FAQ page
│   ├── how-it-works/page.tsx         # How it works page
│   ├── requirements/page.tsx          # Technical requirements
│   ├── service-support/page.tsx      # Service & support info
│   ├── open-source/page.tsx           # Open source information
│   ├── why-bitpass/page.tsx          # Why BitPass page
│   ├── contact/page.tsx               # Contact page
│   └── layout.tsx                     # Root layout
├── components/                        # React components
│   ├── LoginButton.tsx                # Login button (for BitPass dashboard)
│   ├── OnboardingWizard.tsx          # Onboarding wizard
│   ├── BitPassButtonPreview.tsx      # Preview of embed button
│   ├── AnalyticsChart.tsx            # Analytics charts
│   ├── ActivityLog.tsx               # Activity log component
│   └── [other UI components]
├── lib/                               # Core libraries
│   ├── auth.ts                        # Cryptographic functions
│   │   ├── generateChallenge()       # Generate k1 challenge
│   │   ├── verifySignature()        # Verify LNURL-auth signature
│   │   └── deriveXpub()              # Derive xpub from pubkey
│   ├── storage.ts                     # Data storage (in-memory)
│   │   ├── User management
│   │   ├── Usage statistics
│   │   ├── Featured wallets
│   │   ├── Activity logs
│   │   └── Contact submissions
│   ├── admin-auth.ts                  # Admin authentication check
│   ├── lnurl.ts                       # LNURL encoding/decoding
│   ├── cookie-signing.ts              # Cookie signature verification
│   └── utils.ts                       # Utility functions
├── types/
│   └── index.ts                       # TypeScript type definitions
└── [config files]
```

---

## Authentication Flows

### Flow 1: BitPass Customer Login (Dashboard Access)

**Purpose:** Website owners sign into BitPass dashboard to manage their integration.

**Steps:**
1. User visits `/dashboard` or clicks login button
2. `LoginButton.tsx` component handles authentication
3. If WebLN available: Direct authentication via `window.webln.lnurl()`
4. If no WebLN: Redirect to `/admin/login` (for admin) or show QR code inline
5. Wallet signs challenge, callback verifies signature
6. Session cookie set (`user_xpub`), user redirected to dashboard

**Key Files:**
- `components/LoginButton.tsx` - Main login component
- `app/api/auth/login/route.ts` - Login endpoint
- `app/api/user/route.ts` - Get current user

### Flow 2: Admin Login

**Purpose:** Admin access to `/admin/dashboard` for managing all customers.

**Steps:**
1. Admin visits `/admin/login`
2. QR code displayed inline (no redirect)
3. Mobile: Deep link with `lightning:` protocol
4. Desktop: QR code to scan or LNURL to copy
5. Wallet signs challenge, calls `/api/admin/auth/login`
6. Server verifies xpub matches `ADMIN_XPUB` env variable
7. Admin session cookie set (`admin_session`)

**Key Files:**
- `app/admin/login/page.tsx` - Admin login page (inline QR)
- `app/api/admin/auth/login/route.ts` - Admin login endpoint
- `lib/admin-auth.ts` - Admin xpub verification

**Environment Variable:**
- `ADMIN_XPUB` - Must be set to admin's xpub (derived from admin's Lightning wallet)

### Flow 3: End-User Authentication (Client Website Integration)

**Purpose:** End users authenticate on client websites using BitPass.

**Steps:**
1. Client website includes embed script: `<script src="https://bitpass.com/embed?siteId=..."></script>`
2. Embed script (`app/embed/route.ts`) loads and renders button
3. User clicks button
4. **If WebLN available:**
   - Direct authentication via `window.webln.lnurl()`
   - Signature verified via `/api/verify`
   - `xpub` returned to client website via `window.BitPass.onSuccess(xpub)`
5. **If no WebLN (QR code flow):**
   - Popup opens `/embed/qr?siteId=...&k1=...`
   - QR code displayed (or deep link on mobile)
   - User scans/approves in wallet
   - Wallet calls `/api/auth/callback?k1=...&sig=...&key=...`
   - Server verifies signature, stores `k1 -> xpub` mapping
   - QR page polls `/api/auth/callback?k1=...` to retrieve `xpub`
   - QR page sends `postMessage` to parent window with `xpub`
   - Parent window receives `xpub` via `window.BitPass.onSuccess(xpub)`

**Key Files:**
- `app/embed/route.ts` - Embed script (JavaScript served to client websites)
- `app/embed/qr/page.tsx` - QR code page (popup)
- `app/api/auth/callback/route.ts` - Wallet callback handler
- `app/api/verify/route.ts` - Signature verification for client websites

**Cross-Domain Communication:**
- Uses `window.postMessage` for popup → parent communication
- Uses cookies (`bitpass_k1`) for fallback when popup blocked
- Uses cookies (`auth_k1_<first16chars>`) for server-side persistence

---

## Storage Model

### In-Memory Storage (`lib/storage.ts`)

**Current Implementation:** In-memory Maps (lost on server restart)

**Data Structures:**
- `users: Map<xpub, User>` - BitPass customers (website owners)
- `usage: Map<siteId, UsageStats>` - Usage statistics per customer
- `featuredWallets: FeaturedWallet[]` - Global featured wallets (admin-controlled)
- `activityLogs: Map<xpub, ActivityLog[]>` - Activity logs per customer
- `contactSubmissions: Map<id, ContactSubmission>` - Contact form submissions
- `authSessions: Map<k1, {xpub, timestamp}>` - Temporary auth sessions (5 min TTL)

**User Object:**
```typescript
{
  xpub: string                    // User identifier
  siteId: string                  // Unique site identifier
  subscribed: boolean             // Always true (all users free)
  subscriptionTier: 'free'        // Always 'free'
  allowedDomains: string[]         // List of allowed domains
  freeDisclaimerAccepted: boolean // Has accepted disclaimer
  freeDisclaimerAcceptedAt: number // Timestamp
  integrationEnabled: boolean     // Can disable auth globally
  createdAt: number               // Account creation timestamp
}
```

**Important Notes:**
- **BitPass does NOT store end-user xpubs** - only BitPass customers (website owners)
- End-user xpubs are only temporarily stored in `authSessions` during authentication flow
- Client websites receive `xpub` and must store it themselves for user management

### Production Storage

**Designed for:** Vercel KV or database (PostgreSQL, MongoDB, etc.)

**Migration Path:**
- Replace `lib/storage.ts` functions with database calls
- Keep same function signatures for compatibility
- Add connection pooling and error handling

---

## Key Features

### 1. Embed Script (`app/embed/route.ts`)

**What it does:** Serves JavaScript that client websites include to add BitPass authentication.

**Features:**
- Fetches configuration from `/api/embed/config?siteId=...`
- Renders branded button with BitPass logo
- Displays featured wallets (admin-controlled)
- Handles WebLN and QR code flows
- Provides `window.BitPass` API for callbacks

**Configuration Object:**
```typescript
{
  siteId: string
  buttonText: string              // "Sign in with ₿itPass"
  showBranding: boolean           // Always true
  featuredWallets: FeaturedWallet[] // Active wallets
  footerText: string              // "Powered by ₿itPass — open-source"
  integrationEnabled: boolean     // Can disable globally
}
```

### 2. QR Code Authentication (`app/embed/qr/page.tsx`)

**Purpose:** Fallback authentication when WebLN not available.

**Features:**
- Opens in popup (600x800px) for better UX
- Large QR code (500px) for easy scanning
- Mobile: Deep link with `lightning:` protocol
- Desktop: QR code to scan or LNURL to copy
- Auto-refresh on expiration (5 minutes)
- Network status monitoring
- Manual retry button
- Success animation and sound
- Accessibility (ARIA labels, screen reader support)
- Polling to detect authentication completion
- `postMessage` communication with parent window

**States:**
- `loading` - Generating QR code
- `waiting` - Waiting for wallet approval
- `success` - Authentication successful
- `error` - Authentication failed/timeout

### 3. Dashboard (`app/dashboard/page.tsx`)

**Purpose:** Customer dashboard for managing integration.

**Tabs:**
- **My Integration Code** - Copy embed script
- **My Domains** - Add/remove allowed domains
- **Analytics** - View usage statistics
- **Documentation** - Integration guide
- **Settings** - Account settings

**Key Features:**
- Domain management (add/remove/test)
- Usage statistics (logins, unique users, charts)
- Integration toggle (enable/disable globally)
- Activity log
- Live preview of embed button

### 4. Admin Dashboard (`app/admin/dashboard/page.tsx`)

**Purpose:** Admin portal for managing all customers.

**Tabs:**
- **Analytics** - Overall statistics
- **Users** - All BitPass customers
- **Contact Submissions** - Contact form messages
- **Wallet Partnerships** - Manage featured wallets
- **Documentation** - Admin docs

**Access:** Requires `ADMIN_XPUB` environment variable match

### 5. Featured Wallets

**Purpose:** Display recommended wallets on embed button.

**Management:**
- Admin-controlled via `/admin/dashboard` → Wallet Partnerships tab
- Global list (all customers see same wallets)
- Ordered by priority
- Can enable/disable individual wallets

**Storage:** `featuredWallets` array in `lib/storage.ts`

---

## Security Considerations

### Signature Verification

**Implementation:** `lib/auth.ts::verifySignature()`

**Process:**
1. Decode signature and public key (hex or base64)
2. Normalize public key to compressed format (33 bytes)
3. Hash k1 challenge: `SHA256(k1)`
4. Verify ECDSA signature over hash
5. Supports both compact (64 bytes) and DER (69-72 bytes) formats

**Libraries:**
- Primary: `@noble/secp256k1` (compact signatures)
- Fallback: `elliptic` (DER signatures)

### Domain Protection

**Implementation:** `app/api/verify/route.ts`

**Process:**
1. Extract origin from request headers
2. Check if domain is in user's `allowedDomains` list
3. Normalize domains (remove www, lowercase)
4. Reject if domain not allowed

**Note:** Domain checking is per-request. Client websites should also validate on their backend.

### Cookie Security

**Implementation:** `lib/cookie-signing.ts`

**Features:**
- Cryptographic signatures on sensitive cookies
- Prevents tampering
- Used for subscription backup (legacy, all users free now)

### Session Management

**BitPass Customers:**
- Session cookie: `user_xpub` (httpOnly, secure in production)
- Valid for 1 year
- Checked on protected routes

**Admin:**
- Session cookie: `admin_session` (httpOnly, secure in production)
- Valid for 1 year
- Requires `ADMIN_XPUB` match

**End Users:**
- No persistent sessions in BitPass
- Temporary `k1 -> xpub` mapping (5 minutes)
- Client websites manage their own sessions

---

## Recent Improvements (2024)

### QR Code Authentication UX
- **Inline QR for admin login** - No redirect, better UX
- **Popup for end-user QR** - Maintains context on client website
- **Auto-refresh on expiration** - Seamless experience
- **Network status monitoring** - Real-time connection feedback
- **Success animations** - Visual feedback
- **Accessibility improvements** - ARIA labels, screen reader support

### Mobile Optimization
- **Deep linking** - `lightning:` protocol for mobile wallets
- **Mobile detection** - Adapts UI for mobile vs desktop
- **Page Visibility API** - Detects when user returns from wallet
- **Persistent reminders** - Guides users back to browser

### Error Handling
- **Retry buttons** - Manual recovery options
- **Clear error messages** - User-friendly feedback
- **Troubleshooting tips** - Help users resolve issues
- **Timeout handling** - Graceful expiration

---

## Important Limitations

### Storage
- **In-memory only** - Data lost on server restart
- **No persistence** - Must migrate to database for production
- **Single instance** - Not suitable for multi-instance deployments without shared storage

### End-User Data
- **No storage of end-user xpubs** - BitPass only stores BitPass customers (website owners)
- **Client websites must store xpubs** - They receive xpub and manage user accounts themselves
- **No user accounts for end-users** - BitPass is authentication service, not user management

### Multi-Wallet Support
- **One xpub per wallet** - Each unique wallet public key produces unique xpub
- **Client websites handle linking** - If end-user wants multiple wallets, client website must link multiple xpubs to same account
- **Documentation provided** - Guides clients on multi-wallet patterns

### Lost Keys
- **No recovery for BitPass customers** - If customer loses wallet, must create new account
- **No recovery for end-users** - Client websites must provide their own recovery mechanisms
- **Security-first approach** - No recovery to prevent compromise

---

## Environment Variables

### Required for Admin Access
- `ADMIN_XPUB` - xpub of admin wallet (derived from admin's Lightning wallet)

### Optional
- `NEXT_PUBLIC_BASE_URL` - Base URL for embed script (auto-detected if not set)
- `NODE_ENV` - `production` enables secure cookies

---

## Development vs Production

### Development
- In-memory storage (resets on restart)
- HTTP cookies (not secure)
- Console logging enabled
- Fast Refresh (can cause storage resets)

### Production Considerations
- Replace `lib/storage.ts` with database
- Enable secure cookies
- Set `ADMIN_XPUB` environment variable
- Configure CORS properly
- Set up monitoring/logging
- Consider rate limiting
- Set up GitHub repository (for open source claim)
- Set up security email (for vulnerability reporting)

---

## Testing

### Manual Testing Flow

1. **BitPass Customer Signup:**
   - Visit homepage
   - Click "Sign in with BitPass"
   - Authenticate with Lightning wallet
   - Complete onboarding wizard
   - Access dashboard

2. **Embed Integration:**
   - Copy embed code from dashboard
   - Paste into HTML page
   - Click button
   - Authenticate (WebLN or QR)
   - Verify `xpub` received in callback

3. **Admin Access:**
   - Set `ADMIN_XPUB` in `.env.local`
   - Visit `/admin/login`
   - Authenticate with admin wallet
   - Access admin dashboard

### Known Issues

- **Storage resets** - Expected in development (in-memory)
- **Fast Refresh** - Can cause module reloads and storage resets
- **CORS** - May need configuration for custom domains

---

## Code Patterns

### API Routes
- Use Next.js App Router (`app/api/*/route.ts`)
- Export `GET`, `POST`, `OPTIONS` functions
- Return `NextResponse.json()` or `NextResponse`
- Handle CORS for cross-origin requests

### Client Components
- Use `'use client'` directive
- Use React hooks (`useState`, `useEffect`, etc.)
- Handle async operations properly
- Use Suspense for loading states

### Storage Functions
- All in `lib/storage.ts`
- Synchronous functions (in-memory)
- Return types match TypeScript interfaces
- Logging for debugging

### Authentication
- Always verify signatures cryptographically
- Never trust client-provided data
- Use deterministic xpub derivation
- Store temporary sessions with TTL

---

## Future Considerations

### Potential Enhancements
- Database migration (Vercel KV, PostgreSQL, etc.)
- Rate limiting
- Analytics improvements
- Multi-instance support
- Webhook notifications
- API keys for programmatic access
- Custom branding (paid feature discussion)

### Open Source Compliance
- GitHub repository (to be created)
- Security email (to be set up)
- License file (MIT - already present)
- Documentation (in progress)

---

## Questions This Document Answers

This document should enable another AI assistant to answer questions like:

- "How does authentication work?"
- "Where is user data stored?"
- "How do client websites integrate BitPass?"
- "What is an xpub?"
- "How does the QR code flow work?"
- "What's the difference between BitPass customers and end-users?"
- "How do I add a new feature?"
- "Where is the embed script?"
- "How does admin access work?"
- "What are the security considerations?"
- "What's the current state of the project?"
- "What are the known limitations?"

---

## Quick Reference

### Key Endpoints
- `/api/auth/lnurl` - Get k1 challenge
- `/api/auth/callback` - Wallet callback (verify sig, return xpub)
- `/api/verify` - Verify signature for client websites
- `/api/embed?siteId=...` - Get embed script
- `/api/embed/config?siteId=...` - Get embed configuration
- `/api/user` - Get current BitPass customer
- `/api/admin/auth/login` - Admin login

### Key Files
- `lib/auth.ts` - Cryptographic functions
- `lib/storage.ts` - Data storage
- `app/embed/route.ts` - Embed script
- `app/embed/qr/page.tsx` - QR code page
- `app/dashboard/page.tsx` - Customer dashboard
- `app/admin/dashboard/page.tsx` - Admin dashboard

### Key Types
- `User` - BitPass customer (website owner)
- `xpub` - User identifier (derived from pubkey)
- `siteId` - Customer identifier
- `k1` - Authentication challenge
- `EmbedConfig` - Embed script configuration

---

**Last Updated:** 2024
**Version:** Current production state
**Status:** Active development, production-ready core features





