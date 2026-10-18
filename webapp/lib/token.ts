/**
 * Login assertion tokens (signed JWTs)
 *
 * After Key-Rex verifies a wallet signature it can issue a short-lived ES256 JWT that a
 * client site's backend verifies against the public keys published at /.well-known/jwks.json.
 * The raw xpub/identifier is NOT a credential; only a valid token proves a login.
 *
 * Environment:
 *   KEYREX_JWT_PRIVATE_KEY      ES256 private key, PKCS8 PEM ("\n" escapes allowed). Required in production.
 *   KEYREX_PAIRWISE_SECRET      Secret (>= 32 chars) for per-site pairwise subject IDs. Required in production.
 *   KEYREX_JWT_PREVIOUS_JWKS    Optional JSON JWKS of retired public keys, kept published during key rotation.
 *   KEYREX_INCLUDE_LEGACY_SUB   Set to "false" to stop including the legacy xpub (legacy_sub claim).
 *
 * Without the keys, development uses ephemeral in-process keys; production issues no tokens (fail closed).
 */

import { createHmac, createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes, KeyObject } from 'crypto'
import { SignJWT, exportJWK, calculateJwkThumbprint, type JWK } from 'jose'

export const TOKEN_TTL_SECONDS = 60
const ALG = 'ES256'

interface SigningMaterial {
  privateKey: KeyObject
  publicJwk: JWK
  kid: string
}

let cachedSigning: Promise<SigningMaterial | null> | null = null
let ephemeralPairwiseSecret: string | null = null

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

async function loadSigningMaterial(): Promise<SigningMaterial | null> {
  let privateKey: KeyObject
  const pem = process.env.KEYREX_JWT_PRIVATE_KEY

  if (pem) {
    try {
      privateKey = createPrivateKey(pem.replace(/\\n/g, '\n'))
    } catch (error) {
      console.error('TOKEN: KEYREX_JWT_PRIVATE_KEY is not a valid PEM private key')
      return null
    }
    if (privateKey.asymmetricKeyType !== 'ec' || privateKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
      console.error('TOKEN: KEYREX_JWT_PRIVATE_KEY must be an EC P-256 key for ES256')
      return null
    }
  } else if (!isProduction()) {
    console.warn('TOKEN: KEYREX_JWT_PRIVATE_KEY not set - using an ephemeral development key')
    privateKey = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey
  } else {
    console.error('TOKEN: KEYREX_JWT_PRIVATE_KEY is not set - login tokens are disabled')
    return null
  }

  const publicJwk = await exportJWK(createPublicKey(privateKey))
  const kid = await calculateJwkThumbprint(publicJwk)
  return { privateKey, publicJwk: { ...publicJwk, kid, alg: ALG, use: 'sig' }, kid }
}

function getSigningMaterial(): Promise<SigningMaterial | null> {
  if (!cachedSigning) {
    cachedSigning = loadSigningMaterial()
  }
  return cachedSigning
}

function getPairwiseSecret(): string | null {
  const secret = process.env.KEYREX_PAIRWISE_SECRET
  if (secret) {
    if (secret.length < 32) {
      console.error('TOKEN: KEYREX_PAIRWISE_SECRET must be at least 32 characters')
      return null
    }
    return secret
  }
  if (!isProduction()) {
    if (!ephemeralPairwiseSecret) {
      console.warn('TOKEN: KEYREX_PAIRWISE_SECRET not set - using an ephemeral development secret')
      ephemeralPairwiseSecret = randomBytes(32).toString('hex')
    }
    return ephemeralPairwiseSecret
  }
  console.error('TOKEN: KEYREX_PAIRWISE_SECRET is not set - login tokens are disabled')
  return null
}

/**
 * Per-site pairwise subject: the same wallet gets a different, unlinkable ID on every site,
 * so one site operator cannot impersonate a user on another site.
 */
export function pairwiseSubject(xpub: string, siteId: string, secret: string): string {
  return createHmac('sha256', secret).update(`${xpub}:${siteId}`).digest('base64url')
}

export function getIssuer(request: { nextUrl: { origin: string } }): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin).replace(/\/+$/, '')
}

/**
 * Issue a login token for a verified wallet login. Returns null when tokens are not
 * configured; callers must then omit the token (never fall back to an unsigned one).
 */
export async function issueLoginToken(params: {
  xpub: string
  siteId: string
  issuer: string
  nonce?: string | null
}): Promise<string | null> {
  const signing = await getSigningMaterial()
  const secret = getPairwiseSecret()
  if (!signing || !secret) {
    return null
  }

  const claims: Record<string, unknown> = {}
  if (params.nonce) {
    claims.nonce = params.nonce
  }
  if (process.env.KEYREX_INCLUDE_LEGACY_SUB !== 'false') {
    claims.legacy_sub = params.xpub
  }

  return await new SignJWT(claims)
    .setProtectedHeader({ alg: ALG, kid: signing.kid, typ: 'JWT' })
    .setIssuer(params.issuer)
    .setAudience(params.siteId)
    .setSubject(pairwiseSubject(params.xpub, params.siteId, secret))
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .setJti(randomBytes(16).toString('base64url'))
    .sign(signing.privateKey)
}

/** Public keys (current plus any retired keys kept for rotation) for /.well-known/jwks.json */
export async function getPublicJwks(): Promise<{ keys: JWK[] }> {
  const keys: JWK[] = []
  const signing = await getSigningMaterial()
  if (signing) {
    keys.push(signing.publicJwk)
  }

  const previous = process.env.KEYREX_JWT_PREVIOUS_JWKS
  if (previous) {
    try {
      const parsed = JSON.parse(previous)
      for (const key of Array.isArray(parsed?.keys) ? parsed.keys : []) {
        // Publish public material only
        if (key && key.kty === 'EC' && key.kid && !key.d) {
          keys.push(key)
        }
      }
    } catch {
      console.error('TOKEN: KEYREX_JWT_PREVIOUS_JWKS is not valid JSON')
    }
  }

  return { keys }
}
