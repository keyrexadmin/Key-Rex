# Pre-Launch Action Plan

## Overview
This document outlines the proper order for completing testing, database setup, GitHub push/sync, and website updates before going live.

---

## Phase 1: Testing (Start Here)
**Status:** Can begin immediately with in-memory storage  
**Duration:** 1-3 days (depending on thoroughness)

### 1.1 Automated Testing
- [ ] Run existing E2E test suites:
  - `test-e2e.js` (main application)
  - `test-admin-e2e.js` (admin dashboard)
- [ ] Review test results and fix any failures
- [ ] Document any test gaps that need manual testing

### 1.2 Manual Testing Checklist
- [ ] **User Authentication Flow**
  - [ ] Sign up with Lightning wallet
  - [ ] Login with existing wallet
  - [ ] QR code fallback on mobile
  - [ ] QR code popup on desktop
  - [ ] WebLN integration with Alby/Phoenix/Zeus

- [ ] **Dashboard Functionality**
  - [ ] View integration code
  - [ ] Copy siteId
  - [ ] View analytics (if any data exists)
  - [ ] Settings page
  - [ ] Onboarding wizard flow

- [ ] **Admin Portal**
  - [ ] Admin login with correct xpub
  - [ ] Admin dashboard stats
  - [ ] User management (if applicable)
  - [ ] Contact form submissions

- [ ] **Embed Script on Fake Client Site**
  - [ ] Button renders correctly
  - [ ] Authentication works
  - [ ] Success/error callbacks fire
  - [ ] Featured wallets display and link correctly

- [ ] **Cross-Browser Testing**
  - [ ] Chrome/Edge
  - [ ] Firefox
  - [ ] Safari (if available)
  - [ ] Mobile browsers

- [ ] **Responsive Design**
  - [ ] Mobile view (< 640px)
  - [ ] Tablet view (640px - 1024px)
  - [ ] Desktop view (> 1024px)

### 1.3 Testing Notes
- Use in-memory storage for now (data resets on server restart)
- Document any bugs or issues found
- Prioritize critical path issues (authentication, dashboard access)

---

## Phase 2: Database Setup
**Status:** Begin after Phase 1 testing is complete  
**Duration:** 1-2 hours (setup) + testing time

### 2.1 Choose Database Provider
**Recommended Options:**
- **Vercel KV** (Redis-like) - Easiest if already on Vercel
- **Supabase** (PostgreSQL) - Free tier, good for structured data
- **PlanetScale** (MySQL) - Serverless, good scaling
- **Railway** (PostgreSQL/MySQL) - Simple setup

### 2.2 Database Setup Steps
1. **Sign up for chosen provider**
   - Create account
   - Create new database/project
   - Note connection credentials

2. **Update Environment Variables**
   - Add database connection string to `.env.local`
   - Add to Vercel environment variables for production
   - **DO NOT commit credentials to GitHub**

3. **Update Code**
   - Replace `lib/storage.ts` in-memory functions with database calls
   - Test database connection
   - Verify data persistence across server restarts

4. **Migration Testing**
   - Test user creation in database
   - Test data retrieval
   - Test analytics storage
   - Test contact form submissions
   - Verify data persists after server restart

### 2.3 Database Testing Checklist
- [ ] User data persists after server restart
- [ ] SiteId remains valid after restart
- [ ] Analytics data is stored correctly
- [ ] Contact form submissions are saved
- [ ] Admin can access all data
- [ ] No data loss during deployment

---

## Phase 3: GitHub Push/Sync
**Status:** Begin after Phase 2 (database) is complete  
**Duration:** 30-60 minutes

### 3.1 Pre-Push Checklist
- [ ] All code changes are committed locally
- [ ] `.env.local` is in `.gitignore` (verify no secrets are committed)
- [ ] `node_modules/` is in `.gitignore`
- [ ] `.next/` is in `.gitignore`
- [ ] Database credentials are NOT in code
- [ ] README.md is updated with setup instructions
- [ ] LICENSE file exists (MIT License)

