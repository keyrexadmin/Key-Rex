const { sign, unsign, parseCookies, cookie, verifyKeyRexToken } = require('../_lib')

// Verifies the Key-Rex login token, then starts a session. Never trusts a bare xpub.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Cache-Control', 'no-store')

  // The nonce is single use: clear it whatever the outcome
  const clearNonce = cookie('demo_nonce', '', 0)
  try {
    const stored = unsign(parseCookies(req).demo_nonce)
    const token = req.body && req.body.token
    if (!stored || typeof token !== 'string') throw new Error('missing token or nonce')

    const payload = await verifyKeyRexToken(token)
    if (payload.nonce !== stored.nonce) throw new Error('nonce mismatch')

    const exp = Math.floor(Date.now() / 1000) + 3600
    res.setHeader('Set-Cookie', [clearNonce, cookie('demo_session', sign({ sub: payload.sub, exp }), 3600)])
    res.status(200).json({ success: true })
  } catch (e) {
    console.warn('Login rejected:', e.message)
    res.setHeader('Set-Cookie', clearNonce)
    res.status(401).json({ error: 'Invalid login token' })
  }
}
