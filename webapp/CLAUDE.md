# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Key-Rex (formerly BitPass) is an open-source Bitcoin Lightning Network authentication service that enables passwordless login using Lightning wallets. It acts as a bridge between client websites and end-users through the LNURL-auth protocol.

**Core Philosophy**: Open source (MIT), minimal data collection, Bitcoin-only, free forever, privacy-first.

## Development Commands

### Basic Commands
```bash
npm install          # Install dependencies
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Testing Commands
```bash
npm run test:phase1         # Phase 1 tests
npm run test:phase2         # Phase 2 tests
npm run test:phase2-final   # Phase 2 final tests
npm run test:all            # Run phase1 + phase2-final
npm run test:e2e            # End-to-end tests
npm run test:admin          # Admin portal tests
npm run test:additional     # Additional tests
npm run test:all-automated  # All automated tests
```

### Development Server
```bash
npm run dev:client          # Serve fake client site for testing
```

Test files are located in `/tests/` directory.

## High-Level Architecture

### Dual User Model

**1. Key-Rex Customers (Website Owners)**
- Authenticate with Lightning wallet to get a unique `siteId`
- Access dashboard at `/dashboard` to manage domains and view analytics
- Receive embed code to integrate Key-Rex on their websites
- Each customer identified by `xpub` (derived from their wallet's public key)

**2. End Users (Client Website Visitors)**
- Visit client websites with Key-Rex integration
- Authenticate via Lightning wallet (WebLN or QR code)
- Receive `xpub` identifier that client website uses for user management
- Key-Rex does NOT store end-user data permanently

### Data Flow Architecture

```
End User → Client Website → Key-Rex Embed Script → Key-Rex API → Lightning Wallet
                                                                   ↓
