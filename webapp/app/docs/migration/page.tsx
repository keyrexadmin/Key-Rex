'use client'

import Layout from '@/components/Layout'
import Card from '@/components/Card'
import Link from 'next/link'

const code = 'bg-dark-900 px-1 rounded'

export default function MigrationGuide() {
  return (
    <Layout showNav={true}>
      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Existing Customers: Login Token Migration</h1>
            <p className="text-xl text-white/70 leading-relaxed">
              Required backend change for sites that integrated Key-Rex before the signed login token was introduced.
            </p>
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <p className="text-sm text-orange-200">
                <strong>New to Key-Rex?</strong> You don't need this page. The <Link href="/docs" className="underline hover:text-orange-300">main documentation</Link> already shows the correct integration.
              </p>
            </div>
          </div>

          <Card className="p-8 bg-dark-200/90 border-2 border-red-500/50">
            <h2 className="text-2xl font-bold text-white mb-4">Why this change is required</h2>
            <p className="text-white/300 leading-relaxed mb-4">
              The identifier (<code className={code}>xpub</code>) is derived from a public key. It is <strong>not a secret</strong> and it is the same on every Key-Rex site.
              If your backend creates a session from a bare <code className={code}>xpub</code>, anyone who knows a user's identifier can present it to your backend and be logged in as that user.
            </p>
            <p className="text-white/300 leading-relaxed">
              Key-Rex now sends a short-lived signed login token with every login. Your backend must verify it instead of trusting the raw identifier.
              Raw identifier delivery will be removed on the sunset date announced in your dashboard, after which un-migrated sites will no longer receive an identifier.
            </p>
          </Card>

          <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
            <h2 className="text-2xl font-bold text-white mb-4">Is my site affected?</h2>
            <p className="text-white/300 leading-relaxed mb-4">You are affected if any of these are true:</p>
            <ul className="list-disc list-inside space-y-2 text-white/300 ml-4">
              <li>Your <code className={code}>onSuccess</code> handler sends <code className={code}>xpub</code> to your backend</li>
              <li>Your backend has an endpoint that accepts <code className={code}>xpub</code> and starts a session</li>
              <li>You read <code className={code}>?xpub=</code> from the URL after a mobile redirect</li>
            </ul>
            <p className="text-white/300 mt-4">
              Your users do not need to do anything. They keep the same wallet and the same accounts.
            </p>
          </Card>

          <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
            <h2 className="text-2xl font-bold text-white mb-4">Migration steps</h2>
            <ol className="list-decimal list-inside space-y-3 text-white/200 text-base leading-relaxed">
              <li><strong>Create a nonce per login attempt</strong> on your backend (at least 128 bits of randomness, characters <code className={code}>A-Z a-z 0-9 _ -</code>, 16 to 128 long). Store it in the visitor's pre-login session and set <code className={code}>window.KeyRex.nonce</code> before the user clicks login.</li>
              <li><strong>Send the token, not the xpub.</strong> <code className={code}>onSuccess(xpub, token)</code> now provides a signed JWT as the second argument. Post only the <code className={code}>token</code> to your backend.</li>
              <li><strong>Verify the token</strong> with a standard JOSE library and Key-Rex's public keys at <code className={code}>/.well-known/jwks.json</code> (cache them). Check: ES256 only; <code className={code}>iss</code> is the Key-Rex base URL; <code className={code}>aud</code> is <strong>your own siteId</strong>; not expired; <code className={code}>nonce</code> matches the one you stored (then discard it); <code className={code}>jti</code> not seen before.</li>
              <li><strong>Map existing users.</strong> During the transition the token also carries <code className={code}>legacy_sub</code> (the old xpub). Look up existing accounts by <code className={code}>legacy_sub</code>, then save the token's <code className={code}>sub</code> on the account so future logins match by <code className={code}>sub</code>.</li>
              <li><strong>Create the session</strong> only after steps 3 and 4 succeed.</li>
              <li><strong>Remove the old code.</strong> Delete any endpoint that accepts a bare <code className={code}>xpub</code> and starts a session, and stop reading <code className={code}>?xpub=</code> from the URL.</li>
              <li><strong>Test</strong> that a bare identifier, a token for another site, an expired token, a wrong nonce and a replayed token are all rejected.</li>
              <li><strong>Confirm</strong> in your Key-Rex dashboard that your site no longer shows legacy-flow logins.</li>
            </ol>
          </Card>

          <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
            <h2 className="text-2xl font-bold text-white mb-4">Before and after</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-red-300 mb-2">Before (insecure, remove)</h3>
                <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                  <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`window.KeyRex.onSuccess = function(xpub) {
  fetch('/api/auth/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xpub: xpub })   // anyone can send this
  });
};

// backend
app.post('/api/auth/callback', (req, res) => {
  const user = findOrCreateUser(req.body.xpub);  // trusts a public value
  req.session.userId = user.id;
});`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-green-300 mb-2">After: frontend</h3>
                <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                  <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`// Ask YOUR backend for a fresh nonce (it stores it in the visitor's session)
fetch('/api/keyrex/nonce', { method: 'POST' })
  .then(r => r.json())
  .then(({ nonce }) => { window.KeyRex.nonce = nonce; });

window.KeyRex.onSuccess = function(xpub, token) {
  fetch('/api/auth/keyrex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token })
  });
};`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-green-300 mb-2">After: backend (Node.js, jose)</h3>
                <div className="bg-dark-950 rounded-lg p-4 border border-dark-700 overflow-x-auto">
                  <pre className="text-sm text-white/200 font-mono whitespace-pre-wrap break-words">
{`import crypto from 'crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const KEYREX = process.env.KEYREX_BASE_URL;   // e.g. https://key-rex.com
const SITE_ID = process.env.KEYREX_SITE_ID;   // your own siteId
const jwks = createRemoteJWKSet(new URL(KEYREX + '/.well-known/jwks.json'));

app.post('/api/keyrex/nonce', (req, res) => {
  req.session.keyrexNonce = crypto.randomBytes(24).toString('base64url');
  res.json({ nonce: req.session.keyrexNonce });
});

app.post('/api/auth/keyrex', async (req, res) => {
  try {
    const expected = req.session.keyrexNonce;
    req.session.keyrexNonce = null;           // single use
    const { payload } = await jwtVerify(req.body.token, jwks, {
      issuer: KEYREX,
      audience: SITE_ID,
      algorithms: ['ES256'],
      clockTolerance: 5,
    });
    if (!expected || payload.nonce !== expected) throw new Error('nonce mismatch');
    if (await seenJti(payload.jti)) throw new Error('token replayed');
    await rememberJti(payload.jti, payload.exp);

    // Existing users: match by legacy_sub once, then save sub on the account
    const user = await findOrCreateUserBySub(payload.sub, payload.legacy_sub);
    req.session.userId = user.id;
    res.json({ success: true });
  } catch (e) {
    res.status(401).json({ error: 'Invalid login token' });
  }
});`}
                  </pre>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-8 bg-dark-200/90 border-2 border-orange-500/30">
            <h2 className="text-2xl font-bold text-white mb-4">Extra checks for existing deployments</h2>
            <ul className="list-disc list-inside space-y-2 text-white/300 ml-4">
              <li>Review logs for logins that do not match real wallet activity. A past forgery would show a login with no corresponding Key-Rex login.</li>
              <li>Invalidate existing sessions only if you suspect abuse.</li>
              <li>Never log tokens, and keep them out of URLs where possible.</li>
              <li>Keep your database column for the old xpub until the sunset date, then it can be dropped once every account has a <code className={code}>sub</code>.</li>
            </ul>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
