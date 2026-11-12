// Shared helpers for the demo backend (Vercel serverless functions).
// State lives in HMAC-signed HttpOnly cookies because functions are stateless.
// Files starting with "_" are not exposed as routes.

const crypto = require('crypto')

const KEYREX_BASE_URL = (process.env.KEYREX_BASE_URL || 'https://keyrex-preview.vercel.app').replace(/\/$/, '')
const KEYREX_SITE_ID = process.env.KEYREX_SITE_ID || 'f3d3c4dfe73f71467355b939a7daa232'

function secret() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET (32+ chars) is not configured')
  }
  return process.env.SESSION_SECRET
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url')
  return body + '.' + mac
}

function unsign(value) {
  if (typeof value !== 'string') return null
  const [body, mac] = value.split('.')
  if (!body || !mac) return null
  const expected = crypto.createHmac('sha256', secret()).update(body).digest()
  const given = Buffer.from(mac, 'base64url')
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (!payload.exp || payload.exp < Date.now() / 1000) return null
    return payload
  } catch {
    return null
  }
}

function parseCookies(req) {
  const out = {}
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  return out
}

function cookie(name, value, maxAgeSeconds) {
  return name + '=' + value + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=' + maxAgeSeconds
}

async function verifyKeyRexToken(token) {
  const jose = await import('jose')
  const jwks = jose.createRemoteJWKSet(new URL(KEYREX_BASE_URL + '/.well-known/jwks.json'))
  const { payload } = await jose.jwtVerify(token, jwks, {
    issuer: KEYREX_BASE_URL,
    audience: KEYREX_SITE_ID,
    algorithms: ['ES256'],
    clockTolerance: 5,
  })
  return payload
}

module.exports = { sign, unsign, parseCookies, cookie, verifyKeyRexToken }
