# BitPass Deployment Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

### 3. Deploy to Vercel

```bash
vercel deploy
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Project Structure

```
bitpass/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── challenge/route.ts    # Generate LNURL-auth challenge
│   │   │   ├── callback/route.ts      # Handle wallet callback
│   │   │   └── login/route.ts         # WebLN login endpoint
│   │   ├── user/route.ts              # Get current user
│   │   ├── subscribe/route.ts         # Activate subscription (auto-subscribe for free users)
│   │   ├── usage/route.ts             # Get usage statistics
│   │   ├── delete/route.ts            # Delete account
│   │   ├── embed/route.ts             # Serve embed script
│   │   └── verify/route.ts            # Verify login signatures
│   ├── dashboard/page.tsx              # User dashboard
│   ├── onboarding/page.tsx             # New user onboarding
│   ├── open-source/page.tsx            # Open source information
│   ├── embed/
│   │   └── qr/page.tsx                 # QR code fallback page
│   ├── page.tsx                        # Homepage
│   ├── layout.tsx                      # Root layout
│   └── globals.css                     # Global styles
├── components/
│   ├── LoginButton.tsx                 # Login component
│   └── EmbedCode.tsx                  # Embed code generator
├── lib/
│   ├── auth.ts                         # Authentication utilities
│   ├── storage.ts                       # Data storage (in-memory)
│   ├── utils.ts                        # Utility functions
│   └── lnurl.ts                        # LNURL helpers
├── types/
│   └── index.ts                       # TypeScript types
└── Configuration files...

```

## Testing

### Test Authentication Flow

1. Visit the homepage
2. Click "Sign in with BitPass"
3. If you have WebLN (Alby extension), it will prompt for authentication
4. Otherwise, scan the QR code with a Lightning wallet
5. You'll be redirected to the dashboard

### Test Embed Code

1. Sign in to dashboard (accept disclaimer in onboarding wizard)
2. Copy the embed code from the "My Integration Code" tab
3. Paste it into an HTML page
4. The button should appear and work

### Test Usage Counter

1. Usage counter starts at 0 when account is created
2. Each unique login (by pubkey) increments the counter
3. Counters reset monthly (on the 1st)

## Environment Variables

No environment variables required for basic functionality. The app uses:
- In-memory storage (resets on server restart)
- Automatic base URL detection

For production with persistent storage, configure Vercel KV or a database.

## Features

✅ LNURL-auth authentication
✅ WebLN one-tap login
✅ QR code fallback
✅ Master xpub as user ID
✅ Free forever - automatic activation (no subscription required)
✅ Usage tracking (monthly, YTD, all-time)
✅ Branded embed codes (white-label available through custom solutions)
✅ Open source (MIT license)
✅ Minimal data collection
✅ Bitcoin-only

## Notes

- Storage is in-memory and resets on server restart
- For production, replace `lib/storage.ts` with Vercel KV or a database
- Signature verification is simplified - implement proper secp256k1 verification for production
- xpub derivation is simplified - use proper HD wallet derivation for production


