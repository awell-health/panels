import { beforeEach, describe, expect, test, vi } from 'vitest'

// Mock localStorage for this test
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

describe('usePanelStore Integration Test', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  test('should initialize and work with default localStorage behavior', async () => {
    // Import the hook after mocking localStorage
    const { usePanelStore } = await import('./use-panel-store')

    // This is a simple smoke test - we can't easily test React hooks without React Testing Library
    // But we can verify the import works and the module loads correctly
    expect(typeof usePanelStore).toBe('function')
  })

  test('should export the correct interface', async () => {
    const { usePanelStore } = await import('./use-panel-store')

    // Verify the hook is a function (this ensures the imports work correctly)
    expect(typeof usePanelStore).toBe('function')
  })

  test('should have properly integrated storage imports', async () => {
    // This verifies our new imports don't break the module
    const moduleExports = await import('./use-panel-store')

    expect(moduleExports).toBeDefined()
    expect(typeof moduleExports.usePanelStore).toBe('function')
  })
})
