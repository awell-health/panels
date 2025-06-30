import { createStytchB2BUIClient } from '@stytch/nextjs/b2b/ui'
import { getRuntimeConfig } from './config'

// Global variable to store the Stytch client instance
let stytchClientInstance: ReturnType<typeof createStytchB2BUIClient> | null = null

/**
 * Get or create the Stytch client instance
 * This ensures only one instance is created globally
 */
export async function getStytchClient() {
  // Return existing instance if available
  if (stytchClientInstance) {
    return stytchClientInstance
  }

  // Get configuration
  const config = await getRuntimeConfig()
  const { authStytchPublicToken, authCookiesAllowedDomain } = config

  if (!authStytchPublicToken || !authCookiesAllowedDomain) {
    console.log(
      'AUTH_STYTCH_PUBLIC_TOKEN or AUTH_COOKIES_ALLOWED_DOMAIN is not available in runtime config',
    )
    return null
  }

  // Create new instance
  stytchClientInstance = createStytchB2BUIClient(authStytchPublicToken, {
    cookieOptions: {
      opaqueTokenCookieName: 'stytch_session',
      domain: authCookiesAllowedDomain,
      availableToSubdomains: true,
    },
  })

  return stytchClientInstance
}

/**
 * Clear the Stytch client instance (useful for testing or cleanup)
 */
export function clearStytchClient() {
  stytchClientInstance = null
} 