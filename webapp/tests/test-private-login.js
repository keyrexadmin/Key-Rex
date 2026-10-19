#!/usr/bin/env node

/**
 * Private login mode (per-site login domain) integration tests.
 * Needs a LOCAL server and a DISPOSABLE database:
 *   DATABASE_URL=postgresql://...@localhost/... KEYREX_URL=http://localhost:3000 node tests/test-private-login.js
 * Seeds sites directly through psql and plays the wallet. Requests to the login domain are sent
 * to the local server with a Host header of auth.localhost.
 */

const crypto = require('crypto')
const http = require('http')
const { execFileSync } = require('child_process')

const BASE = new URL(process.env.KEYREX_URL || 'http://localhost:3000')
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
const sql = (q) => execFileSync('psql', [DB, '-tAc', q]).toString().trim()

// Request with an arbitrary Host header (fetch cannot set it)
function request(path, { host, method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: BASE.hostname, port: BASE.port, path, method, headers: { host: host || BASE.host, ...headers } },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          let json = {}
          try { json = JSON.parse(data) } catch {}
          resolve({ status: res.statusCode, json, headers: res.headers })
        })
      }
    )
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function noble() {
  const secp = await import('@noble/secp256k1')
  const { hashes } = secp
  if (!hashes.sha256) hashes.sha256 = (m) => new Uint8Array(crypto.createHash('sha256').update(m).digest())
  if (!hashes.hmacSha256) hashes.hmacSha256 = (k, m) => new Uint8Array(crypto.createHmac('sha256', k).update(m).digest())
  return secp
}

function wallet(secp) {
  const priv = crypto.randomBytes(32)
  const key = Buffer.from(secp.getPublicKey(priv, true)).toString('hex')
  return {
    key,
    sign: (k1) => Buffer.from(secp.sign(new Uint8Array(crypto.createHash('sha256').update(Buffer.from(k1, 'hex')).digest()), priv, { prehash: false })).toString('hex'),
  }
}

function seedSite(siteId, { mode, host }) {
  const id = crypto.randomBytes(8).toString('hex')
  sql(`INSERT INTO users (id, xpub, "siteId", "freeDisclaimerAccepted", "loginMode", "createdAt") VALUES ('${id}', 'xpub_owner_${id}', '${siteId}', true, '${mode}', ${Date.now()})`)
  if (host) {
    sql(`INSERT INTO login_domains ("siteId", host, status, "createdAt", "verifiedAt") VALUES ('${siteId}', '${host}', 'active', ${Date.now()}, ${Date.now()})`)
  }
}

const ORIGIN = { origin: 'http://localhost:3001' }

async function main() {
  const secp = await noble()
  const { jwtVerify, createLocalJWKSet } = await import('jose')
  const run = crypto.randomBytes(4).toString('hex')
  const privSite = `priv${run}`
  const stdSite = `std${run}`
  const loginHost = `auth${run}.localhost`
  seedSite(privSite, { mode: 'private', host: loginHost })
  seedSite(stdSite, { mode: 'standard' })
  const jwks = createLocalJWKSet((await request('/.well-known/jwks.json')).json)
  const nonce = crypto.randomBytes(16).toString('base64url')
  const alice = wallet(secp)

  // Standard sites are unchanged
  let r = await request(`/api/auth/lnurl?siteId=${stdSite}&nonce=${nonce}`, { headers: ORIGIN })
  check('Standard site: callback stays on the primary host', r.status === 200 && new URL(r.json.callback).host === BASE.host && !r.json.login_domain)

  // Private mode needs a nonce
  r = await request(`/api/auth/lnurl?siteId=${privSite}`, { headers: ORIGIN })
  check('Private site: nonce is required', r.status === 400)

  // Private issuance
  r = await request(`/api/auth/lnurl?siteId=${privSite}&nonce=${nonce}`, { headers: ORIGIN })
  const cb = new URL(r.json.callback)
  const k1 = r.json.k1
  check('Private site: LNURL callback is on the login domain', r.status === 200 && cb.hostname === loginHost && r.json.login_domain === loginHost)
  check('Private site: callback carries no siteId parameter', !cb.searchParams.has('siteId'))
  const entropy = sql(`SELECT entropy FROM auth_challenges WHERE k1='${k1}'`)
  const expectedK1 = crypto.createHash('sha256').update(`keyrex-k1|${privSite}|${nonce}|${entropy}`).digest('hex')
  check('k1 is derived from the site nonce', k1 === expectedK1)

  const walletUrl = `${cb.pathname}?tag=login&k1=${k1}&sig=${alice.sign(k1)}&key=${alice.key}`

  // Redeeming on the wrong host must fail and must not burn the challenge
  r = await request(walletUrl)
  check('Challenge cannot be redeemed on the primary host', r.status === 401, `status ${r.status}`)
  r = await request(walletUrl, { host: `other${run}.localhost` })
  check('Challenge cannot be redeemed on an unrelated host', r.status === 401, `status ${r.status}`)
  r = await request(`/api/verify`, { method: 'POST', headers: { 'content-type': 'application/json', ...ORIGIN }, body: JSON.stringify({ k1, sig: alice.sign(k1), key: alice.key, siteId: privSite }) })
  check('/api/verify rejects a private-mode challenge', r.status === 401, `status ${r.status}`)

  // siteId must not contradict the host
  r = await request(`${walletUrl}&siteId=${stdSite}`, { host: loginHost })
  check('siteId that contradicts the login domain is rejected', r.status === 400, `status ${r.status}`)

  // Wallet logs in on the login domain
  r = await request(walletUrl, { host: loginHost })
  check('Wallet login on the login domain succeeds', r.status === 200 && r.json.status === 'OK', `status ${r.status}`)
  check('Wallet response does not echo an identifier', !('xpub' in r.json))
  r = await request(walletUrl, { host: loginHost })
  check('Replay on the login domain is rejected', r.status === 401)

  // Token retrieval only from the primary host
  r = await request(`/api/auth/callback?k1=${k1}`, { host: loginHost })
  check('No token is retrievable from the login domain', r.status === 200 && !r.json.token && !r.json.xpub)
  r = await request(`/api/auth/callback?k1=${k1}&siteId=${privSite}`, { headers: ORIGIN })
  check('Token retrieved from the primary host', r.status === 200 && !!r.json.token, `status ${r.status}`)

  const { payload } = await jwtVerify(r.json.token, jwks, { audience: privSite })
  check('Token is version 2 with the login domain', payload.ver === 2 && payload.login_domain === loginHost)
  check('Subject is the per-site linking key', payload.sub === alice.key && r.json.identifier === alice.key)
  check('No global identifier in the token', !payload.legacy_sub)
  check('Token carries the client nonce', payload.nonce === nonce)

  // Site-side receipt verification: recompute k1 and check the wallet signature
  const rc = payload.receipt
  const recomputed = crypto.createHash('sha256').update(`keyrex-k1|${privSite}|${nonce}|${rc.entropy}`).digest('hex')
  const msg = crypto.createHash('sha256').update(Buffer.from(rc.k1, 'hex')).digest()
  check('Receipt k1 matches the site nonce derivation', rc.k1 === recomputed)
  check('Receipt signature verifies against the subject', secp.verify(Buffer.from(rc.sig, 'hex'), new Uint8Array(msg), Buffer.from(payload.sub, 'hex'), { prehash: false }))
  check('Receipt with a different nonce would not match', rc.k1 !== crypto.createHash('sha256').update(`keyrex-k1|${privSite}|other${nonce}|${rc.entropy}`).digest('hex'))

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
