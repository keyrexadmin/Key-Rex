# Key-Rex Monorepo

This repository now hosts multiple Key-Rex services. The existing Next.js web interface has moved into the webapp workspace so new backend or infrastructure projects can live alongside it.

## Project Layout

- **webapp/** – Next.js frontend (see [webapp/README.md](webapp/README.md) for full details)
- **fake-client-site/** – Example client site for local testing (see [README](fake-client-site/README.md))
- **fake-client-site-standalone/** – Example client site for remote testing/deployment (see [README](fake-client-site-standalone/README.md))

## Quick Start (Webapp)

```bash
cd webapp
npm install
npm run dev
```

## Testing Authentication Flow

To test the authentication flow with an example client site:

```bash
# Terminal 1: Start the main Key-Rex webapp
cd webapp
npm run dev

# Terminal 2: Start the example client site
npm run dev:client
```

Then visit http://localhost:3001 to test the authentication flow.

## Deploy the Webapp to Vercel

```bash
cd webapp
vercel deploy
```

## Deploy Example Client Site

To deploy the standalone example client site for remote testing:

```bash
npm run deploy:client-standalone
```

## License

MIT


