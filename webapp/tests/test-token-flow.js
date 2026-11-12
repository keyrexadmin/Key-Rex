#!/usr/bin/env node

/**
 * Embedded-login token flow integration tests.
 * Needs a LOCAL server and a DISPOSABLE database:
 *   DATABASE_URL=... KEYREX_URL=http://localhost:3000 node tests/test-token-flow.js
 * Seeds two sites directly in the database through psql.
 */

const crypto = require('crypto')
const { execFileSync } = require('child_process')

const BASE_URL = process.env.KEYREX_URL || 'http://localhost:3000'
const DB = process.env.DATABASE_URL
if (!DB || !/localhost|127\.0\.0\.1/.test(DB)) {
  console.error('Refusing to run: DATABASE_URL must point at a local disposable database')
  process.exit(2)
}
let passed = 0
let failed = 0
function check(name, ok, detail) {
  if (ok) { passed++; console.log(`✅ ${name}`) } else { failed++; console.log(`❌ ${name}${detail ? ` - ${detail}` : ''}`) }
}

function sql(q) {
  return execFileSync('psql', [DB, '-tAc', q]).toString().trim()
}

async function keypair() {
  const secp = await import('@noble/secp256k1')
  const { hashes } = secp
  if (!hashes.sha256) hashes.sha256 = (m) => new Uint8Array(crypto.createHash('sha256').update(m).digest())
  if (!hashes.hmacSha256) hashes.hmacSha256 = (k, m) => new Uint8Array(crypto.createHmac('sha256', k).update(m).digest())
  const priv = crypto.randomBytes(32)
  const key = Buffer.from(secp.getPublicKey(priv, true)).toString('hex')
  return {
    key,
    sign(k1) {
      const msg = crypto.createHash('sha256').update(Buffer.from(k1, 'hex')).digest()
      return Buffer.from(secp.sign(new Uint8Array(msg), priv, { prehash: false })).toString('hex')
    },
  }
}

function seedSite(siteId) {
  const id = crypto.randomBytes(8).toString('hex')
  sql(`INSERT INTO users (id, xpub, "siteId", "freeDisclaimerAccepted", "createdAt") VALUES ('${id}', 'xpub_owner_${id}', '${siteId}', true, ${Date.now()}) ON CONFLICT DO NOTHING`)
}

async function login(wallet, siteId, nonce) {
  const r = await fetch(`${BASE_URL}/api/auth/lnurl?siteId=${siteId}${nonce ? `&nonce=${nonce}` : ''}`, { headers: { origin: 'http://localhost:3001' } })
  const { k1 } = await r.json()
  const res = await fetch(`${BASE_URL}/api/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3001' },
    body: JSON.stringify({ k1, sig: wallet.sign(k1), key: wallet.key, siteId }),
  })
  return { res, body: await res.json().catch(() => ({})), k1 }
}

async function main() {
  const { jwtVerify, createLocalJWKSet } = await import('jose')
  const run = crypto.randomBytes(4).toString('hex')
  const siteA = `siteA${run}`
  const siteB = `siteB${run}`
  seedSite(siteA)
  seedSite(siteB)

  const jwks = createLocalJWKSet(await (await fetch(`${BASE_URL}/.well-known/jwks.json`)).json())
  const alice = await keypair()
  const nonceA = crypto.randomBytes(16).toString('base64url')
  const nonceB = crypto.randomBytes(16).toString('base64url')

  const a = await login(alice, siteA, nonceA)
  check('Login on site A succeeds and returns a token', a.res.status === 200 && !!a.body.token, `status ${a.res.status}`)
  const legacyOff = process.env.KEYREX_LEGACY_XPUB_DELIVERY === 'false' // must match the server's setting
  if (legacyOff) {
    check('Raw identifier is not delivered once legacy delivery is off', !String(a.body.xpub).startsWith('xpub_') && !a.res.headers.get('deprecation'))
  } else {
    check('Deprecation header present while legacy delivery is on', a.res.headers.get('deprecation') === 'true')
  }
  check('identifier alias matches xpub', a.body.identifier === a.body.xpub)

  const { payload: pa } = await jwtVerify(a.body.token, jwks, { audience: siteA })
  check('Token audience is site A', pa.aud === siteA)
  check('Token carries the client nonce', pa.nonce === nonceA)
  check('Token subject is not the raw identifier', pa.sub !== a.body.xpub && !String(pa.sub).startsWith('xpub_'))
  check('Token lifetime is short', pa.exp - pa.iat <= 120)

  let rejected = false
  try { await jwtVerify(a.body.token, jwks, { audience: siteB }) } catch { rejected = true }
  check('Token for site A is rejected by site B (audience mismatch)', rejected)

  const b = await login(alice, siteB, nonceB)
  const { payload: pb } = await jwtVerify(b.body.token, jwks, { audience: siteB })
  check('Same wallet gets a different subject on a different site', pa.sub !== pb.sub)
  check('Different logins get unique jti', pa.jti !== pb.jti)

  // PoC from the disclosure: the bare identifier no longer proves anything to a verifying backend
  let forged = true
  try { await jwtVerify(a.body.xpub, jwks, { audience: siteA }) } catch { forged = false }
  check('Bare identifier is not accepted as a token', !forged)

  const replay = await fetch(`${BASE_URL}/api/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3001' },
    body: JSON.stringify({ k1: a.k1, sig: alice.sign(a.k1), key: alice.key, siteId: siteA }),
  })
  check('Replaying a used k1 is rejected', replay.status === 401, `status ${replay.status}`)

  const wrongSite = await login(alice, siteA, nonceA)
  check('Fresh login still works', wrongSite.res.status === 200)

  const counts = sql(`SELECT "tokenLogins" FROM site_login_flow WHERE "siteId"='${siteA}'`)
  check('Token logins are counted per site', Number(counts) >= 2, `got ${counts}`)

  const noNonce = await login(alice, siteB)
  check('Login without nonce is counted as legacy flow', sql(`SELECT "legacyLogins" FROM site_login_flow WHERE "siteId"='${siteB}'`) === '1' && noNonce.res.status === 200)

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
