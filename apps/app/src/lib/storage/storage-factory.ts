import { APIStorageAdapter } from './api-storage-adapter'
import { LocalStorageAdapter } from './local-storage-adapter'
import { ReactiveStorageAdapter } from './reactive-storage-adapter'
import type { StorageAdapter } from './types'
import { isFeatureEnabled } from '@/utils/featureFlags'

export const STORAGE_MODES = {
  LOCAL: 'local',
  API: 'api',
  REACTIVE: 'reactive',
} as const

export type StorageMode = (typeof STORAGE_MODES)[keyof typeof STORAGE_MODES]

/**
 * Get the storage mode from environment variables
 */
export const getStorageMode = (): StorageMode => {
  // Check if reactive storage is enabled via feature flag
  if (isFeatureEnabled('ENABLE_REACTIVE_DATA_STORAGE')) {
    return STORAGE_MODES.REACTIVE
  }

  const mode = process.env.NEXT_PUBLIC_APP_STORAGE_MODE
  return mode === STORAGE_MODES.API ? STORAGE_MODES.API : STORAGE_MODES.LOCAL
}

/**
 * Get storage configuration from environment variables
 */
export const getStorageConfig = () => {
  const mode = getStorageMode()

  if (mode === STORAGE_MODES.LOCAL) {
    return {
      mode: STORAGE_MODES.LOCAL,
    }
  }

  if (mode === STORAGE_MODES.REACTIVE) {
    return {
      mode: STORAGE_MODES.REACTIVE,
    }
  }

  return {
    mode: STORAGE_MODES.API,
    apiConfig: {
      baseUrl: process.env.NEXT_PUBLIC_APP_API_BASE_URL || '',
    },
  }
}

/**
 * Validate environment configuration for the given storage mode
 */
const validateEnvironmentConfig = (mode: StorageMode): void => {
  if (mode === STORAGE_MODES.API) {
    const requiredVars = ['NEXT_PUBLIC_APP_API_BASE_URL']

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
export const createStorageAdapter = async (
  userId?: string,
  organizationSlug?: string,
  cacheConfig?: {
    enabled?: boolean
    duration?: number
  },
): Promise<StorageAdapter> => {
  const mode = getStorageMode()

  // Validate environment configuration
  validateEnvironmentConfig(mode)

  switch (mode) {
    case STORAGE_MODES.REACTIVE: {
      return new ReactiveStorageAdapter(userId, organizationSlug)
    }

    case STORAGE_MODES.API: {
      return new APIStorageAdapter(userId, organizationSlug, cacheConfig)
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
 * Singleton instances for consistent usage across the application
 */
const storageInstances = new Map<string, StorageAdapter>()

/**
 * Get the storage adapter instance (singleton pattern with race condition protection)
 * This ensures the same adapter is used throughout the application
 */
export const getStorageAdapter = async (
  userId?: string,
  organizationSlug?: string,
): Promise<StorageAdapter> => {
  const mode = getStorageMode()

  // Create a unique key for this configuration
  const key = `${mode}-${userId || 'no-user'}-${organizationSlug || 'no-org'}`

  // Check if we already have an instance for this configuration
  const existingInstance = storageInstances.get(key)
  if (existingInstance) {
    return existingInstance
  }

  // Create new instance based on mode
  let adapter: StorageAdapter

  switch (mode) {
    case STORAGE_MODES.REACTIVE: {
      adapter = new ReactiveStorageAdapter(userId, organizationSlug)
      break
    }

    case STORAGE_MODES.API: {
      adapter = new APIStorageAdapter(userId, organizationSlug)
      break
    }

    case STORAGE_MODES.LOCAL: {
      adapter = new LocalStorageAdapter()
      break
    }

    default: {
      throw new Error(`Unknown storage mode: ${mode}`)
    }
  }

  // Store the instance for future use
  storageInstances.set(key, adapter)
  return adapter
}

/**
 * Reset the storage adapter instances
 * Useful for testing or when switching storage modes
 */
export const resetStorageAdapter = (): void => {
  storageInstances.clear()
}
