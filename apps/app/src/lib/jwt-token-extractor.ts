import { getStytchClient } from './stytch-client'

/**
 * Service for managing session tokens from Stytch authentication
 * Note: Stytch B2B UI client doesn't directly expose JWT tokens
 * We'll use the session token as our authentication token
 */
export class JWTTokenService {
  private static instance: JWTTokenService
  private tokenCache: string | null = null
  private tokenExpiry: number | null = null

  private constructor() {}

  static getInstance(): JWTTokenService {
    if (!JWTTokenService.instance) {
      JWTTokenService.instance = new JWTTokenService()
    }
    return JWTTokenService.instance
  }

  /**
   * Get the current session token from Stytch
   * @returns Promise<string | null> - Session token or null if not available
   */
  async getToken(): Promise<string | null> {
    try {
      // Check if we have a cached token that's still valid
      if (
        this.tokenCache &&
        this.tokenExpiry &&
        Date.now() < this.tokenExpiry
      ) {
        return this.tokenCache
      }

      const stytchClient = await getStytchClient()
      if (!stytchClient) {
        console.warn('Stytch client not available')
        return null
      }

      // Get the current session
      const session = await stytchClient.session.authenticate()

      if (session.session_jwt) {
        // Cache the token and set expiry (sessions typically last 24 hours)
        this.tokenCache = session.session_jwt
        this.tokenExpiry = Date.now() + 24 * 60 * 60 * 1000 // 24 hours from now

        return session.session_jwt
      }

      return null
    } catch (error) {
      console.error('Failed to get session token:', error)
      this.clearCache()
      return null
    }
  }

  /**
   * Get authorization header with session token
   * @returns Promise<string | null> - Authorization header or null if no token
   */
  async getAuthorizationHeader(): Promise<string | null> {
    const token = await this.getToken()
    return token ? `Bearer ${token}` : null
  }

  /**
   * Clear the cached token (useful for logout or token refresh)
   */
  clearCache(): void {
    this.tokenCache = null
    this.tokenExpiry = null
  }

  /**
   * Check if we have a valid cached token
   */
  hasValidToken(): boolean {
    return !!(
      this.tokenCache &&
      this.tokenExpiry &&
      Date.now() < this.tokenExpiry
    )
  }
}

// Export singleton instance
export const jwtTokenService = JWTTokenService.getInstance()
