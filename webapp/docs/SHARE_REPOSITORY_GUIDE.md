# How to Share Your Private GitHub Repository

## Step-by-Step Instructions

### Step 1: Navigate to Your Repository
1. Go to **https://github.com/keyrexadmin/Key-Rex**
2. Make sure you're logged in to your GitHub account (`keyrexadmin`)

---

### Step 2: Open Repository Settings
1. Click on the **"Settings"** tab at the top of your repository page
   - It's located in the horizontal menu bar (Code | Issues | Pull requests | Actions | Projects | Wiki | Security | Insights | **Settings**)
   - You'll only see this if you're the repository owner

---

### Step 3: Access Collaborators Section
1. In the left sidebar menu, scroll down and click on **"Collaborators and teams"**
   - This is under the "Access" section in the Settings menu
   - If you don't see it, make sure you're the repository owner

---

### Step 4: Add a Collaborator
1. Click the green **"Add people"** button (or "Add collaborator" button)
2. A search box will appear
3. Type the **GitHub username** or **email address** of the person you want to invite
   - GitHub will show suggestions as you type
   - Select the correct user from the dropdown

---

### Step 5: Choose Permission Level
1. After selecting the user, you'll see a dropdown menu to choose their permission level:
   
   **Options:**
   - **Read** - Can view and clone the repository, but cannot make changes
   - **Triage** - Can manage issues and pull requests, but cannot push code
   - **Write** - Can push code, create branches, and manage issues/pull requests
   - **Maintain** - Can manage repository settings (except billing and deletion)
   - **Admin** - Full access (can delete repository, manage settings, etc.)

2. **Recommended:** Choose **"Write"** for developers who need to contribute code
   - For reviewers only, use **"Read"** or **"Triage"**
   - For trusted team leads, use **"Maintain"** or **"Admin"**

---

### Step 6: Send Invitation
1. Click **"Add [username] to this repository"** button
2. An invitation email will be sent to the collaborator
3. The collaborator will appear in the "Pending invitations" section until they accept

---

### Step 7: Collaborator Accepts Invitation
1. The collaborator will receive an email notification
2. They can also see the invitation at: **https://github.com/keyrexadmin/Key-Rex/invitations**
3. They need to click **"Accept invitation"** to gain access

---

## Alternative: Using Repository URL (For Quick Sharing)

If you want to share the repository URL for them to request access:

1. Copy the repository URL: **https://github.com/keyrexadmin/Key-Rex**
2. Share it with the person
3. They can visit the URL and click **"Request access"** (if it's private)
4. You'll receive a notification to approve their request

---

## Managing Collaborators

### View Current Collaborators
- Go to **Settings → Collaborators and teams**
- You'll see a list of all current collaborators and their permission levels

### Change Permissions
1. Find the collaborator in the list
2. Click the dropdown next to their name
3. Select a new permission level
4. Click **"Change permission"**

### Remove a Collaborator
1. Find the collaborator in the list
2. Click the **trash icon** (🗑️) or **"Remove"** button next to their name
3. Confirm the removal

---

## Permission Levels Explained

| Permission | Can View | Can Clone | Can Push Code | Can Manage Issues | Can Manage Settings |
|------------|----------|-----------|---------------|-------------------|---------------------|
| **Read** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Triage** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Write** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Maintain** | ✅ | ✅ | ✅ | ✅ | ✅ (limited) |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ (full) |

---

## Security Best Practices

1. **Start with minimal permissions** - Give "Read" or "Write" first, upgrade if needed
2. **Review collaborators regularly** - Remove access for people who no longer need it
3. **Use teams for multiple people** - If sharing with many people, create a GitHub Team
4. **Monitor repository activity** - Check the "Insights" tab to see who's making changes

---

## Troubleshooting

### "I don't see the Settings tab"
- Make sure you're logged in as the repository owner (`keyrexadmin`)
- If you're viewing someone else's repository, you won't see Settings

### "Add people button is grayed out"
- You need to be the repository owner or have Admin permissions
- Check that you're in the correct repository

### "User not found"
- Make sure you're typing the exact GitHub username (case-sensitive)
- Try using their email address instead
- Verify they have a GitHub account

### "Invitation not received"
- Ask them to check their spam folder
- They can view pending invitations at: `https://github.com/YOUR_USERNAME/YOUR_REPO/invitations`
- You can resend the invitation from the Collaborators page

---

## Quick Reference

**Direct link to Collaborators page:**
`https://github.com/keyrexadmin/Key-Rex/settings/access`

**Direct link to Pending Invitations:**
`https://github.com/keyrexadmin/Key-Rex/invitations`

---

**That's it!** Once the collaborator accepts the invitation, they'll have access to your private repository.


