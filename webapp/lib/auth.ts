import * as crypto from 'crypto'
import { verify, hashes } from '@noble/secp256k1'
import EC from 'elliptic'

// Initialize elliptic for secp256k1 (supports DER signatures)
const ec = new EC.ec('secp256k1')

// Configure @noble/secp256k1 to use SHA256 using Node's built-in crypto
// This must be done before any verify() calls
// @noble/secp256k1 requires a synchronous SHA256 function
if (!hashes.sha256) {
  hashes.sha256 = (m: Uint8Array) => {
    // Use Node's crypto.createHash for synchronous SHA256
    return new Uint8Array(crypto.createHash('sha256').update(m).digest())
  }
  console.log('✓ SHA256 configured for @noble/secp256k1 using Node crypto')
} else {
  console.log('SHA256 already configured')
}

export interface LNURLAuthParams {
  k1: string
  sig: string
  key: string
}

// Generate a random challenge (k1)
export function generateChallenge(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Verify LNURL-auth signature cryptographically
 * 
 * LNURL-auth specification:
 * - The signature is an ECDSA signature over the SHA256 hash of the k1 challenge
 * - Signature format: DER-encoded (variable length) or compact (64 bytes r+s)
 * - Public key: secp256k1 compressed (33 bytes) or uncompressed (65 bytes)
 * 
 * @param k1 - The challenge string (hex-encoded random bytes)
 * @param sig - The signature (hex or base64 encoded)
 * @param key - The public key (hex or base64 encoded)
 * @returns true if signature is cryptographically valid, false otherwise
 */
export function verifySignature(k1: string, sig: string, key: string): boolean {
  try {
    // CRITICAL: Ensure SHA256 is configured before any verify calls
    // This must be done every time because the configuration might not persist
    if (!hashes.sha256) {
      hashes.sha256 = (m: Uint8Array) => {
        return new Uint8Array(crypto.createHash('sha256').update(m).digest())
      }
    }
    
    console.log('=== Cryptographic Signature Verification ===')
    console.log('k1 (challenge):', k1.substring(0, 32) + '...')
    console.log('sig length:', sig.length, 'chars')
    console.log('key length:', key.length, 'chars')
    
    // Decode signature and key from hex or base64
    const hexRegex = /^[0-9a-fA-F]+$/i
    const isSigHex = hexRegex.test(sig.trim())
    const isKeyHex = hexRegex.test(key.trim())
    
    let sigBuffer: Buffer
    let keyBuffer: Buffer
    
    try {
      if (isSigHex) {
        sigBuffer = Buffer.from(sig.trim(), 'hex')
      } else {
        sigBuffer = Buffer.from(sig.trim(), 'base64')
      }
      
      if (isKeyHex) {
        keyBuffer = Buffer.from(key.trim(), 'hex')
      } else {
        keyBuffer = Buffer.from(key.trim(), 'base64')
      }
    } catch (decodeError) {
      console.error('Failed to decode sig/key:', decodeError)
      return false
    }
    
    // Validate key format (must be 33 or 65 bytes for secp256k1)
    if (keyBuffer.length !== 33 && keyBuffer.length !== 65) {
      console.error('Invalid public key length:', keyBuffer.length, 'expected 33 (compressed) or 65 (uncompressed)')
      return false
    }
    
    // Normalize public key to compressed format (33 bytes) if needed
    let publicKey: Uint8Array
    if (keyBuffer.length === 65) {
      // Uncompressed format (0x04 prefix) - convert to compressed
      if (keyBuffer[0] !== 0x04) {
        console.error('Invalid uncompressed public key format: expected 0x04 prefix')
        return false
      }
      const x = keyBuffer.slice(1, 33)
      const y = keyBuffer.slice(33, 65)
      // Determine compression prefix based on y parity
      const prefix = y[31] % 2 === 0 ? 0x02 : 0x03
      publicKey = new Uint8Array(Buffer.concat([Buffer.from([prefix]), x]))
    } else {
      // Already compressed (33 bytes)
      if (keyBuffer[0] !== 0x02 && keyBuffer[0] !== 0x03) {
        console.error('Invalid compressed public key format: expected 0x02 or 0x03 prefix')
        return false
      }
      publicKey = new Uint8Array(keyBuffer)
    }
    
    // Hash the k1 challenge (LNURL-auth spec: sign SHA256(k1))
    const k1Buffer = Buffer.from(k1, 'hex')
    if (k1Buffer.length !== 32) {
      console.error('Invalid k1 length:', k1Buffer.length, 'expected 32 bytes (64 hex chars)')
      console.error('k1 string length:', k1.length, 'chars')
      console.error('k1 first 40 chars:', JSON.stringify(k1.substring(0, 40)))
      console.error('k1 is valid hex:', /^[0-9a-fA-F]{64}$/.test(k1))
      return false
    }
    const messageHashBuffer = crypto.createHash('sha256').update(k1Buffer).digest()
    // Convert to Uint8Array for @noble/secp256k1
    const messageHash = new Uint8Array(messageHashBuffer)
    
    console.log('k1 (hex):', k1)
    console.log('k1 buffer length:', k1Buffer.length, 'bytes')
    console.log('Message hash (hex):', Buffer.from(messageHash).toString('hex'))
    console.log('Message hash length:', messageHash.length, 'bytes')
    
    // Convert signature to Uint8Array
    const signature = new Uint8Array(sigBuffer)
    
    // Handle different signature formats
    // LNURL-auth typically uses compact format (64 bytes), but some wallets may send DER
    let isValid = false
    
    // CRITICAL: Ensure SHA256 is configured before any verify calls in this try block
    // This must be done here because the configuration might not persist from the function start
    if (!hashes.sha256) {
      hashes.sha256 = (m: Uint8Array) => {
        return new Uint8Array(crypto.createHash('sha256').update(m).digest())
      }
    }
    
    try {
      // Compact format (64 bytes: 32 bytes r + 32 bytes s) - most common for LNURL-auth
      if (signature.length === 64) {
        console.log('Signature format: Compact (64 bytes)')
        try {
          // CRITICAL: Pass prehash: false because we've already hashed the k1 challenge
          isValid = verify(signature, messageHash, publicKey, { prehash: false })
          console.log('Compact signature verification result:', isValid)
        } catch (verifyError) {
          console.error('Error during compact signature verification:', verifyError)
          console.error('Error message:', verifyError instanceof Error ? verifyError.message : String(verifyError))
          return false
        }
      } 
      // DER-encoded format (variable length, typically 69-72 bytes)
      // Alby sends DER signatures that can be 69-72 bytes
      // Note: @noble/secp256k1 verify() expects compact format, so DER needs conversion
      else if (signature.length >= 69 && signature.length <= 72) {
        console.log('Signature format: DER-encoded (attempting verification)')
        console.log('DER signature length:', signature.length, 'bytes')
        
        try {
          // Try direct verification first (might work for some DER formats)
          // CRITICAL: Pass prehash: false because we've already hashed the k1 challenge
          isValid = verify(signature, messageHash, publicKey, { prehash: false })
          console.log('DER signature verification result:', isValid)
        } catch (verificationError) {
          console.error('Direct DER verification failed:', verificationError)
          console.error('Error message:', verificationError instanceof Error ? verificationError.message : String(verificationError))
          
          // Try converting DER to compact format
          // DER format: 0x30 [length] 0x02 [r_length] [r] 0x02 [s_length] [s]
          try {
            console.log('Attempting DER-to-compact conversion...')
            console.log('DER signature (hex):', Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join(' '))
            
            // Parse DER signature
            if (signature[0] !== 0x30) {
              console.error('Invalid DER signature: missing 0x30 prefix, got:', '0x' + signature[0].toString(16))
              return false
            }
            
            const derLength = signature[1]
            console.log('DER sequence length byte:', '0x' + derLength.toString(16), '(', derLength, 'bytes)')
            
            // Extract r and s values from DER
            let offset = 2 // Skip 0x30 and length byte
            if (signature[offset] !== 0x02) {
              console.error('Invalid DER signature: missing 0x02 for r at offset', offset, 'got:', '0x' + signature[offset].toString(16))
              return false
            }
            offset++
            const rLength = signature[offset++]
            console.log('r length byte:', rLength, 'bytes')
            let r = signature.slice(offset, offset + rLength)
            console.log('r (raw, hex):', Array.from(r).map(b => b.toString(16).padStart(2, '0')).join(' '))
            offset += rLength
            
            // Remove leading zero byte if present (DER encoding adds 0x00 if high bit is set)
            if (r.length > 0 && r[0] === 0x00 && r.length > 1) {
              console.log('Removing leading zero from r')
              r = r.slice(1)
            }
            console.log('r (after removing leading zero, hex):', Array.from(r).map(b => b.toString(16).padStart(2, '0')).join(' '), 'length:', r.length)
            
            if (signature[offset] !== 0x02) {
              console.error('Invalid DER signature: missing 0x02 for s at offset', offset, 'got:', '0x' + signature[offset].toString(16))
              return false
            }
            offset++
            const sLength = signature[offset++]
            console.log('s length byte:', sLength, 'bytes')
            let s = signature.slice(offset, offset + sLength)
            console.log('s (raw, hex):', Array.from(s).map(b => b.toString(16).padStart(2, '0')).join(' '))
            
            // Remove leading zero byte if present (DER encoding adds 0x00 if high bit is set)
            if (s.length > 0 && s[0] === 0x00 && s.length > 1) {
              console.log('Removing leading zero from s')
              s = s.slice(1)
            }
            console.log('s (after removing leading zero, hex):', Array.from(s).map(b => b.toString(16).padStart(2, '0')).join(' '), 'length:', s.length)
            
            // Ensure r and s are 32 bytes each (pad with leading zeros if needed)
            // ECDSA signatures require left-padding (leading zeros) for values < 32 bytes
            const rPadded = new Uint8Array(32)
            const sPadded = new Uint8Array(32)
            
            // Pad from left (leading zeros) if r or s is less than 32 bytes
            if (r.length <= 32) {
              rPadded.set(r, 32 - r.length) // Pad from left
            } else {
              // If r is > 32 bytes, take the last 32 bytes (shouldn't happen for secp256k1)
              rPadded.set(r.slice(r.length - 32), 0)
            }
            
            if (s.length <= 32) {
              sPadded.set(s, 32 - s.length) // Pad from left
            } else {
              // If s is > 32 bytes, take the last 32 bytes (shouldn't happen for secp256k1)
              sPadded.set(s.slice(s.length - 32), 0)
            }
            
            // Create compact signature (64 bytes: r + s)
            const compactSig = new Uint8Array(64)
            compactSig.set(rPadded, 0)
            compactSig.set(sPadded, 32)
            
            console.log('DER parsing details:', {
              rLength: r.length,
              sLength: s.length,
              rFirstByte: r.length > 0 ? '0x' + r[0].toString(16).padStart(2, '0') : 'N/A',
              sFirstByte: s.length > 0 ? '0x' + s[0].toString(16).padStart(2, '0') : 'N/A',
              rPaddedLength: rPadded.length,
              sPaddedLength: sPadded.length,
              rPaddedFirstByte: rPadded[0] ? '0x' + rPadded[0].toString(16).padStart(2, '0') : 'N/A',
              sPaddedFirstByte: sPadded[0] ? '0x' + sPadded[0].toString(16).padStart(2, '0') : 'N/A',
              compactSigLength: compactSig.length
            })
            
            // Log first few bytes of compact signature for debugging
            const compactSigHex = Array.from(compactSig.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')
            console.log('Compact signature (first 16 bytes):', compactSigHex)
            
            console.log('Converted DER to compact format, attempting verification...')
            console.log('Message hash length:', messageHash.length, 'bytes')
            console.log('Public key length:', publicKey.length, 'bytes')
            console.log('Public key first byte:', '0x' + publicKey[0].toString(16).padStart(2, '0'))
            
            // Ensure SHA256 is configured before verify
            if (!hashes.sha256) {
              hashes.sha256 = (m: Uint8Array) => {
                return new Uint8Array(crypto.createHash('sha256').update(m).digest())
              }
            }
            
            // CRITICAL: Pass prehash: false because we've already hashed the k1 challenge
            // Try with prehash: false first (messageHash is already a hash)
            isValid = verify(compactSig, messageHash, publicKey, { prehash: false })
            console.log('DER-to-compact verification result (prehash: false):', isValid)
            
            // If that fails, try with prehash: true (let verify hash the raw k1)
            if (!isValid) {
              console.log('Verification with prehash: false failed, trying with raw k1 and prehash: true...')
              const k1Uint8Array = new Uint8Array(k1Buffer)
              isValid = verify(compactSig, k1Uint8Array, publicKey, { prehash: true })
              console.log('DER-to-compact verification result (prehash: true):', isValid)
            }
            
            // If both fail, try using elliptic library which supports DER signatures directly
            if (!isValid) {
              console.log('Both @noble/secp256k1 attempts failed, trying elliptic library with DER signature...')
              try {
                // elliptic library can handle DER signatures directly
                // It also supports compressed public keys
                const keyPair = ec.keyFromPublic(publicKey, 'hex')
                // elliptic expects the message hash as a hex string or Buffer
                // Try with messageHash as hex string first
                const msgHashHex = Buffer.from(messageHash).toString('hex')
                console.log('Elliptic: Message hash (hex):', msgHashHex)
                console.log('Elliptic: Public key (hex):', Buffer.from(publicKey).toString('hex'))
                console.log('Elliptic: Signature (hex):', sigBuffer.toString('hex'))
                
                // LNURL-auth SPECIFICATION: Wallets should sign SHA256(k1), not raw k1
                // Try with SHA256(k1) first (the correct, spec-compliant way)
                const msgHashBuffer = Buffer.from(messageHash)
                isValid = keyPair.verify(msgHashBuffer, sigBuffer)
                console.log('Elliptic library verification result (SHA256(k1) - spec compliant):', isValid)
                
                // If that fails, try with messageHash as hex string
                if (!isValid) {
                  isValid = keyPair.verify(msgHashHex, sigBuffer)
                  console.log('Elliptic library verification result (SHA256(k1) as hex string):', isValid)
                }
                
                // FALLBACK ONLY: Some wallets may incorrectly sign raw k1 instead of SHA256(k1)
                // This is a compatibility workaround and should be logged as a warning
                if (!isValid) {
                  console.warn('⚠️ WARNING: SHA256(k1) verification failed. Trying raw k1 (non-spec-compliant fallback)...')
                  console.warn('⚠️ This wallet may not be following the LNURL-auth specification correctly.')
                  const k1Buffer = Buffer.from(k1, 'hex')
                  isValid = keyPair.verify(k1Buffer, sigBuffer)
                  if (isValid) {
                    console.warn('⚠️ Verification succeeded with raw k1, but this is NOT the correct LNURL-auth specification.')
                    console.warn('⚠️ This wallet should be signing SHA256(k1), not raw k1.')
                  }
                  console.log('Elliptic library verification result (raw k1 - fallback only):', isValid)
                }
              } catch (ellipticError) {
                console.error('Elliptic library verification failed:', ellipticError)
                console.error('Elliptic error details:', ellipticError instanceof Error ? ellipticError.message : String(ellipticError))
                // Continue with false
              }
            }
            
            if (!isValid) {
              console.error('Verification failed - checking signature components...')
              console.error('This might indicate:')
              console.error('1. Incorrect DER parsing (r/s values wrong)')
              console.error('2. Incorrect message hash')
              console.error('3. Incorrect public key format')
              console.error('4. Signature is actually invalid')
            }
          } catch (conversionError) {
            console.error('DER-to-compact conversion failed:', conversionError)
            return false
          }
        }
      }
      // Other lengths - try verification but log warning
      // Note: 69-byte signatures are likely DER (Alby sends these)
      else if (signature.length > 64 && signature.length < 80) {
        console.log('Signature format: Unknown (attempting verification)')
        console.log('Signature length:', signature.length, 'bytes - might be DER format')
        
        try {
          // CRITICAL: Pass prehash: false because we've already hashed the k1 challenge
          isValid = verify(signature, messageHash, publicKey, { prehash: false })
          console.log('Unknown format signature verification result:', isValid)
        } catch (verificationError) {
          console.error('Verification failed for unknown signature format:', verificationError)
          console.error('Error details:', verificationError instanceof Error ? verificationError.message : String(verificationError))
          
          // If it's 69 bytes and starts with 0x30, it's likely DER - try conversion
          if (signature.length === 69 && signature[0] === 0x30) {
            console.log('Detected 69-byte DER signature, attempting DER-to-compact conversion...')
            try {
              // Parse DER signature (same logic as above)
              let offset = 2
              if (signature[offset] !== 0x02) {
                console.error('Invalid DER signature: missing 0x02 for r')
                return false
              }
              offset++
              const rLength = signature[offset++]
              const r = signature.slice(offset, offset + rLength)
              offset += rLength
              
              if (signature[offset] !== 0x02) {
                console.error('Invalid DER signature: missing 0x02 for s')
                return false
              }
              offset++
              const sLength = signature[offset++]
              const s = signature.slice(offset, offset + sLength)
              
              // Pad r and s to 32 bytes each
              const rPadded = new Uint8Array(32)
              const sPadded = new Uint8Array(32)
              const rStart = Math.max(0, 32 - r.length)
              const sStart = Math.max(0, 32 - s.length)
              rPadded.set(r.slice(Math.max(0, r.length - 32)), rStart)
              sPadded.set(s.slice(Math.max(0, s.length - 32)), sStart)
              
              // Create compact signature
              const compactSig = new Uint8Array(64)
              compactSig.set(rPadded, 0)
              compactSig.set(sPadded, 32)
              
              console.log('Converted 69-byte DER to compact format, attempting verification...')
              // CRITICAL: Pass prehash: false because we've already hashed the k1 challenge
              isValid = verify(compactSig, messageHash, publicKey, { prehash: false })
              console.log('69-byte DER-to-compact verification result:', isValid)
            } catch (conversionError) {
              console.error('69-byte DER-to-compact conversion failed:', conversionError)
              return false
            }
          } else {
            return false
          }
        }
      }
      else {
        console.error('Invalid signature length:', signature.length, 'expected 64 (compact) or 69-72 (DER)')
        return false
      }
      
      console.log('=== Signature verification result:', isValid ? '✓ VALID' : '✗ INVALID', '===')
      
      if (isValid) {
        console.log('✓ Cryptographic verification successful - signature is authentic')
      } else {
        console.error('✗ Cryptographic verification failed - signature is invalid or forged')
      }
      
      return isValid
    } catch (verifyError) {
      console.error('Error during cryptographic verification:', verifyError)
      return false
    }
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * Derive a consistent user identifier (xpub) from a public key.
 * 
 * This function normalizes the public key to a standard format and creates
 * a deterministic identifier. This ensures:
 * - Same public key always produces same xpub (regardless of encoding/format)
 * - Different public keys produce different xpubs
 * - The identifier is cryptographically stable
 * 
 * IMPORTANT LIMITATION:
 * In LNURL-auth, we only receive a public key, not the master private key.
 * Therefore, we cannot identify that different pubkeys come from the same
 * master key. Each unique pubkey will create a unique user account.
 * 
 * This is acceptable because:
 * - Most wallets use a consistent authentication key for LNURL-auth
 * - The same wallet will typically use the same key each time
 * - This provides a stable user identity for the majority of use cases
 */
export function deriveXpub(pubkey: string): string {
  try {
    // Normalize the public key to a consistent format
    let normalizedKey: Buffer
    
    // Check if it's hex or base64
    const hexRegex = /^[0-9a-fA-F]+$/
    const isHex = hexRegex.test(pubkey.trim())
    
    if (isHex) {
      normalizedKey = Buffer.from(pubkey.trim(), 'hex')
    } else {
      // Try base64
      try {
        normalizedKey = Buffer.from(pubkey.trim(), 'base64')
      } catch {
        // If base64 fails, treat as raw hex (might have spaces or other chars)
        normalizedKey = Buffer.from(pubkey.trim().replace(/[^0-9a-fA-F]/g, ''), 'hex')
      }
    }
    
    // Normalize to compressed format (33 bytes) if uncompressed (65 bytes)
    // Compressed format: 0x02 or 0x03 prefix + 32 bytes (standard for Bitcoin)
    // Uncompressed format: 0x04 + 64 bytes
    if (normalizedKey.length === 65 && normalizedKey[0] === 0x04) {
      // Convert uncompressed to compressed
      // Take the x-coordinate (bytes 1-33) and determine y parity
      const x = normalizedKey.slice(1, 33)
      const y = normalizedKey.slice(33, 65)
      // y is even -> 0x02, odd -> 0x03
      const prefix = y[y.length - 1] % 2 === 0 ? 0x02 : 0x03
      normalizedKey = Buffer.concat([Buffer.from([prefix]), x])
    } else if (normalizedKey.length === 33 && (normalizedKey[0] === 0x02 || normalizedKey[0] === 0x03)) {
      // Already compressed, use as-is
    } else if (normalizedKey.length === 64) {
      // 64 bytes without prefix - assume it's raw x+y coordinates
      // Add 0x04 prefix to make it uncompressed, then compress
      const x = normalizedKey.slice(0, 32)
      const y = normalizedKey.slice(32, 64)
      const prefix = y[y.length - 1] % 2 === 0 ? 0x02 : 0x03
      normalizedKey = Buffer.concat([Buffer.from([prefix]), x])
    } else {
      // Unknown format, use as-is but log warning
      console.warn('Unknown public key format, using as-is:', {
        length: normalizedKey.length,
        firstByte: normalizedKey.length > 0 ? normalizedKey[0].toString(16) : 'empty'
      })
    }
    
    // Create a stable hash of the normalized key
    // This ensures same key = same xpub, regardless of how it was encoded
    const hash = crypto.createHash('sha256').update(normalizedKey).digest('hex')
    
    // Use first 32 characters of hash as the xpub identifier
    // This gives us 128 bits of entropy, which is sufficient for user identification
    // Format: xpub_<32-char-hex-hash>
    return `xpub_${hash.substring(0, 32)}`
  } catch (error) {
    console.error('Error deriving xpub from pubkey:', error, 'pubkey:', pubkey.substring(0, 50))
    // Fallback: use a hash of the original string (normalized)
    const normalized = pubkey.trim().toLowerCase().replace(/[^0-9a-f]/g, '')
    const fallbackHash = crypto.createHash('sha256').update(normalized).digest('hex')
    return `xpub_${fallbackHash.substring(0, 32)}`
  }
}







