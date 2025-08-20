/**
 * Parse ID token payload without signature verification
 * For production use, implement proper JWT signature verification
 * @param idToken JWT ID token
 * @returns Parsed payload
 */
export function parseIdTokenPayload(idToken: string): Record<string, any> {
  try {
    const parts = idToken.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }

    const payload = parts[1]
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    return JSON.parse(decoded)
  } catch (error) {
    console.error('Failed to parse ID token:', error)
    throw new Error('Invalid ID token format')
  }
}

/**
 * Extract fhirUser from ID token payload
 * @param idToken JWT ID token
 * @returns fhirUser value or undefined
 */
export function extractFhirUser(idToken: string): string | undefined {
  try {
    const payload = parseIdTokenPayload(idToken)
    return payload.fhirUser || payload.profile || payload.sub
  } catch (error) {
    console.error('Failed to extract fhirUser:', error)
    return undefined
  }
}
