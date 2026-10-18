// Exercises the serverless handlers with a mock Key-Rex JWKS. Run: node test-api.js
const http = require('http')

const SITE_ID = 'test-site-id'
const PORT = 3920
const KEYREX = 'http://localhost:' + PORT
process.env.KEYREX_BASE_URL = KEYREX
process.env.KEYREX_SITE_ID = SITE_ID
process.env.SESSION_SECRET = 'x'.repeat(48)

const nonceH = require('./api/keyrex/nonce')
const loginH = require('./api/auth/keyrex')
const meH = require('./api/me')

let failures = 0
function check(name, ok) {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name)
  if (!ok) failures++
}

function call(handler, { method = 'POST', body, cookies = {} } = {}) {
  return new Promise((resolve) => {
    const headers = {}
    const req = {
      method,
      body,
      headers: { cookie: Object.entries(cookies).map(([k, v]) => k + '=' + v).join('; ') },
    }
    const res = {
      setHeader: (k, v) => (headers[k.toLowerCase()] = v),
      status(code) {
        this.code = code
        return this
      },
      json(data) {
        resolve({ status: this.code, body: data, headers })
      },
    }
    Promise.resolve(handler(req, res)).catch((e) => resolve({ status: 500, body: { error: e.message }, headers }))
  })
}

function setCookies(result) {
  const raw = [].concat(result.headers['set-cookie'] || [])
  const out = {}
  for (const c of raw) {
    const [pair] = c.split(';')
    const i = pair.indexOf('=')
    out[pair.slice(0, i)] = pair.slice(i + 1)
  }
  return out
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
  await new Promise((r) => mock.listen(PORT, r))

  const sign = (claims, o = {}) =>
    new jose.SignJWT(claims)
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setIssuer(o.iss || KEYREX)
      .setAudience(o.aud || SITE_ID)
      .setSubject('sub-alice')
      .setIssuedAt()
      .setExpirationTime(o.exp || '60s')
      .setJti(crypto.randomUUID())
      .sign(o.key || privateKey)

  try {
    let n = await call(nonceH)
    let cookies = setCookies(n)
    let r = await call(loginH, { body: { xpub: 'xpub_e03f16d69cb3111f675b6f9be7ddcfde' }, cookies })
    check('bare xpub rejected', r.status === 401)
    r = await call(meH, { method: 'GET', cookies: setCookies(r) })
    check('no session after bare xpub', r.status === 401)

    n = await call(nonceH)
    cookies = setCookies(n)
    r = await call(loginH, { body: { token: await sign({ nonce: n.body.nonce }) }, cookies })
    check('valid token accepted', r.status === 200)
    const session = setCookies(r)
    check('session cookie set', !!session.demo_session)
    r = await call(meH, { method: 'GET', cookies: { demo_session: session.demo_session } })
    check('/api/me returns sub', r.status === 200 && r.body.sub === 'sub-alice')
    r = await call(meH, { method: 'GET', cookies: { demo_session: session.demo_session.slice(0, -2) + 'xx' } })
    check('tampered session cookie rejected', r.status === 401)

    n = await call(nonceH)
    r = await call(loginH, { body: { token: await sign({ nonce: 'b'.repeat(24) }) }, cookies: setCookies(n) })
    check('wrong nonce rejected', r.status === 401)

    n = await call(nonceH)
    r = await call(loginH, { body: { token: await sign({ nonce: n.body.nonce }) } })
    check('no nonce cookie rejected', r.status === 401)

    n = await call(nonceH)
    r = await call(loginH, { body: { token: await sign({ nonce: n.body.nonce }, { aud: 'other-site' }) }, cookies: setCookies(n) })
    check('token for another site rejected', r.status === 401)

    n = await call(nonceH)
    r = await call(loginH, { body: { token: await sign({ nonce: n.body.nonce }, { key: other.privateKey }) }, cookies: setCookies(n) })
    check('token signed by unknown key rejected', r.status === 401)

    n = await call(nonceH)
    r = await call(loginH, { body: { token: await sign({ nonce: n.body.nonce }, { exp: Math.floor(Date.now() / 1000) - 60 }) }, cookies: setCookies(n) })
    check('expired token rejected', r.status === 401)

    n = await call(nonceH)
    const unsigned = new jose.UnsecuredJWT({ nonce: n.body.nonce }).setIssuer(KEYREX).setAudience(SITE_ID).setSubject('x').setExpirationTime('60s').encode()
    r = await call(loginH, { body: { token: unsigned }, cookies: setCookies(n) })
    check('alg none rejected', r.status === 401)

    r = await call(loginH, { method: 'GET' })
    check('GET rejected', r.status === 405)
  } finally {
    mock.close()
  }

  console.log(failures === 0 ? '\nAll checks passed' : '\n' + failures + ' check(s) failed')
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
