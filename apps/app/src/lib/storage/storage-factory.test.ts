import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  getStorageAdapter,
  getStorageConfig,
  getStorageMode,
  resetStorageAdapter,
} from './storage-factory'
import { STORAGE_MODES } from './types'

// Mock the adapters
vi.mock('../local-storage-adapter', () => ({
  LocalStorageAdapter: vi.fn(() => ({
    isLocalStorage: true,
  })),
}))

vi.mock('../api-storage-adapter', () => ({
  APIStorageAdapter: vi.fn(() => ({
    isApiStorage: true,
  })),
}))

// Mock the type adapters for API mode
vi.mock('../type-adapters', () => ({
  getApiConfig: vi.fn(() => ({
    tenantId: 'test-tenant',
    userId: 'test-user',
  })),
  validateApiConfig: vi.fn(),
}))

// Mock environment variables
const mockEnv = (envVars: Record<string, string | undefined>) => {
  for (const [key, value] of Object.entries(envVars)) {
    process.env[key] = value
  }
}

describe('Storage Factory', () => {
  beforeEach(() => {
    // Reset adapter instance before each test
    resetStorageAdapter()

    // Clear environment variables
    process.env.APP_STORAGE_MODE = undefined
    process.env.APP_API_BASE_URL = undefined
    process.env.APP_TENANT_ID = undefined
    process.env.APP_USER_ID = undefined

    vi.clearAllMocks()
  })

  describe('getStorageMode', () => {
    test('should default to local storage when no env var is set', () => {
      const mode = getStorageMode()
      expect(mode).toBe(STORAGE_MODES.LOCAL)
    })

    test('should return local storage for invalid values', () => {
      mockEnv({ APP_STORAGE_MODE: 'invalid' })
      const mode = getStorageMode()
      expect(mode).toBe(STORAGE_MODES.LOCAL)
    })

    test('should return api storage when explicitly set', () => {
      mockEnv({ APP_STORAGE_MODE: 'api' })
      const mode = getStorageMode()
      expect(mode).toBe(STORAGE_MODES.API)
    })

    test('should handle case insensitive values', () => {
      mockEnv({ APP_STORAGE_MODE: 'API' })
      const mode = getStorageMode()
      expect(mode).toBe(STORAGE_MODES.API)
    })
  })

  describe('getStorageAdapter', () => {
    test('should create LocalStorageAdapter by default', async () => {
      const adapter = await getStorageAdapter()

      expect(adapter).toHaveProperty('isLocalStorage', true)
    })

    test('should create LocalStorageAdapter when explicitly configured', async () => {
      mockEnv({ APP_STORAGE_MODE: 'local' })

      const adapter = await getStorageAdapter()

      expect(adapter).toHaveProperty('isLocalStorage', true)
    })

    test('should create APIStorageAdapter when configured for API mode with valid config', async () => {
      vi.stubEnv('APP_STORAGE_MODE', 'api')
      vi.stubEnv('APP_API_BASE_URL', 'http://localhost:3001')
      vi.stubEnv('APP_TENANT_ID', 'test-tenant')
      vi.stubEnv('APP_USER_ID', 'test-user')

      const adapter = await getStorageAdapter()

      expect(adapter).toHaveProperty('isApiStorage', true)
    })

    test('should return same instance on subsequent calls (singleton)', async () => {
      const adapter1 = await getStorageAdapter()
      const adapter2 = await getStorageAdapter()

      expect(adapter1).toBe(adapter2)
    })

    test('should create new instance after reset', async () => {
      const adapter1 = await getStorageAdapter()
      resetStorageAdapter()
      const adapter2 = await getStorageAdapter()

      expect(adapter1).not.toBe(adapter2)
    })
  })

  describe('getStorageConfig', () => {
    test('should return local storage config by default', () => {
      const config = getStorageConfig()

      expect(config).toEqual({
        mode: STORAGE_MODES.LOCAL,
        isApiMode: false,
        isLocalMode: true,
        apiConfig: undefined,
      })
    })

    test('should return API storage config when in API mode', () => {
      mockEnv({
        APP_STORAGE_MODE: 'api',
        APP_API_BASE_URL: 'http://localhost:3001',
        APP_TENANT_ID: 'test-tenant',
        APP_USER_ID: 'test-user',
      })

      const config = getStorageConfig()

      expect(config).toEqual({
        mode: STORAGE_MODES.API,
        isApiMode: true,
        isLocalMode: false,
        apiConfig: {
          baseUrl: 'http://localhost:3001',
          tenantId: 'test-tenant',
          userId: 'test-user',
        },
      })
    })

    test('should handle missing API config gracefully', () => {
      mockEnv({ APP_STORAGE_MODE: 'api' })

      const config = getStorageConfig()

      expect(config.apiConfig).toEqual({
        baseUrl: 'undefined',
        tenantId: 'undefined',
        userId: 'undefined',
      })
    })
  })
})
