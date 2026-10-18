#!/usr/bin/env node

/**
 * k1 challenge hardening tests
 *
 * Run against a LOCAL server with a disposable database:
 *   KEYREX_URL=http://localhost:3000 node tests/test-auth-challenge.js
 *
 * Verifies: unissued k1 rejected, k1 single use (replay rejected), expired/unknown k1 rejected,
 * forged auth_k1_* cookie not accepted by set-session, derive-xpub removed.
 */

const crypto = require('crypto')

const BASE_URL = process.env.KEYREX_URL || 'http://localhost:3000'
let passed = 0
let failed = 0

function check(name, ok, detail) {
  if (ok) {
    passed++
    console.log(`✅ ${name}`)
  } else {
    failed++
    console.log(`❌ ${name}${detail ? ` - ${detail}` : ''}`)
  }
}

async function signLogin(k1) {
  const secp = await import('@noble/secp256k1')
  const { hashes } = secp
  if (!hashes.sha256) hashes.sha256 = (m) => new Uint8Array(crypto.createHash('sha256').update(m).digest())
  const priv = crypto.randomBytes(32)
  const pub = secp.getPublicKey(priv, true)
  const msg = crypto.createHash('sha256').update(Buffer.from(k1, 'hex')).digest()
  const sig = secp.sign(new Uint8Array(msg), priv, { prehash: false })
  return { sig: Buffer.from(sig).toString('hex'), key: Buffer.from(pub).toString('hex') }
}

function callbackUrl(k1, sig, key) {
  return `${BASE_URL}/api/auth/callback?tag=login&k1=${k1}&sig=${sig}&key=${key}`
}

async function main() {
  // 1. A validly signed k1 that Key-Rex never issued must be rejected
  const forgedK1 = crypto.randomBytes(32).toString('hex')
  const forged = await signLogin(forgedK1)
  let res = await fetch(callbackUrl(forgedK1, forged.sig, forged.key))
  check('Signed but unissued k1 is rejected', res.status === 401, `status ${res.status}`)

  // 2. Issued k1 works once, then replay is rejected
  const issued = await (await fetch(`${BASE_URL}/api/auth/lnurl`)).json()
  check('LNURL endpoint issues a k1', /^[0-9a-f]{64}$/i.test(issued.k1 || ''))
  const login = await signLogin(issued.k1)
  res = await fetch(callbackUrl(issued.k1, login.sig, login.key))
  check('First use of issued k1 succeeds', res.ok, `status ${res.status}`)
  res = await fetch(callbackUrl(issued.k1, login.sig, login.key))
  check('Replay of the same (k1, sig, key) is rejected', res.status === 401, `status ${res.status}`)

  // 3. /api/verify and /api/auth/login also reject replays / unissued k1
  const other = await signLogin(forgedK1)
  res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ k1: forgedK1, sig: other.sig, key: other.key }),
  })
  check('/api/auth/login rejects unissued k1', res.status === 401, `status ${res.status}`)

  // 4. A forged auth_k1_* cookie must not grant a session
  const victim = 'xpub_' + crypto.randomBytes(16).toString('hex')
  const fakeK1 = crypto.randomBytes(32).toString('hex')
  res = await fetch(`${BASE_URL}/api/auth/set-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `auth_k1_${fakeK1.substring(0, 16)}=${victim}`,
    },
    body: JSON.stringify({ xpub: victim, k1: fakeK1 }),
  })
  check('Forged auth_k1 cookie rejected by set-session', res.status === 401, `status ${res.status}`)

  // 5. derive-xpub endpoint is gone
  res = await fetch(`${BASE_URL}/api/auth/derive-xpub`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: login.key }),
  })
  check('derive-xpub endpoint removed', res.status === 404, `status ${res.status}`)

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