### 3.2 GitHub Setup Steps
1. **Initialize Git (if not already done)**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Key-Rex application"
   ```

2. **Connect to GitHub Repository**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

3. **Verify Repository**
   - [ ] Code is visible on GitHub
   - [ ] All files are present
   - [ ] No sensitive data is visible
   - [ ] README displays correctly

### 3.3 Post-Push Verification
- [ ] Repository is private (as requested)
- [ ] All branches are synced
- [ ] `.gitignore` is working correctly
- [ ] No environment variables are exposed

---

## Phase 4: Website Updates (Support Email & GitHub Links)
**Status:** Begin after Phase 3 (GitHub) is complete  
**Duration:** 30-45 minutes

### 4.1 Update Support Email
**File:** `app/support/page.tsx`

**Changes Needed:**
- [ ] Add `support@keyrex.com` (or your domain) to contact information
- [ ] Update any email references in the support page
- [ ] Verify contact form sends to correct email (if backend configured)

**Locations to Update:**
- Support page contact section
- Footer (if email is shown there)
- Any "Contact Us" links

### 4.2 Update Open Source Page with GitHub Link
**File:** `app/open-source/page.tsx`

**Changes Needed:**
- [ ] Remove placeholder note about repository link
- [ ] Add actual GitHub repository URL
- [ ] Update "View on GitHub" link (currently commented out around line 243)
- [ ] Verify LICENSE file reference is correct

**Specific Code to Update:**
```tsx
// Remove this placeholder:
<div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mt-3">
  <p className="text-yellow-200 text-xs">
    <strong>Note:</strong> Repository link will be added when the GitHub repository is created...
  </p>
</div>

// Uncomment and update this:
<a
  href="https://github.com/YOUR_USERNAME/YOUR_REPO_NAME"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 font-medium text-sm mt-2"
>
  <span>View on GitHub</span>
  <span>→</span>
</a>
```

### 4.3 Additional Updates to Consider
- [ ] Update README.md with GitHub repository link
- [ ] Add GitHub link to footer (optional)
- [ ] Update any documentation that references the repository
- [ ] Verify all links work correctly

### 4.4 Testing After Updates
- [ ] Support email is visible and correct
- [ ] GitHub link works and opens correct repository
- [ ] All links are accessible
- [ ] No broken references

---

## Summary: Recommended Order

1. **Phase 1: Testing** (1-3 days)
   - Start immediately
   - Use in-memory storage
   - Document all issues

2. **Phase 2: Database Setup** (1-2 hours + testing)
   - Begin after testing is complete
   - Set up persistent storage
   - Verify data persistence

3. **Phase 3: GitHub Push/Sync** (30-60 minutes)
   - Begin after database is working
   - Push code to GitHub
   - Verify repository is set up correctly

4. **Phase 4: Website Updates** (30-45 minutes)
   - Begin after GitHub is ready
   - Add support email
   - Add GitHub repository links
   - Final verification

---

## Important Notes

### Security Checklist
- [ ] No API keys in code
- [ ] No database credentials in code
- [ ] `.env.local` is in `.gitignore`
- [ ] Environment variables are set in Vercel
- [ ] Repository is private until ready for public

### Before Going Live
- [ ] All testing is complete
- [ ] Database is set up and tested
- [ ] GitHub repository is ready
- [ ] Support email is configured and working
- [ ] GitHub links are live and correct
- [ ] Vercel deployment is working
- [ ] Domain is connected (if applicable)

### Rollback Plan
- Keep a backup of working code before major changes
- Test database migrations on a copy first
- Have a plan to revert if issues arise

---

## Questions to Answer Before Starting

1. **Database Choice:** Which provider will you use? (Vercel KV, Supabase, PlanetScale, Railway)
2. **GitHub Username:** What is your GitHub username?
3. **Repository Name:** What is the exact repository name?
4. **Support Email:** What is the support email address? (e.g., `support@keyrex.com`)
5. **Public vs Private:** When will the repository be made public?

---

## Next Steps

1. Review this plan
2. Answer the questions above
3. Begin Phase 1: Testing
4. Proceed through phases in order
5. Update this document as you complete each phase

