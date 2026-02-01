/**
 * Domain verification utilities
 * Implements DNS TXT record verification for domain ownership
 */

import dns from 'dns/promises'
import { isTestDomain } from './utils'
import { DomainVerification } from '@/types'

/**
 * Generate unique verification token
 * Format: keyrex-verification={random32chars}
 */
export function generateVerificationToken(): string {
  const crypto = require('crypto')
  const random = crypto.randomBytes(16).toString('hex')
  return `keyrex-verification=${random}`
}

/**
 * Verify domain ownership via DNS TXT record
 * @param domain - The domain to verify
 * @param expectedToken - The expected verification token
 * @returns Verification result with verified status and optional error message
 */
export async function verifyDomainDNS(
  domain: string,
  expectedToken: string
): Promise<{ verified: boolean; error?: string }> {
  // Skip verification for test domains
  if (isTestDomain(domain)) {
    return { verified: true }
  }
  
  try {
    // Query TXT records for the domain
    const records = await dns.resolveTxt(domain)
    
    // Flatten TXT records (DNS returns array of arrays)
    const txtRecords = records.flat()
    
    // Search for our verification token
    const verificationRecord = txtRecords.find(record => 
      record.includes('keyrex-verification=') && 
      record.includes(expectedToken)
    )
    
    if (verificationRecord) {
      return { verified: true }
    }
    
    return { 
      verified: false, 
      error: 'Verification token not found in DNS TXT records. Please ensure the record is added and DNS has propagated (may take 5-10 minutes).' 
    }
  } catch (error) {
    // Handle DNS lookup errors
    if (error instanceof Error) {
      // Check for specific DNS errors
      if (error.message.includes('ENOTFOUND') || error.message.includes('NXDOMAIN')) {
        return { 
          verified: false, 
          error: `Domain ${domain} not found. Please check that the domain exists and is configured correctly.` 
        }
      }
      
      return { 
        verified: false, 
        error: `DNS lookup failed: ${error.message}` 
      }
    }
    
    return { 
      verified: false, 
      error: 'DNS lookup failed: Unknown error' 
    }
  }
}


