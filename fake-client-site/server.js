#!/usr/bin/env node

// Demo client site backend. Serves the static pages and shows the correct way
// to log users in with Key-Rex: verify the signed login token, never trust a
// bare xpub. In-memory state only (demo).

const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const PORT = process.env.PORT || 3001
const ROOT_DIR = __dirname
const KEYREX_BASE_URL = (process.env.KEYREX_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const KEYREX_SITE_ID = process.env.KEYREX_SITE_ID || 'a252dfa1030706a49efab31af2fc29d6'
const COOKIE = 'demo_sid'

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

const sessions = new Map() // sid -> { nonce, userId }
const users = new Map() // sub -> { id, sub, createdAt }
const usersByLegacy = new Map() // legacy xpub -> user
const seenJti = new Map() // jti -> exp (seconds)

let jose
let jwks
async function verifier() {
  if (!jose) {
    jose = await import('jose')
    jwks = jose.createRemoteJWKSet(new URL(KEYREX_BASE_URL + '/.well-known/jwks.json'))
  }
  return { jose, jwks }
}

function parseCookies(req) {
  const out = {}
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

function getSession(req, res, create) {
  let sid = parseCookies(req)[COOKIE]
  let session = sid && sessions.get(sid)
  if (!session && create) {
    sid = crypto.randomBytes(24).toString('base64url')
    session = { nonce: null, userId: null }
    sessions.set(sid, session)
    res.setHeader('Set-Cookie', COOKIE + '=' + sid + '; HttpOnly; SameSite=Lax; Path=/')
  }
  return session || null
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

function readJson(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => {
      data += c
      if (data.length > 16 * 1024) req.destroy()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'))
      } catch {
        resolve({})
      }
    })
  })
}

function rememberJti(jti, exp) {
  const now = Date.now() / 1000
  for (const [k, v] of seenJti) if (v < now) seenJti.delete(k)
  seenJti.set(jti, exp)
}

// Existing accounts are matched by the old xpub (legacy_sub) once, then keyed by sub.
function findOrCreateUser(sub, legacySub) {
  let user = users.get(sub)
  if (!user && legacySub) {
    user = usersByLegacy.get(legacySub)
    if (user) {
      user.sub = sub
      users.set(sub, user)
    }
  }
  if (!user) {
    user = { id: crypto.randomUUID(), sub, createdAt: new Date().toISOString() }
    users.set(sub, user)
  }
  if (legacySub) usersByLegacy.set(legacySub, user)
  return user
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/keyrex/nonce' && req.method === 'POST') {
    const session = getSession(req, res, true)
    session.nonce = crypto.randomBytes(24).toString('base64url')
    return json(res, 200, { nonce: session.nonce })
  }

  if (pathname === '/api/auth/keyrex' && req.method === 'POST') {
    const session = getSession(req, res, false)
    const expected = session && session.nonce
    if (session) session.nonce = null // single use, even on failure
    try {
      const { token } = await readJson(req)
      if (typeof token !== 'string' || !expected) throw new Error('missing token or nonce')
      const { jose, jwks } = await verifier()
      const { payload } = await jose.jwtVerify(token, jwks, {
        issuer: KEYREX_BASE_URL,
        audience: KEYREX_SITE_ID,
        algorithms: ['ES256'],
        clockTolerance: 5,
      })
      if (payload.nonce !== expected) throw new Error('nonce mismatch')
      if (!payload.jti || seenJti.has(payload.jti)) throw new Error('token replayed')
      rememberJti(payload.jti, payload.exp)

      const user = findOrCreateUser(payload.sub, payload.legacy_sub)
      session.userId = user.id
      return json(res, 200, { success: true })
    } catch (e) {
      console.warn('Login rejected:', e.message)
      return json(res, 401, { error: 'Invalid login token' })
    }
  }

  if (pathname === '/api/me' && req.method === 'GET') {
    const session = getSession(req, res, false)
    const user = session && [...users.values()].find((u) => u.id === session.userId)
    if (!user) return json(res, 401, { error: 'Not authenticated' })
    return json(res, 200, { id: user.id, sub: user.sub, createdAt: user.createdAt })
  }

  if (pathname === '/api/logout' && req.method === 'POST') {
    const sid = parseCookies(req)[COOKIE]
    if (sid) sessions.delete(sid)
    res.setHeader('Set-Cookie', COOKIE + '=; Max-Age=0; Path=/')
    return json(res, 200, { success: true })
  }

  return json(res, 404, { error: 'Not found' })
}

const server = http.createServer(async (req, res) => {
  const pathname = req.url.split('?')[0].split('#')[0]
  console.log(`${req.method} ${pathname}`)

  if (pathname.startsWith('/api/')) return handleApi(req, res, pathname)

  const filePath = pathname === '/' ? '/index.html' : pathname
  const fullPath = path.join(ROOT_DIR, filePath)
  if (!fullPath.startsWith(ROOT_DIR + path.sep) || ['server.js', 'package.json'].includes(path.basename(fullPath))) {
    res.writeHead(404)
    return res.end('File not found')
  }
  const type = MIME_TYPES[path.extname(fullPath).toLowerCase()]
  if (!type) {
    res.writeHead(404)
    return res.end('File not found')
  }

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500)
      return res.end(err.code === 'ENOENT' ? 'File not found' : 'Server Error')
    }
    res.writeHead(200, { 'Content-Type': type })
    res.end(content)
  })
})

server.listen(PORT, () => {
  console.log(`\n✓ Fake client site running on http://localhost:${PORT}`)
  console.log(`  Key-Rex: ${KEYREX_BASE_URL}  siteId: ${KEYREX_SITE_ID}\n`)
})
