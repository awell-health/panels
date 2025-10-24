/**
 * Cache status utilities for development
 */

export function getCacheStatus() {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return {
    environment: process.env.NODE_ENV,
    cachingEnabled: !isDevelopment,
    message: isDevelopment
      ? '🔧 Caching is DISABLED in development - all data is fetched fresh on every request'
      : '✅ Caching is ENABLED in production - data is cached according to revalidate settings',
  }
}

export function logCacheStatus() {
  const status = getCacheStatus()
  console.log(`[CACHE STATUS] ${status.message}`)
  return status
}
