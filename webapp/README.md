# Key-Rex Webapp

Open source, minimal data collection, Bitcoin-only authentication system.

## Quick Start

```bash
npm install
npm run dev
```

## Admin Portal Setup

To enable admin access, set the `ADMIN_XPUB` environment variable in your `.env.local` file:

```bash
ADMIN_XPUB=xpub_your_admin_wallet_xpub_here
```

The admin xpub should be the xpub derived from your Lightning wallet's authentication key. You can find this by:
1. Logging in to the regular dashboard with your admin wallet
2. Checking your xpub in the dashboard (Settings tab)
3. Copying that xpub value to `ADMIN_XPUB`

Once set, you can access the admin portal at `/admin/login` or via the "Admin" link in the footer.

## Deploy to Vercel

```bash
vercel deploy
```

## License

MIT
