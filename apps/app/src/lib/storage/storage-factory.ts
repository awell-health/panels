import { APIStorageAdapter } from './api-storage-adapter'
import { LocalStorageAdapter } from './local-storage-adapter'
import type { StorageAdapter } from './types'

export const STORAGE_MODES = {
  LOCAL: 'local',
  API: 'api',
} as const

export type StorageMode = (typeof STORAGE_MODES)[keyof typeof STORAGE_MODES]

/**
 * Create a storage adapter based on environment configuration
 */
export const createStorageAdapter = async (userId?: string, organizationSlug?: string, mode?: StorageMode, cacheConfig?: {
  enabled?: boolean
  duration?: number
}): Promise<StorageAdapter> => {

  switch (mode) {
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
 * Singleton instance for consistent usage across the application
 */
let storageInstance: StorageAdapter | null = null
let storagePromise: Promise<StorageAdapter> | null = null

/**
 * Get the storage adapter instance (singleton pattern with race condition protection)
 * This ensures the same adapter is used throughout the application
 */
export const getStorageAdapter = async (userId?: string, mode?: StorageMode, organizationSlug?: string): Promise<StorageAdapter> => {

  if (mode === STORAGE_MODES.API) {
    return new APIStorageAdapter(userId, organizationSlug)
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
