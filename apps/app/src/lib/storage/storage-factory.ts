import { APIStorageAdapter } from './api-storage-adapter'
import { LocalStorageAdapter } from './local-storage-adapter'
import type { StorageAdapter } from './types'

export const STORAGE_MODES = {
  LOCAL: 'local',
  API: 'api',
} as const

export type StorageMode = (typeof STORAGE_MODES)[keyof typeof STORAGE_MODES]

/**
 * Get the storage mode from environment variables
 */
export const getStorageMode = (): StorageMode => {
  const mode = process.env.NEXT_PUBLIC_APP_STORAGE_MODE
  return mode === STORAGE_MODES.API ? STORAGE_MODES.API : STORAGE_MODES.LOCAL
}

/**
 * Get storage configuration from environment variables
 */
export const getStorageConfig = () => {
  const mode = getStorageMode()

  if (mode === STORAGE_MODES.API) {
    return {
      mode: STORAGE_MODES.API,
      apiConfig: {
        baseUrl: process.env.NEXT_PUBLIC_APP_API_BASE_URL || '',
        tenantId: process.env.NEXT_PUBLIC_APP_TENANT_ID || '',
        userId: process.env.NEXT_PUBLIC_APP_USER_ID || '',
      },
    }
  }

  return {
    mode: STORAGE_MODES.LOCAL,
  }
}

/**
 * Validate environment configuration for the given storage mode
 */
const validateEnvironmentConfig = (mode: StorageMode): void => {
  if (mode === STORAGE_MODES.API) {
    const requiredVars = [
      'NEXT_PUBLIC_APP_API_BASE_URL',
      'NEXT_PUBLIC_APP_TENANT_ID',
      'NEXT_PUBLIC_APP_USER_ID',
    ]

    const missingVars = requiredVars.filter((varName) => !process.env[varName])

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables for API storage mode: ${missingVars.join(', ')}`,
      )
    }
  }
}

/**
 * Create a storage adapter based on environment configuration
 */
export const createStorageAdapter = async (cacheConfig?: {
  enabled?: boolean
  duration?: number
}): Promise<StorageAdapter> => {
  const mode = getStorageMode()

  // Validate environment configuration
  validateEnvironmentConfig(mode)

  switch (mode) {
    case STORAGE_MODES.API: {
      return new APIStorageAdapter(cacheConfig)
    }

    case STORAGE_MODES.LOCAL: {
      return new LocalStorageAdapter()
    }

    default: {
      throw new Error(`Unknown storage mode: ${mode}`)
    }
  }
}

/**
 * Singleton instance for consistent usage across the application
 */
let storageInstance: StorageAdapter | null = null
let storagePromise: Promise<StorageAdapter> | null = null

/**
 * Get the storage adapter instance (singleton pattern with race condition protection)
 * This ensures the same adapter is used throughout the application
 */
export const getStorageAdapter = async (): Promise<StorageAdapter> => {
  const mode = getStorageMode()

  if (mode === STORAGE_MODES.API) {
    return new APIStorageAdapter()
  }

  return new LocalStorageAdapter()
}

/**
 * Reset the storage adapter instance
 * Useful for testing or when switching storage modes
 */
export const resetStorageAdapter = (): void => {
  storageInstance = null
  storagePromise = null
}
