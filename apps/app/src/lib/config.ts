'use server'

// Runtime configuration utility
export interface RuntimeConfig {
  medplumBaseUrl?: string
  medplumWsBaseUrl?: string
  authStytchPublicToken?: string
  authRedirectUrl?: string
  authCookiesAllowedDomain?: string
  storageMode?: string
  storageApiBaseUrl?: string
  environment?: string
}

// Get runtime configuration
export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  // Fallback to environment variables (for server-side or when runtime config is not available)
  return {
    medplumBaseUrl: process.env.MEDPLUM_BASE_URL || 'http://localhost:8103',
    medplumWsBaseUrl: process.env.MEDPLUM_WS_BASE_URL || 'ws://localhost:8103',
    authStytchPublicToken: process.env.AUTH_STYTCH_PUBLIC_TOKEN,
    authRedirectUrl: process.env.AUTH_REDIRECT_URL,
    authCookiesAllowedDomain: process.env.AUTH_COOKIES_ALLOWED_DOMAIN,
    storageMode: process.env.APP_STORAGE_MODE || 'local',
    storageApiBaseUrl: process.env.APP_API_BASE_URL || '',
    environment: process.env.ENVIRONMENT || 'development',
  }
}
