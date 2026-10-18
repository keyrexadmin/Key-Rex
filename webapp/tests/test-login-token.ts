#!/usr/bin/env node

/**
 * Offline test of login token issuance/verification (no server or database needed).
 *   npm run test:token   (runs via npx ts-node)
 */

import { generateKeyPairSync } from 'crypto'
import { jwtVerify, createLocalJWKSet, errors } from 'jose'

const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
process.env.KEYREX_JWT_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
process.env.KEYREX_PAIRWISE_SECRET = 'x'.repeat(48)

let failed = 0
function check(name: string, ok: boolean) {
  console.log(`${ok ? '✅' : '❌'} ${name}`)
  if (!ok) failed++
}

async function rejects(p: Promise<unknown>) {
  try {
    await p
    return false
  } catch {
    return true
  }
}

async function main() {
  const { issueLoginToken, getPublicJwks, pairwiseSubject } = await import('../lib/token')
  const issuer = 'https://keyrex.example'
  const xpub = 'xpub_' + 'a'.repeat(32)
  const nonce = 'n'.repeat(24)

  const token = await issueLoginToken({ xpub, siteId: 'siteA', issuer, nonce })
  check('token issued', !!token)

  const jwks = createLocalJWKSet(await getPublicJwks())
  const { payload, protectedHeader } = await jwtVerify(token!, jwks, {
    issuer,
    audience: 'siteA',
    algorithms: ['ES256'],
  })
  check('verifies for the right site', true)
  check('alg ES256 with kid', protectedHeader.alg === 'ES256' && !!protectedHeader.kid)
  check('nonce claim carried', payload.nonce === nonce)
  check('sub is pairwise, not the raw xpub', payload.sub !== xpub && payload.sub === pairwiseSubject(xpub, 'siteA', 'x'.repeat(48)))
  check('legacy_sub carries xpub', payload.legacy_sub === xpub)
  check('lifetime <= 60s', (payload.exp as number) - (payload.iat as number) <= 60)
  check('jti present', typeof payload.jti === 'string' && payload.jti.length >= 16)

  check('rejected for a different site (aud)', await rejects(jwtVerify(token!, jwks, { issuer, audience: 'siteB', algorithms: ['ES256'] })))
  check('rejected for wrong issuer', await rejects(jwtVerify(token!, jwks, { issuer: 'https://evil.example', audience: 'siteA', algorithms: ['ES256'] })))
  check('same wallet, different site => different sub', pairwiseSubject(xpub, 'siteA', 'x'.repeat(48)) !== pairwiseSubject(xpub, 'siteB', 'x'.repeat(48)))

  // Tampered payload must fail
  const [h, , s] = token!.split('.')
  const forgedPayload = Buffer.from(JSON.stringify({ ...payload, sub: 'victim' })).toString('base64url')
  check('tampered token rejected', await rejects(jwtVerify(`${h}.${forgedPayload}.${s}`, jwks, { issuer, audience: 'siteA' })))

  // A token signed by another key must fail
  const other = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey
  const { SignJWT } = await import('jose')
  const rogue = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: protectedHeader.kid }).setIssuer(issuer).setAudience('siteA').setSubject('x').setExpirationTime('60s').sign(other)
  check('token from another key rejected', await rejects(jwtVerify(rogue, jwks, { issuer, audience: 'siteA' })))

  check('expired token rejected', await rejects(
    jwtVerify(token!, jwks, { issuer, audience: 'siteA', currentDate: new Date(Date.now() + 120_000) })
  ))

  process.env.KEYREX_INCLUDE_LEGACY_SUB = 'false'
  const noLegacy = await issueLoginToken({ xpub, siteId: 'siteA', issuer })
  const decoded = await jwtVerify(noLegacy!, jwks, { issuer, audience: 'siteA' })
  check('legacy_sub omitted when disabled; no nonce when none given', decoded.payload.legacy_sub === undefined && decoded.payload.nonce === undefined)

  console.log(failed ? `\n${failed} failed` : '\nall passed')
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
