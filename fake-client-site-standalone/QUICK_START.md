# Quick Start - Deploy in 5 Minutes

> **Required:** this site now verifies Key-Rex login tokens server-side. Set a `SESSION_SECRET`
> environment variable (long random string) in Vercel before deploying. "BitPass" below refers to
> the Key-Rex instance. See `README.md`.

## ✅ Pre-Deployment Checklist

- [x] SiteId configured: `b5a919db0da9a360818ff90c869faca5`
- [ ] BitPass URL configured (currently set to `http://localhost:3000` - change if needed)
- [ ] Vercel account ready

## 🚀 Deploy Now (Choose One Method)

### Method 1: Vercel Dashboard (Recommended - No CLI needed)

1. **Open Vercel Dashboard**
   - Go to: https://vercel.com/new
   - Sign in with GitHub/GitLab/Bitbucket

2. **Import This Folder**
   - Click "Browse" or drag and drop the `fake-client-site-standalone` folder
   - OR if you have it in Git: Import Git Repository

3. **Configure**
   - Framework: **Other** (or "Static Site")
   - Root Directory: Leave blank (or `./`)
   - Build Command: Leave blank
   - Output Directory: Leave blank
   - Install Command: Leave blank

4. **Deploy**
   - Click "Deploy"
   - Wait ~30 seconds

5. **Make Private**
   - Click on your project name
   - Go to Settings → General
   - Scroll to "Visibility"
   - Change to **Private**
   - Click "Save"

6. **Done!**
   - Your site URL: `https://fake-client-site-xxxxx.vercel.app`
   - Visit it to test

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to project
cd fake-client-site-standalone

# Deploy
vercel --prod

# Follow prompts, then make it private in dashboard
```

## 🔧 Update BitPass URL (If Needed)

If your BitPass is deployed (not localhost), edit `index.html`:

```javascript
// Change this line:
const BITPASS_BASE_URL = 'http://localhost:3000';

// To your deployed URL, e.g.:
const BITPASS_BASE_URL = 'https://bitpass.vercel.app';
```

Then redeploy (Vercel auto-deploys on git push, or click "Redeploy" in dashboard).

## ✅ Test

1. Visit your Vercel URL
2. You should see the fake client site
3. Click BitPass button
4. Test authentication
5. Verify success notification appears

## 🗑️ Delete When Done

- Go to Vercel dashboard
- Project Settings → Delete Project
- Confirm deletion

That's it! Your test site is ready.



