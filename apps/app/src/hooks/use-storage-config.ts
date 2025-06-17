import { useCallback, useMemo, useState } from 'react'

interface StorageCacheConfig {
  enabled: boolean
  duration: number // in milliseconds
}

interface StorageConfigOptions {
  cache?: Partial<StorageCacheConfig>
}

const DEFAULT_CACHE_CONFIG: StorageCacheConfig = {
  enabled: true,
  duration: 5 * 60 * 1000, // 5 minutes
}

/**
 * Hook to manage configurable storage settings
 * Allows runtime configuration of caching behavior
 */
export function useStorageConfig(options?: StorageConfigOptions) {
  const [cacheConfig, setCacheConfig] = useState<StorageCacheConfig>(() => ({
    ...DEFAULT_CACHE_CONFIG,
    ...options?.cache,
  }))

  const updateCacheConfig = useCallback(
    (updates: Partial<StorageCacheConfig>) => {
      setCacheConfig((prev) => ({ ...prev, ...updates }))
    },
    [],
  )

  const resetCacheConfig = useCallback(() => {
    setCacheConfig(DEFAULT_CACHE_CONFIG)
  }, [])

  // Pre-configured cache durations - stable reference
  const presetDurations = useMemo(
    () => ({
      off: 0,
      short: 2 * 60 * 1000, // 2 minutes
      medium: 5 * 60 * 1000, // 5 minutes (default)
      long: 15 * 60 * 1000, // 15 minutes
      extended: 60 * 60 * 1000, // 1 hour
    }),
    [],
  )

  const setPresetDuration = useCallback(
    (preset: keyof typeof presetDurations) => {
      const duration = presetDurations[preset]
      setCacheConfig((prev) => ({
        ...prev,
        duration,
        enabled: duration > 0,
      }))
    },
    [presetDurations],
  )

  const formatDuration = useCallback((ms: number) => {
    if (ms === 0) return 'Disabled'
    const minutes = Math.floor(ms / (1000 * 60))
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }, [])

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      cacheConfig,
      updateCacheConfig,
      resetCacheConfig,
      presetDurations,
      setPresetDuration,
      formatDuration,
      // Convenience getters
      isCacheEnabled: cacheConfig.enabled,
      cacheDurationMs: cacheConfig.duration,
      cacheDurationText: formatDuration(cacheConfig.duration),
    }),
    [
      cacheConfig,
      updateCacheConfig,
      resetCacheConfig,
      presetDurations,
      setPresetDuration,
      formatDuration,
    ],
  )
}
