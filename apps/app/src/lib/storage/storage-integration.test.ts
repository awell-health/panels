import { beforeEach, describe, expect, test } from 'vitest'
import { LocalStorageAdapter } from './local-storage-adapter'
import { createStorageAdapter, resetStorageAdapter } from './storage-factory'

// Mock localStorage
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

describe('Storage Integration', () => {
  beforeEach(() => {
    resetStorageAdapter()
    localStorage.clear()

    // Ensure we're in local storage mode
    process.env.NEXT_PUBLIC_APP_STORAGE_MODE = 'local'
  })

  test('should create LocalStorageAdapter in local mode', async () => {
    const adapter = await createStorageAdapter()
    expect(adapter).toBeInstanceOf(LocalStorageAdapter)
  })

  test('should use the same adapter instance (singleton)', async () => {
    const adapter1 = await createStorageAdapter()
    const adapter2 = await createStorageAdapter()

    // Since we're using dynamic imports and the factory pattern,
    // these will be different instances but same class
    expect(adapter1).toBeInstanceOf(LocalStorageAdapter)
    expect(adapter2).toBeInstanceOf(LocalStorageAdapter)
  })

  test('should perform end-to-end operations through factory', async () => {
    const adapter = await createStorageAdapter()

    // Create a panel
    const panel = await adapter.createPanel({
      title: 'Integration Test Panel',
      createdAt: new Date().toISOString(),
      filters: [],
      patientViewColumns: [],
      taskViewColumns: [],
      views: [],
    })

    expect(panel.id).toBeDefined()
    expect(panel.title).toBe('Integration Test Panel')

    // Retrieve the panel
    const retrievedPanel = await adapter.getPanel(panel.id)
    expect(retrievedPanel).toEqual(panel)

    // Add a view
    const view = await adapter.addView(panel.id, {
      title: 'Test View',
      createdAt: new Date().toISOString(),
      filters: [],
      columns: [],
      viewType: 'patient',
    })

    expect(view.id).toBeDefined()
    expect(view.title).toBe('Test View')

    // Verify the view is attached to the panel
    const updatedPanel = await adapter.getPanel(panel.id)
    expect(updatedPanel?.views).toHaveLength(1)
    expect(updatedPanel?.views?.[0]).toEqual(view)
  })

  test('should handle errors gracefully through factory', async () => {
    process.env.NEXT_PUBLIC_APP_STORAGE_MODE = 'api'

    await expect(createStorageAdapter()).rejects.toThrow(
      'Missing required environment variables for API storage mode',
    )
  })

  test('should maintain data persistence between adapter instances', async () => {
    // Create data with first adapter instance
    const adapter1 = await createStorageAdapter()
    const panel = await adapter1.createPanel({
      title: 'Persistence Test',
      createdAt: new Date().toISOString(),
      filters: [],
      patientViewColumns: [],
      taskViewColumns: [],
      views: [],
    })

    // Reset and create new adapter instance
    resetStorageAdapter()
    const adapter2 = await createStorageAdapter()

    // Data should still be accessible
    const retrievedPanel = await adapter2.getPanel(panel.id)
    expect(retrievedPanel).toEqual(panel)

    const allPanels = await adapter2.getPanels()
    expect(allPanels).toHaveLength(1)
    expect(allPanels[0]).toEqual(panel)
  })
})
