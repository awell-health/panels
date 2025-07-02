import { APIStorageAdapter } from './api-storage-adapter'
import { ReactiveStorageAdapter } from './reactive-storage-adapter'
import type { StorageAdapter } from './types'

export const STORAGE_MODES = {
  API: 'api',
  REACTIVE: 'reactive',
} as const

export type StorageMode = (typeof STORAGE_MODES)[keyof typeof STORAGE_MODES]

export const getReactiveStorageModeIfAvailable = (
  mode?: StorageMode,
): StorageMode => {
  // Always use reactive storage for API mode
  if (mode === STORAGE_MODES.API) {
    return STORAGE_MODES.REACTIVE
  }
  return mode || STORAGE_MODES.REACTIVE
}

/**
 * Create a storage adapter based on environment configuration
 */
export const createStorageAdapter = async (
  userId?: string,
  organizationSlug?: string,
  mode?: StorageMode,
  cacheConfig?: {
    enabled?: boolean
    duration?: number
  },
): Promise<StorageAdapter> => {
  const modeOrReactive = getReactiveStorageModeIfAvailable(mode)

  switch (modeOrReactive) {
    case STORAGE_MODES.REACTIVE: {
      return new ReactiveStorageAdapter(userId, organizationSlug)
    }

    case STORAGE_MODES.API: {
      return new APIStorageAdapter(userId, organizationSlug, cacheConfig)
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
  mode?: StorageMode,
  organizationSlug?: string,
): Promise<StorageAdapter> => {
  // Create a unique key for this configuration
  const key = `${mode}-${userId || 'no-user'}-${organizationSlug || 'no-org'}`

  // Check if we already have an instance for this configuration
  const existingInstance = storageInstances.get(key)
  if (existingInstance) {
    return existingInstance
  }

  // Create new instance based on mode
  let adapter: StorageAdapter
  const modeOrReactive = getReactiveStorageModeIfAvailable(mode)

  switch (modeOrReactive) {
    case STORAGE_MODES.REACTIVE: {
      adapter = new ReactiveStorageAdapter(userId, organizationSlug)
      break
    }

    case STORAGE_MODES.API: {
      adapter = new APIStorageAdapter(userId, organizationSlug)
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
