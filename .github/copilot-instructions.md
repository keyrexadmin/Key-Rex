# Copilot Instructions for Key-Rex Repository

This guide helps Copilot work effectively in the Key-Rex monorepo.

## Build, Test, and Lint Commands

### Monorepo Root
```bash
npm run dev                    # Start Key-Rex webapp dev server (port 3000)
npm run dev:client            # Start fake-client-site for local testing (port 3001)
npm run build                 # Build webapp for production
npm run lint                  # Lint webapp code
npm run test                  # Run all automated tests
npm install:webapp            # Install webapp dependencies
npm run deploy:client-standalone # Deploy standalone client site
```

### Webapp (Primary Project)
Commands should be run from the `webapp/` directory:

```bash
npm run dev                   # Start dev server
npm run build                 # Build for production (includes Prisma migrations)
npm run start                 # Start production server
npm run lint                  # Run ESLint
npm run db:seed              # Seed database with test data

# Testing - Multiple test suites for different features
npm run test:phase1          # Basic auth flow tests
npm run test:phase2          # Phase 2 feature tests
npm run test:phase2-final    # Final phase 2 tests
npm run test:all             # Phase 1 + Phase 2 final
npm run test:e2e             # End-to-end tests
npm run test:admin           # Admin portal tests
npm run test:additional      # Additional edge case tests
npm run test:all-automated   # All automated tests together
```

**Single test**: Test files are in `webapp/test-*.js`. Run individual tests: `node test-phase1.js`

## Project Structure

**Monorepo layout** (npm workspaces):
- `webapp/` - Main Key-Rex application (Next.js + React + Prisma)
- `fake-client-site/` - Example client site for local testing (localhost:3001)
- `fake-client-site-standalone/` - Deployable client site for remote testing
- `api/` - Placeholder for future API services

## High-Level Architecture

### Dual User Model

