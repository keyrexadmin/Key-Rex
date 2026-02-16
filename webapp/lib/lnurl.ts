// LNURL-auth implementation
// Generates challenge and handles authentication flow

import { bech32 } from 'bech32'

export function encodeLNURL(url: string): string {
  const words = bech32.toWords(Buffer.from(url, 'utf8'))
  return bech32.encode('lnurl', words, 2000)
}