End User ← Client Website ← xpub identifier ← Key-Rex API ← LNURL-auth callback
```

### Core Identifiers

**xpub (Extended Public Key)**
- Deterministic identifier derived from Lightning wallet's public key via SHA256
- Format: `xpub_<32-char-hex-hash>`
- Same wallet always produces same xpub (acts as "username")
- Derivation: `lib/auth.ts::deriveXpub()`
- **Critical**: Only Key-Rex customers (website owners) have stored xpubs; end-user xpubs are temporary

**siteId**
- Unique identifier for each Key-Rex customer account
- Randomly generated string
- Links embed code to customer: `/embed?siteId=<siteId>`

**k1 (Challenge)**
- Random 32-byte hex string for LNURL-auth challenge-response
- 5-minute lifetime (stored in `authSessions` Map)
- Prevents replay attacks

### Authentication Flows

**LNURL-auth Protocol Flow**:
1. Server generates `k1` challenge and encodes callback URL as bech32 LNURL
2. Wallet receives LNURL, decodes it
3. Wallet signs `SHA256(k1)` with private key
4. Wallet calls callback URL with `sig` and `key` (public key)
5. Server verifies signature cryptographically (`lib/auth.ts::verifySignature()`)
6. Server derives `xpub` from `key` (`lib/auth.ts::deriveXpub()`)
7. Server returns `xpub` to client

**Three Authentication Scenarios**:
1. **Customer Dashboard Login** (`/dashboard`): WebLN or inline QR code → session cookie (`user_xpub`)
2. **Admin Portal Login** (`/admin/login`): QR code only → admin session verification against `ADMIN_XPUB` env var → session cookie (`admin_session`)
3. **End-User Authentication** (client websites): Embed script handles WebLN or popup QR → `window.postMessage` or cookie fallback → `xpub` returned to client website

### Storage Architecture

**Current Implementation**: In-memory Maps (development)
- Located in `lib/storage.ts`
- Data lost on server restart
- Designed to be replaced with Vercel KV or database in production

**Data Structures**:
- `users: Map<xpub, User>` - Key-Rex customers only (website owners)
- `usage: Map<siteId, UsageStats>` - Usage statistics per customer
- `featuredWallets: FeaturedWallet[]` - Admin-controlled wallet list
- `activityLogs: Map<xpub, ActivityLog[]>` - Activity per customer
- `contactSubmissions: Map<id, ContactSubmission>` - Contact form data
- `authSessions: Map<k1, {xpub, timestamp}>` - Temporary (5 min TTL)

**User Object Structure**:
```typescript
{
  xpub: string                    // Unique identifier
  siteId: string                  // Site identifier for embed
  allowedDomains: string[]        // Whitelist of domains
  domainVerifications: Map<>      // Domain verification records
  integrationEnabled: boolean     // Global toggle
  freeDisclaimerAccepted: boolean // Terms acceptance
  // ... timestamps, metadata
}
```

**Migration Path**: Replace `lib/storage.ts` functions with database calls while maintaining same function signatures.

## Critical Code Patterns

### Signature Verification (`lib/auth.ts`)
- Supports both compact (64 bytes) and DER-encoded (69-72 bytes) ECDSA signatures
- Primary library: `@noble/secp256k1` for compact signatures
- Fallback library: `elliptic` for DER signatures (Alby compatibility)
- Signs `SHA256(k1)`, not raw k1 (per LNURL-auth spec)
- Handles both compressed (33 bytes) and uncompressed (65 bytes) public keys
- Critical flag: `prehash: false` when hash is pre-computed

### Domain Validation (`lib/storage.ts`)
- All domains normalized: lowercase, no protocol/www/trailing slash, no port
- Function: `normalizeDomain(domain: string): string`
- Matching supports exact match or subdomain match
- Test domains (localhost, 127.0.0.1) automatically verified

### API Route Patterns
- Next.js App Router: `app/api/*/route.ts`
- Export named functions: `GET`, `POST`, `OPTIONS`
- Return `NextResponse.json()` for JSON responses
- Handle CORS for cross-origin embed requests
- Session cookies: `user_xpub` (customers), `admin_session` (admin)

### Client Components
- Use `'use client'` directive for interactivity
- Common patterns: QR code display, WebLN detection, polling for auth completion
- Cross-domain communication: `window.postMessage` (popup → parent), cookie fallback

## Security Considerations

- **Admin Access**: Requires `ADMIN_XPUB` environment variable set to admin wallet's xpub
- **Domain Protection**: API verifies request origin against user's `allowedDomains`
- **Cookie Security**: httpOnly, secure in production, cryptographic signatures
- **Challenge Reuse Prevention**: k1 marked as used after first verification
- **Session Management**: Temporary authSessions (5 min), persistent user sessions (1 year)
- **CSRF Protection**: Origin verification on all API endpoints

## Environment Variables

**Required for Admin Access**:
- `ADMIN_XPUB` - xpub of admin wallet (get from dashboard after first login)

**Optional**:
- `NEXT_PUBLIC_BASE_URL` - Base URL for embed script (auto-detected if not set)
- `NODE_ENV` - Set to `production` for secure cookies and HSTS

## Key File Locations

**Core Logic**:
- `lib/auth.ts` - Cryptographic functions (signature verification, xpub derivation)
- `lib/storage.ts` - Data storage layer (replace for production)
- `lib/lnurl.ts` - LNURL encoding/decoding
- `lib/admin-auth.ts` - Admin authentication checks

**API Routes**:
- `app/api/auth/` - Authentication endpoints (lnurl, callback, login, logout)
- `app/api/admin/` - Admin-only endpoints (require admin session)
- `app/api/embed/` - Embed script and configuration
- `app/api/domains/` - Domain management
- `app/api/user/` - Current user data

**Pages**:
- `app/dashboard/page.tsx` - Customer dashboard
- `app/admin/dashboard/page.tsx` - Admin portal
- `app/embed/qr/page.tsx` - QR code popup for end-user auth
- `app/onboarding/page.tsx` - New customer onboarding wizard

**Components**:
- `components/LoginButton.tsx` - Primary login component (WebLN + QR)
- `components/OnboardingWizard.tsx` - Multi-step onboarding
- `components/EmbedCode.tsx` - Embed code display/copy

## Important Limitations

**Storage**:
- In-memory only (data lost on restart)
- Must migrate to database (Vercel KV, PostgreSQL, etc.) for production
- Not suitable for multi-instance deployments without shared storage

**End-User Data**:
- Key-Rex does NOT store end-user xpubs permanently
- Only temporary storage during auth flow (5 minutes)
- Client websites must store and manage their own user accounts

**Wallet Support**:
- One xpub per wallet (each unique wallet key = unique xpub)
- Multi-wallet linking must be handled by client websites
- No recovery mechanism if wallet is lost (security-first design)

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
vercel deploy
```

Security headers configured in `next.config.js` (CSP, HSTS, X-Frame-Options, etc.)

## Documentation References

- Full project architecture: `docs/PROJECT_OVERVIEW.md`
- Security documentation: `docs/SECURITY_*.md`
- Deployment guide: `docs/DEPLOYMENT.md`
- Testing plans: `docs/*_TESTING_PLAN.md`
