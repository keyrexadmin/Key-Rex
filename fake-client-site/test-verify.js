// Verifies the demo backend rejects forged logins and accepts valid tokens.
// Uses a mock Key-Rex that only serves a JWKS. Run: node test-verify.js
const http = require('http')
const { spawn } = require('child_process')

const SITE_ID = 'test-site-id'
const KEYREX_PORT = 3910
const CLIENT_PORT = 3911
const KEYREX = 'http://localhost:' + KEYREX_PORT
const CLIENT = 'http://localhost:' + CLIENT_PORT

let failures = 0
function check(name, ok) {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name)
  if (!ok) failures++
}

async function post(path, body, cookie) {
  const res = await fetch(CLIENT + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body || {}),
  })
  const setCookie = res.headers.get('set-cookie')
  return { status: res.status, body: await res.json(), cookie: setCookie ? setCookie.split(';')[0] : cookie }
}

async function main() {
  const jose = await import('jose')
  const { publicKey, privateKey } = await jose.generateKeyPair('ES256')
  const jwk = { ...(await jose.exportJWK(publicKey)), kid: 'k1', alg: 'ES256', use: 'sig' }
  const other = await jose.generateKeyPair('ES256')

  const mock = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ keys: [jwk] }))
  })
  await new Promise((r) => mock.listen(KEYREX_PORT, r))

  const server = spawn(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: CLIENT_PORT, KEYREX_BASE_URL: KEYREX, KEYREX_SITE_ID: SITE_ID },
    stdio: 'ignore',
  })
  await new Promise((r) => setTimeout(r, 800))

  const sign = (claims, opts = {}) =>
    new jose.SignJWT(claims)
      .setProtectedHeader({ alg: 'ES256', kid: opts.kid || 'k1' })
      .setIssuer(opts.iss || KEYREX)
      .setAudience(opts.aud || SITE_ID)
      .setSubject('sub-alice')
      .setIssuedAt()
      .setExpirationTime(opts.exp || '60s')
      .setJti(opts.jti || crypto.randomUUID())
      .sign(opts.key || privateKey)

  try {
    // Attack: bare identifier, no token
    let s = await post('/api/keyrex/nonce')
    let r = await post('/api/auth/keyrex', { xpub: 'xpub_e03f16d69cb3111f675b6f9be7ddcfde' }, s.cookie)
    check('bare xpub is rejected', r.status === 401)
    r = await post('/api/auth/keyrex', { xpub: 'xpub_x' })
    check('bare xpub without any session is rejected', r.status === 401)
    let me = await fetch(CLIENT + '/api/me', { headers: { Cookie: s.cookie } })
    check('no session after bare xpub', me.status === 401)

    // Happy path
    s = await post('/api/keyrex/nonce')
    const nonce = s.body.nonce
    const good = await sign({ nonce })
    r = await post('/api/auth/keyrex', { token: good }, s.cookie)
    check('valid token accepted', r.status === 200)
    me = await fetch(CLIENT + '/api/me', { headers: { Cookie: s.cookie } })
    const meBody = await me.json()
    check('session established with sub', me.status === 200 && meBody.sub === 'sub-alice')

    // Replay of the same token with a fresh session and a new nonce
    const s2 = await post('/api/keyrex/nonce')
    r = await post('/api/auth/keyrex', { token: good }, s2.cookie)
    check('replayed token rejected', r.status === 401)

    // Nonce is single use
    s = await post('/api/keyrex/nonce')
    const t1 = await sign({ nonce: s.body.nonce })
    await post('/api/auth/keyrex', { token: 'garbage' }, s.cookie)
    r = await post('/api/auth/keyrex', { token: t1 }, s.cookie)
    check('nonce is consumed by a failed attempt', r.status === 401)

    // Wrong nonce
    s = await post('/api/keyrex/nonce')
    r = await post('/api/auth/keyrex', { token: await sign({ nonce: 'a'.repeat(24) }) }, s.cookie)
    check('wrong nonce rejected', r.status === 401)

    // Missing nonce claim
    s = await post('/api/keyrex/nonce')
    r = await post('/api/auth/keyrex', { token: await sign({}) }, s.cookie)
    check('token without nonce rejected', r.status === 401)

    // Token for another site
    s = await post('/api/keyrex/nonce')
    r = await post('/api/auth/keyrex', { token: await sign({ nonce: s.body.nonce }, { aud: 'other-site' }) }, s.cookie)
    check('token for another site rejected', r.status === 401)

    // Wrong issuer
    s = await post('/api/keyrex/nonce')
    r = await post('/api/auth/keyrex', { token: await sign({ nonce: s.body.nonce }, { iss: 'http://evil.example' }) }, s.cookie)
    check('wrong issuer rejected', r.status === 401)

    // Expired
    s = await post('/api/keyrex/nonce')
    r = await post('/api/auth/keyrex', { token: await sign({ nonce: s.body.nonce }, { exp: Math.floor(Date.now() / 1000) - 60 }) }, s.cookie)
    check('expired token rejected', r.status === 401)

    // Signed by an unknown key
    s = await post('/api/keyrex/nonce')
    r = await post('/api/auth/keyrex', { token: await sign({ nonce: s.body.nonce }, { key: other.privateKey }) }, s.cookie)
    check('token signed by unknown key rejected', r.status === 401)

    // alg none
    s = await post('/api/keyrex/nonce')
    const unsigned = new jose.UnsecuredJWT({ nonce: s.body.nonce }).setIssuer(KEYREX).setAudience(SITE_ID).setSubject('x').setExpirationTime('60s').encode()
    r = await post('/api/auth/keyrex', { token: unsigned }, s.cookie)
    check('alg none rejected', r.status === 401)

    // Legacy mapping: old account matched by legacy_sub keeps the same user
    s = await post('/api/keyrex/nonce')
    await post('/api/auth/keyrex', { token: await sign({ nonce: s.body.nonce, legacy_sub: 'xpub_legacy1' }, { jti: 'j-a' }) }, s.cookie)
    const first = await (await fetch(CLIENT + '/api/me', { headers: { Cookie: s.cookie } })).json()
    check('legacy_sub login creates account', !!first.id)
  } finally {
    server.kill()
    mock.close()
  }

  console.log(failures === 0 ? '\nAll checks passed' : '\n' + failures + ' check(s) failed')
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
