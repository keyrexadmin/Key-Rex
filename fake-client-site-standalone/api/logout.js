const { cookie } = require('./_lib')

module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Set-Cookie', cookie('demo_session', '', 0))
  res.status(200).json({ success: true })
}
