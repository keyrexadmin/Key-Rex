# Fake Client Site (Local Testing)

Example client website for testing Key-Rex authentication locally during development.

## Purpose

This is a simple HTML example site that demonstrates how to integrate Key-Rex authentication into a client website. It runs locally alongside the main Key-Rex webapp for testing purposes.

## Quick Start

From the monorepo root:

```bash
npm run dev:client
```

Or from the webapp directory:

```bash
npm run dev:client
```

This will start a simple HTTP server on port 3001. Visit http://localhost:3001 to see the example site.

## What's Inside

- `index.html` - Main landing page with Key-Rex login button
- `dashboard.html` - Example protected dashboard page

## Testing Workflow

1. Start the main Key-Rex webapp: `cd webapp && npm run dev` (runs on port 3000)
2. Start this fake client site: `npm run dev:client` (runs on port 3001)
3. Visit http://localhost:3001 and test the authentication flow
4. After logging in, you'll be redirected to the dashboard page

## vs. Standalone Version

- **This version**: For local development testing, runs on localhost:3001
- **[Standalone version](../fake-client-site-standalone/)**: For remote testing, can be deployed to Vercel

## Notes

- This is for development/testing only
- No build process required - pure HTML/CSS/JS
- Served by a simple Node.js HTTP server
