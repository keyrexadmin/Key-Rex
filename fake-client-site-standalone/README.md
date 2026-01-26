# BitPass Fake Client Site

A standalone fake client website for testing the BitPass authentication embed.

## Setup

1. **Update Configuration**
   - Open `index.html`
   - Find the configuration section at the bottom
   - Update `BITPASS_BASE_URL` with your BitPass instance URL (e.g., `https://bitpass.vercel.app`)
   - Update `BITPASS_SITE_ID` with your actual siteId from the BitPass dashboard

2. **Deploy to Vercel**
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
- ✅ Real BitPass embed integration
- ✅ Success/error notifications
- ✅ Works on any domain (cross-origin testing)
- ✅ Easy to delete when done

## Testing

1. Visit your deployed URL
2. Click the BitPass button
3. Test authentication with various wallets
4. Verify success notifications appear

## Notes

- This is a **test site only** - not for production use
- Keep it **private** on Vercel to avoid confusion
- Easy to delete when testing is complete



