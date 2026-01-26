// LNURL-auth implementation
// Generates challenge and handles authentication flow

import { bech32 } from 'bech32'

export function encodeLNURL(url: string): string {
  const words = bech32.toWords(Buffer.from(url, 'utf8'))
  return bech32.encode('lnurl', words, 2000)
}

export function generateLNURLAuthUrl(domain: string, k1: string): string {
  // LNURL-auth spec: callback URL should only include k1, not tag
  // The tag is returned in the JSON response, not in the URL
  const callback = `${domain}/api/auth/callback?k1=${k1}`
  return `lightning:${callback}`
}

export function generateLNURLAuthBech32(domain: string, k1: string): string {
  // LNURL-auth spec: callback URL should only include k1, not tag
  // The tag is returned in the JSON response, not in the URL
  const callback = `${domain}/api/auth/callback?k1=${k1}`
  return encodeLNURL(callback)
}

export function createLNURLResponse(k1: string, domain: string) {
  return {
    tag: 'login',
    k1,
    callback: `${domain}/api/auth/callback`,
  }
}






