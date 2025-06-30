import type { PanelDefinition, ViewDefinition } from '@/types/worklist'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { LocalStorageAdapter } from './local-storage-adapter'

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

// Mock console.error to avoid noise in tests
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter

  const mockPanel: Omit<PanelDefinition, 'id'> = {
    title: 'Test Panel',
    createdAt: '2024-01-01T00:00:00.000Z',
    filters: [],
    patientViewColumns: [
      {
        id: 'name',
        key: 'name',
        name: 'Patient Name',
        type: 'string',
        description: 'Patient name',
      },
    ],
    taskViewColumns: [
      {
        id: 'taskId',
        key: 'id',
        name: 'Task ID',
        type: 'string',
        description: 'Task ID',
      },
    ],
    views: [],
  }

  const mockView: Omit<ViewDefinition, 'id'> = {
    title: 'Test View',
    createdAt: '2024-01-01T00:00:00.000Z',
    filters: [],
    columns: [
      {
        id: 'col1',
        key: 'col1',
        name: 'Column 1',
        type: 'string',
        description: 'Test column',
      },
    ],
    viewType: 'patient',
  }

  beforeEach(() => {
    adapter = new LocalStorageAdapter()
    localStorage.clear()
    consoleSpy.mockClear()
  })

  describe('Panel Operations', () => {
    test('should return empty array when no panels exist', async () => {
      const panels = await adapter.getPanels()
      expect(panels).toEqual([])
    })

    test('should create a panel with generated ID and timestamp', async () => {
      const createdPanel = await adapter.createPanel(mockPanel)

      expect(createdPanel).toEqual({
        ...mockPanel,
        id: expect.any(String),
        createdAt: expect.any(String),
      })
      expect(createdPanel.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      )
    })

    test('should save and retrieve panels from localStorage', async () => {
      const createdPanel = await adapter.createPanel(mockPanel)
      const panels = await adapter.getPanels()

      expect(panels).toHaveLength(1)
      expect(panels[0]).toEqual(createdPanel)
    })

    test('should get a specific panel by ID', async () => {
      const createdPanel = await adapter.createPanel(mockPanel)
      const retrievedPanel = await adapter.getPanel(createdPanel.id)

      expect(retrievedPanel).toEqual(createdPanel)
    })

    test('should return null for non-existent panel', async () => {
      const panel = await adapter.getPanel('non-existent-id')
      expect(panel).toBeNull()
    })

    test('should update an existing panel', async () => {
      const createdPanel = await adapter.createPanel(mockPanel)

      await adapter.updatePanel(createdPanel.id, {
        title: 'Updated Panel Title',
      })

      const updatedPanel = await adapter.getPanel(createdPanel.id)
      expect(updatedPanel?.title).toBe('Updated Panel Title')
    })

    test('should delete a panel', async () => {
      const createdPanel = await adapter.createPanel(mockPanel)

      await adapter.deletePanel(createdPanel.id)

      const panels = await adapter.getPanels()
      expect(panels).toHaveLength(0)
    })

    test('should handle multiple panels', async () => {
      const panel1 = await adapter.createPanel({
        ...mockPanel,
        title: 'Panel 1',
      })
      const panel2 = await adapter.createPanel({
        ...mockPanel,
        title: 'Panel 2',
      })

      const panels = await adapter.getPanels()
      expect(panels).toHaveLength(2)
      expect(panels.map((p) => p.title)).toEqual(['Panel 1', 'Panel 2'])
    })
  })

  describe('View Operations', () => {
    let panelId: string

    beforeEach(async () => {
      const panel = await adapter.createPanel(mockPanel)
      panelId = panel.id
    })

    test('should add a view to a panel', async () => {
      const createdView = await adapter.addView(panelId, mockView)

      expect(createdView).toEqual({
        ...mockView,
        id: expect.any(String),
        createdAt: expect.any(String),
      })
      expect(createdView.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      )
    })

    test('should retrieve a view from a panel', async () => {
      const createdView = await adapter.addView(panelId, mockView)
      const retrievedView = await adapter.getView(panelId, createdView.id)

      expect(retrievedView).toEqual(createdView)
    })

    test('should return null for non-existent view', async () => {
      const view = await adapter.getView(panelId, 'non-existent-view-id')
      expect(view).toBeNull()
    })

    test('should return null for view in non-existent panel', async () => {
      const view = await adapter.getView('non-existent-panel-id', 'view-id')
      expect(view).toBeNull()
    })

    test('should update an existing view', async () => {
      const createdView = await adapter.addView(panelId, mockView)

      await adapter.updateView(panelId, createdView.id, {
        title: 'Updated View Title',
      })

      const updatedView = await adapter.getView(panelId, createdView.id)
      expect(updatedView?.title).toBe('Updated View Title')
    })

    test('should delete a view from a panel', async () => {
      const createdView = await adapter.addView(panelId, mockView)

      await adapter.deleteView(panelId, createdView.id)

      const deletedView = await adapter.getView(panelId, createdView.id)
      expect(deletedView).toBeNull()
    })

    test('should handle multiple views in a panel', async () => {
      const view1 = await adapter.addView(panelId, {
        ...mockView,
        title: 'View 1',
      })
      const view2 = await adapter.addView(panelId, {
        ...mockView,
        title: 'View 2',
      })

      const panel = await adapter.getPanel(panelId)
      expect(panel?.views).toHaveLength(2)
      expect(panel?.views?.map((v) => v.title)).toEqual(['View 1', 'View 2'])
    })
  })

  describe('Error Handling', () => {
    test('should handle localStorage getItem errors gracefully', async () => {
      const originalGetItem = localStorage.getItem
      localStorage.getItem = vi.fn(() => {
        throw new Error('localStorage error')
      })

      const panels = await adapter.getPanels()
      expect(panels).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading panels from localStorage:',
        expect.any(Error),
      )

      localStorage.getItem = originalGetItem
    })

    test('should handle localStorage setItem errors', async () => {
      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn(() => {
        throw new Error('localStorage quota exceeded')
      })

      await expect(adapter.createPanel(mockPanel)).rejects.toThrow(
        'Failed to save panels to localStorage',
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error saving panels to localStorage:',
        expect.any(Error),
      )

      localStorage.setItem = originalSetItem
    })

    test('should handle invalid JSON in localStorage', async () => {
      localStorage.setItem('panel-definitions', 'invalid json')

      const panels = await adapter.getPanels()
      expect(panels).toEqual([])
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    test('should report not loading by default', () => {
      expect(adapter.isLoading()).toBe(false)
    })
  })

  describe('Data Persistence', () => {
    test('should maintain data structure compatibility with usePanelStore', async () => {
      // Create a panel with views using the adapter
      const panel = await adapter.createPanel(mockPanel)
      const view = await adapter.addView(panel.id, mockView)

      // Verify the data structure in localStorage matches expectations
      const storedData = localStorage.getItem('panel-definitions')
      expect(storedData).toBeDefined()

      const parsedData = JSON.parse(storedData as string)
      expect(parsedData).toHaveLength(1)
      expect(parsedData[0]).toEqual({
        ...panel,
        views: [view],
      })
    })
  })
})