**1. Key-Rex Customers (Website Owners)**
- Authenticate with Lightning wallet to get a unique `siteId`
- Access `/dashboard` to manage domains and view analytics
- Receive embed code to integrate Key-Rex on their websites
- Identified by `xpub` (derived from wallet's public key)

**2. End Users (Client Website Visitors)**
- Authenticate via Lightning wallet (WebLN or QR code) on client websites
- Receive `xpub` identifier (temporary, not stored long-term)
- Key-Rex does NOT store end-user data permanently

### Data Flow

```
End User → Client Website → Key-Rex Embed Script → Key-Rex API → Lightning Wallet
                                                                    ↓
End User ← Client Website ← xpub identifier ← Key-Rex API ← LNURL-auth callback
```

### Core Concepts

**xpub (Extended Public Key)**
- Deterministic identifier derived from Lightning wallet's public key via SHA256
- Format: `xpub_<32-char-hex-hash>`
- Same wallet always produces same xpub (acts as "username")
- Derived in `lib/auth.ts::deriveXpub()`
- **Critical distinction**: Only Key-Rex customers have stored xpubs; end-user xpubs are temporary

**siteId**
- Unique identifier for each Key-Rex customer account
- Randomly generated string
- Links embed code to customer via `/embed?siteId=<siteId>`

**k1 (Challenge)**
- Random 32-byte hex string for LNURL-auth challenge-response
- 5-minute lifetime (stored in `authSessions` Map)
- Prevents replay attacks

### Storage Architecture

**Current Implementation**: In-memory Maps (`lib/storage.ts`)
- Data lost on server restart
- Designed to be replaced with Vercel KV or database for production
- **Migration path**: Replace functions in `lib/storage.ts` while maintaining same signatures

**Data Structures**:
- `users` - Key-Rex customers only (website owners)
- `usage` - Usage statistics per customer
- `activityLogs` - Activity per customer
- `authSessions` - Temporary (5 min TTL)
- `contactSubmissions` - Contact form data
- `featuredWallets` - Admin-controlled wallet list

### Authentication Flows

**LNURL-auth Protocol** (cryptographic challenge-response):
1. Server generates `k1` challenge and encodes callback URL as bech32 LNURL
2. Wallet decodes LNURL and signs `SHA256(k1)` with private key
3. Wallet calls callback with `sig` and `key` (public key)
4. Server verifies signature (`lib/auth.ts::verifySignature()`)
5. Server derives `xpub` from key
6. Server returns `xpub` to client

**Three Authentication Scenarios**:
1. **Customer Dashboard** (`/dashboard`): WebLN or inline QR → session cookie `user_xpub`
2. **Admin Portal** (`/admin/login`): QR code only → verified against `ADMIN_XPUB` env var → session cookie `admin_session`
3. **End-User Auth** (on client websites): Embed script handles WebLN/popup QR → `window.postMessage` or cookie → `xpub` to client website

## Key Code Patterns and Conventions

### Signature Verification (`lib/auth.ts`)
- Supports compact (64 bytes) and DER-encoded (69-72 bytes) ECDSA signatures
- Primary library: `@noble/secp256k1` for compact signatures
- Fallback library: `elliptic` for DER signatures (Alby wallet compatibility)
- **Critical**: Signs `SHA256(k1)`, not raw k1 (per LNURL-auth spec)
- Handles both compressed (33 bytes) and uncompressed (65 bytes) public keys
- Use `prehash: false` when hash is pre-computed

### Domain Handling (`lib/storage.ts`)
- All domains normalized: lowercase, no protocol/www/trailing slash/port
- Function: `normalizeDomain(domain: string): string`
- Supports exact match or subdomain match
- Test domains (localhost, 127.0.0.1) automatically verified

### API Route Patterns
- Next.js App Router: `app/api/*/route.ts`
- Export named functions: `GET`, `POST`, `OPTIONS`
- Return `NextResponse.json()` for JSON responses
- Handle CORS for cross-origin embed requests
- Session cookies: `user_xpub` (customers), `admin_session` (admin)

### Environment Variables
**Required for Admin Access**:
- `ADMIN_XPUB` - Admin wallet's xpub (obtained from dashboard after first login)

**Optional**:
- `NEXT_PUBLIC_BASE_URL` - Base URL for embed script (auto-detected if not set)
- `NODE_ENV` - Set to `production` for secure cookies and security headers

## Key File Locations

**Core Business Logic**:
- `lib/auth.ts` - Cryptographic functions (signature verification, xpub derivation)
- `lib/storage.ts` - Data storage layer (replace for production)
- `lib/lnurl.ts` - LNURL encoding/decoding
- `lib/admin-auth.ts` - Admin authentication checks

**API Routes**:
- `app/api/auth/` - Authentication endpoints (lnurl, callback, login, logout)
- `app/api/admin/` - Admin-only endpoints
- `app/api/embed/` - Embed script and configuration
- `app/api/domains/` - Domain management

**Pages**:
- `app/dashboard/page.tsx` - Customer dashboard
- `app/admin/dashboard/page.tsx` - Admin portal
- `app/embed/qr/page.tsx` - QR code popup for end-user auth
- `app/onboarding/page.tsx` - New customer onboarding

**Components**:
- `components/LoginButton.tsx` - Primary login component (WebLN + QR)
- `components/OnboardingWizard.tsx` - Multi-step onboarding
- `components/EmbedCode.tsx` - Embed code display/copy

## Important Limitations

**Storage**: In-memory only (development only). For production, must replace `lib/storage.ts` with database implementation (Vercel KV, PostgreSQL, etc.).

**End-User Data**: Key-Rex does NOT store end-user xpubs permanently. Only temporary storage during auth flow (5 minutes). Client websites must manage their own user accounts.

**Wallet Support**: One xpub per wallet. Multi-wallet linking must be handled by client websites. No recovery mechanism if wallet is lost (security-first design).

## Testing Workflow

**Local Integration Testing**:
```bash
# Terminal 1: Start Key-Rex
cd webapp && npm run dev

# Terminal 2: Start demo client site
npm run dev:client
```

Visit `http://localhost:3001` to test the complete authentication flow.

## Production Deployment

**Pre-Launch Checklist**:
1. Replace `lib/storage.ts` with database implementation
2. Set `ADMIN_XPUB` environment variable
3. Configure `NEXT_PUBLIC_BASE_URL`
4. Enable secure cookies (`NODE_ENV=production`)
5. Set up proper CORS configuration
6. Configure rate limiting
7. Set up monitoring and logging

**Vercel Deployment**:
```bash
cd webapp
vercel deploy
```

Security headers are configured in `next.config.js` (CSP, HSTS, X-Frame-Options).
