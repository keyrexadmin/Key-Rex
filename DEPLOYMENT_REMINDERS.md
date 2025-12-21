# Deployment Reminders

## ⚠️ IMPORTANT: Before Any Public Deployment

**When the user asks to deploy publicly, you MUST:**
1. **STOP and check this checklist first**
2. **Remind the user** about the items below that need to be completed
3. **Do NOT proceed with deployment** until these are confirmed ready

---

## Pre-Deployment Checklist

### GitHub Repository Setup
- [ ] Create a GitHub account (if not already created)
- [ ] Create a public repository for BitPass
- [ ] Push the codebase to the GitHub repository
- [ ] **Update the Open Source page** (`app/open-source/page.tsx`) to replace the placeholder repository link with the actual GitHub repository URL
  - Location: "Repository & License" section
  - Uncomment and update the GitHub link code block

### Security Email Setup
- [ ] Set up a dedicated email address for security vulnerability reports (e.g., security@bitpass.com or security@yourdomain.com)
- [ ] **Update the Open Source page** (`app/open-source/page.tsx`) security disclosure section with the actual security email address
  - Location: "Security & Vulnerabilities" section
  - Uncomment and update the security email code block
- [ ] Consider setting up email forwarding or monitoring for this address

### Final Verification
- [ ] Repository link is live and working on the Open Source page
- [ ] Security email is displayed on the Open Source page
- [ ] LICENSE file is in the repository root
- [ ] All dependencies are properly listed in package.json
- [ ] User has confirmed both items are ready

---

## What to Say When User Requests Deployment

**Template response:**

"Before I proceed with deployment, I need to confirm that the following items are ready:

1. **GitHub Repository**: Do you have a public GitHub repository set up with the BitPass code? If yes, I'll need to update the Open Source page with the repository link.

2. **Security Email**: Do you have a security email address set up (e.g., security@bitpass.com)? If yes, I'll need to update the Open Source page with this email.

These need to be updated on the site before public deployment. Are both of these ready, or do you need help setting them up first?"

