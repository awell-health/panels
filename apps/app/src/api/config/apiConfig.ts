import { getRuntimeConfig } from '@/lib/config'

// Cache for runtime config to avoid repeated server calls
let runtimeConfigCache: Awaited<ReturnType<typeof getRuntimeConfig>> | null =
  null

export const apiConfig = {
  // Dynamic getter for base URL that fetches from runtime config
  get baseUrl(): string {
    // This will be called synchronously, so we need to handle the async nature
    // For now, return empty string and let the async version handle it
    return ''
  },

  // Async version to get base URL from runtime config
  getBaseUrl: async (): Promise<string> => {
    if (!runtimeConfigCache) {
      runtimeConfigCache = await getRuntimeConfig()
    }
    return runtimeConfigCache.storageApiBaseUrl || ''
  },

  // Helper function to build full URLs (async version)
  buildUrl: async (path: string): Promise<string> => {
    const base = await apiConfig.getBaseUrl()
    const cleanBase = base.replace(/\/$/, '') // Remove trailing slash
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${cleanBase}${cleanPath}`
  },

  // Clear cache (useful for testing or when config changes)
  clearCache: (): void => {
    runtimeConfigCache = null
  },

  // Default fetch options that can be overridden
  defaultOptions: {
    headers: {
      'Content-Type': 'application/json',
    },
  } as RequestInit,
}

// Backward compatibility function for viewsAPI.ts
export const getApiConfig = async () => {
  return apiConfig
}

// Type for API fetch options
export type ApiOptions = RequestInit | undefined
