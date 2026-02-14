# NeuralAPI - Fake Client Site (Local Testing)

A realistic, professional demo site showcasing how Key-Rex authentication works in a real-world SaaS application.

## Overview

**NeuralAPI** is a fictional premium AI API service platform that demonstrates Key-Rex's value for modern web businesses. This example shows how passwordless Lightning authentication can power a real SaaS product.

## What Makes This Demo Special

- **Professional Design**: Dark-themed, modern UI that looks like a real SaaS product
- **Realistic Use Case**: AI API service with dashboard, usage tracking, and billing
- **Complete User Journey**: From landing page through authentication to protected dashboard
- **Business Value**: Clearly shows why businesses would choose Key-Rex (instant setup, privacy, Bitcoin-native)

## Quick Start

From the monorepo root:

```bash
# Terminal 1: Start Key-Rex
cd webapp && npm run dev

# Terminal 2: Start demo client site
npm run dev:client
```

Then visit http://localhost:3001

## What's Inside

- **`index.html`** - Professional landing page with feature highlights and auth integration
- **`dashboard.html`** - Realistic API dashboard with keys, usage stats, and account management

## Features Demonstrated

### For Businesses
- ⚡ **Instant user onboarding** - No registration forms or email verification
- 🔒 **Privacy-first** - Zero personal data collection required
- 💎 **Bitcoin-native** - Perfect for crypto/Lightning businesses
- 🚀 **Better UX** - Users authenticate in seconds vs minutes

### Technical Integration
- Clean Key-Rex embed integration
- Success/error handling with notifications
- Session management and protected routes
- Realistic API key management interface
- Usage tracking and billing concepts

## Testing Workflow

1. Start the main Key-Rex webapp: `cd webapp && npm run dev` (port 3000)
2. Start this demo site: `npm run dev:client` (port 3001)
3. Visit http://localhost:3001 to see the landing page
4. Click "Get Started" and authenticate with your Lightning wallet
5. You'll be redirected to a fully-featured dashboard showing what's possible

## vs. Standalone Version

- **This version**: For local development testing, runs on localhost:3001
- **[Standalone version](../fake-client-site-standalone/)**: For remote testing, can be deployed to Vercel

## Design Philosophy

This isn't just a "test page" – it's a compelling demonstration of what businesses can build with Key-Rex. The design and features are intentionally professional to help people visualize the real-world possibilities.

## Notes

- All data and stats are simulated for demo purposes
- No actual API functionality - this is for authentication testing only
- Designed to showcase Key-Rex's value proposition to potential customers
