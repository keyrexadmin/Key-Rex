# Deployment Instructions

## Quick Deploy to Vercel

### Option 1: Using Vercel Dashboard (Easiest)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com
   - Sign in (or create account)

2. **Import Project**
   - Click "Add New..." → "Project"
   - Click "Import Git Repository" OR "Browse" to upload this folder
   - If using Git: Connect your repo and select this folder
   - If uploading: Drag and drop the `fake-client-site-standalone` folder

3. **Configure Project**
   - Framework Preset: **Other** (or leave as default)
   - Root Directory: `./` (or leave blank)
   - Build Command: (leave empty - it's static HTML)
   - Output Directory: (leave empty)

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete

5. **Make it Private**
   - Go to your project settings
   - Settings → General → Visibility
   - Change to **Private**
   - Save

6. **Get Your URL**
   - Your site will be at: `https://fake-client-site-standalone-xxxxx.vercel.app`
   - Copy this URL

7. **Update BitPass URL (if needed)**
   - If your BitPass is deployed, update `BITPASS_BASE_URL` in `index.html`
   - Redeploy (Vercel auto-deploys on git push, or manually redeploy)

### Option 2: Using Vercel CLI

```bash
# 1. Install Vercel CLI (if not installed)
npm i -g vercel

# 2. Navigate to the project folder
cd fake-client-site-standalone

# 3. Login to Vercel
vercel login

# 4. Deploy
vercel --prod

# 5. Follow the prompts:
#    - Set up and deploy? Yes
#    - Which scope? (select your account)
#    - Link to existing project? No
#    - Project name? fake-client-site (or any name)
#    - Directory? ./
#    - Override settings? No

# 6. After deployment, make it private:
#    - Go to vercel.com dashboard
#    - Find your project
#    - Settings → General → Visibility → Private
```

## After Deployment

1. **Test the site**
   - Visit your Vercel URL
   - You should see the fake client site with BitPass embed

2. **Update BitPass URL (if testing against production)**
   - Edit `index.html`
   - Change `BITPASS_BASE_URL` to your deployed BitPass URL
   - Commit and push (or redeploy manually)

3. **Test Authentication**
   - Click the BitPass button
   - Test with various wallets
   - Verify success notifications work

## Troubleshooting

- **BitPass card not showing?**
  - Check browser console for errors
  - Verify `BITPASS_BASE_URL` is correct
  - Verify `BITPASS_SITE_ID` is correct
  - Make sure your BitPass instance is accessible

- **CORS errors?**
  - Make sure your BitPass instance allows requests from your Vercel domain
  - Check BitPass CORS settings

- **404 errors?**
  - Verify the BitPass URL is correct
  - Make sure the `/embed` route exists on your BitPass instance



