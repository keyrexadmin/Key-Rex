const crypto = require('crypto')
const { sign, cookie } = require('../_lib')

// Issues a one-time nonce bound to this browser. Key-Rex puts it into the signed token.
module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const nonce = crypto.randomBytes(24).toString('base64url')
  res.setHeader('Set-Cookie', cookie('demo_nonce', sign({ nonce, exp: Math.floor(Date.now() / 1000) + 600 }), 600))
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ nonce })
}
