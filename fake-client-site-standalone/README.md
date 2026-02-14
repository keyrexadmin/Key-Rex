# NeuralAPI - Fake Client Site (Standalone)

A realistic, professional demo site showcasing Key-Rex authentication - deployable to its own domain for remote testing.

## Overview

**NeuralAPI** is a fictional premium AI API service platform that demonstrates Key-Rex's value for modern web businesses. This standalone version can be deployed independently for remote demonstrations and testing.

## Setup

### 1. Update Configuration

Open `index.html` and update the configuration at the bottom:

```javascript
// Set your Key-Rex instance URL here
const KEYREX_BASE_URL = 'https://your-keyrex-instance.vercel.app';
const KEYREX_SITE_ID = 'your_site_id_from_keyrex_dashboard';
```

Also update the same `KEYREX_BASE_URL` in `dashboard.html`.

### 2. Deploy to Vercel
   
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




