const { unsign, parseCookies } = require('./_lib')

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  const session = unsign(parseCookies(req).demo_session)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })
  res.status(200).json({ sub: session.sub })
}
