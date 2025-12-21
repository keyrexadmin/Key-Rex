# GitHub Setup Steps for Key-Rex

**Current Status:** Not yet initialized as a git repository

---

## Prerequisites

✅ You have a GitHub account  
✅ You have created a blank repository on GitHub  

---

## Step-by-Step Instructions

### 1. Get Your GitHub Repository URL

From your GitHub repository page, copy the repository URL. It will look like:
- `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git` (HTTPS)
- `git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git` (SSH)

**Note:** Use HTTPS if you're not sure, or SSH if you have SSH keys set up.

---

### 2. Initialize Git and Push to GitHub

Run these commands in your terminal (in the project directory):

```bash
# Initialize git repository
git init

# Add all files (respecting .gitignore)
git add .

# Create initial commit
git commit -m "Initial commit: Key-Rex authentication platform"

# Add your GitHub repository as remote (replace with your actual URL)
# For HTTPS:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# OR for SSH:
# git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub (main branch)
git branch -M main
git push -u origin main
```

---

## Important: Before Pushing

### ✅ Verify .gitignore is Working

The `.gitignore` file should exclude:
- `.env` files (environment variables)
- `node_modules/` (dependencies)
- `.next/` (Next.js build files)
- `.vercel/` (Vercel config)

**Your `.gitignore` looks good!** It includes all necessary exclusions.

### ⚠️ Never Commit These Files

**NEVER commit:**
- `.env` or `.env.local` (contains secrets like `COOKIE_SECRET`)
- `node_modules/` (too large, install via `npm install`)
- `.next/` (build files, regenerated)
- Personal API keys or secrets

---

## If You Need to Set Up SSH Keys (Optional)

If you want to use SSH instead of HTTPS:

1. **Generate SSH key:**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. **Add SSH key to ssh-agent:**
   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519
   ```

3. **Copy public key:**
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

4. **Add to GitHub:**
   - Go to GitHub Settings → SSH and GPG keys
   - Click "New SSH key"
   - Paste your public key

---

## After Pushing

### Verify Your Push

1. Go to your GitHub repository page
2. You should see all your files
3. Check that sensitive files (`.env`, `node_modules`) are NOT visible

### Next Steps

1. **Set repository to private** (if desired):
   - Go to Settings → General
   - Scroll to "Danger Zone"
   - Click "Change visibility" → "Make private"

2. **Add a README** (if you want):
   - Create `README.md` in the repository
   - Describe your project

3. **Set up branch protection** (recommended):
   - Go to Settings → Branches
   - Add rule for `main` branch
   - Require pull requests for changes

---

## Troubleshooting

### If push fails with authentication error:

**For HTTPS:**
- GitHub requires a Personal Access Token (PAT) instead of password
- Generate one: GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
- Use token as password when prompted

**For SSH:**
- Make sure your SSH key is added to GitHub
- Test connection: `ssh -T git@github.com`

### If you want to change the remote URL:

```bash
# Check current remote
git remote -v

# Change remote URL
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

---

## Quick Command Reference

```bash
# Initialize
git init
git add .
git commit -m "Initial commit: Key-Rex authentication platform"

# Add remote (replace with your URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push
git branch -M main
git push -u origin main
```

---

**Ready to push?** Just run the commands above, replacing `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual values!

