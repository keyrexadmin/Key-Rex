# Temporary Preview Gate

A simple client-side password gate for preview access.

## Current Password

```
keyrex2024
```

## How It Works

- Client-side only (no server, no API, no env vars)
- Uses `sessionStorage` (cleared when browser closes)
- Works in ALL environments (dev, preview, production)
- Simple hardcoded password check

## To Change Password

Edit `components/PreviewGate.tsx` line 12:

```typescript
const PREVIEW_PASSWORD = 'your_new_password_here'
```

## To Remove (When No Longer Needed)

1. Delete `components/PreviewGate.tsx`
2. Remove from `app/layout.tsx`:
   - Remove the import: `import PreviewGate from '@/components/PreviewGate'`
   - Remove the component: `<PreviewGate />`
3. Delete this file: `TEMP_PREVIEW_GATE.md`

That's it! Three simple deletions.
