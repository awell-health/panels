import crypto from 'crypto'

export interface PKCEChallenge {
  verifier: string
  challenge: string
  method: 'S256'
}

/**
 * Generate PKCE challenge and verifier for SMART on FHIR OAuth flow
 * @returns Object containing verifier, challenge, and method
 */
export function generatePKCE(): PKCEChallenge {
  const verifier = crypto.randomBytes(32).toString('base64url')
  
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url')
  
  return {
    verifier,
    challenge,
    method: 'S256'
  }
}

/**
 * Generate cryptographically secure state parameter
 * @returns Random state string
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('hex')
}
