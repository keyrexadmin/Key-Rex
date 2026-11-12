# NeuralAPI - Fake Client Site (Standalone)

A realistic, professional demo site showcasing Key-Rex authentication - deployable to its own domain for remote testing.

## Overview

**NeuralAPI** is a fictional premium AI API service platform that demonstrates Key-Rex's value for modern web businesses. This standalone version can be deployed independently for remote demonstrations and testing.

## Quick Deploy to Vercel

This site is **pre-configured** to work with `https://keyrex-preview.vercel.app`.

### Deploy Now

```bash
cd fake-client-site-standalone
vercel --prod
```

That's it! The site will work immediately with your deployed Key-Rex instance.

## Configuration

The site is already configured in `index.html`:

```javascript
const KEYREX_BASE_URL = 'https://keyrex-preview.vercel.app';
const KEYREX_SITE_ID = 'a252dfa1030706a49efab31af2fc29d6';
```

### To Use a Different Key-Rex Instance

1. Open `index.html` and update:
   ```javascript
   const KEYREX_BASE_URL = 'https://your-instance.vercel.app';
   const KEYREX_SITE_ID = 'your_site_id';
   ```

2. Open `dashboard.html` and update:
   ```javascript
   const KEYREX_BASE_URL = 'https://your-instance.vercel.app';
   ```

3. Redeploy: `vercel --prod`

### Backend environment variables (required)

The site includes serverless functions in `api/` that verify the Key-Rex login token. Set these in Vercel:

- `SESSION_SECRET` - random string, 32+ characters (signs the session and nonce cookies). Generate with `openssl rand -base64 48`.
- `KEYREX_BASE_URL` - your Key-Rex instance URL (same as in `index.html`).
- `KEYREX_SITE_ID` - your site ID (same as in `index.html`).

Without `SESSION_SECRET` every login is rejected.

Login flow: the page gets a nonce from `/api/keyrex/nonce`, `onSuccess(xpub, token)` posts only the token to `/api/auth/keyrex`, and the function verifies it (ES256, issuer, audience = your site ID, expiry, nonce) before setting a signed session cookie. Run `npm test` in this folder to check the rejection cases.

This demo is stateless, so it does not track used `jti` values; the single-use nonce cookie and 60 second token lifetime prevent replay. A production site should also store used `jti` values.

## Setup (Alternative Methods)
   
   From the monorepo root:
   ```bash
   npm run deploy:client-standalone
   ```
   
   Or from this directory:
   ```bash
   # Install Vercel CLI if needed
   npm i -g vercel
   
   # Deploy (make it private)
   vercel --prod
   ```
   
   Or use the Vercel dashboard:
   - Import this folder as a new project
   - Set it to **Private** (not public)
   - Deploy

3. **Access Your Test Site**
   - Vercel will give you a URL like `https://fake-client-site-xxxxx.vercel.app`
   - This is your test site URL

## Features

- ✅ Standalone HTML file (no build process needed)
- ✅ Real Key-Rex embed integration
- ✅ Success/error notifications
- ✅ Works on any domain (cross-origin testing)
- ✅ Easy to delete when done
- ✅ Independent Vercel deployment

## Testing

1. Visit your deployed URL
2. Click the Key-Rex login button
3. Test authentication with various wallets
4. Verify success notifications appear

## vs. Local Version

- **This version**: For remote testing, deployed to Vercel
- **[Local version](../fake-client-site/)**: For local development, runs on localhost:3001

## Notes

- This is a **test site only** - not for production use
- Keep it **private** on Vercel to avoid confusion
- Easy to delete when testing is complete
- Can be deployed independently from the main Key-Rex webapp




