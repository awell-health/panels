import type { PanelDefinition, ViewDefinition } from '@/types/worklist'
import { type Mock, beforeEach, describe, expect, test, vi } from 'vitest'
import { APIStorageAdapter } from './api-storage-adapter'

// Mock the API modules
vi.mock('@/api/panelsAPI', () => ({
  panelsAPI: {
    all: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    columns: {
      list: vi.fn(),
    },
  },
}))

vi.mock('@/api/viewsAPI', () => ({
  viewsAPI: {
    all: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock the type adapters
vi.mock('../type-adapters', () => ({
  getApiConfig: vi.fn(() => ({
    tenantId: 'test-tenant',
    userId: 'test-user',
  })),
  validateApiConfig: vi.fn(),
  adaptBackendToFrontend: vi.fn(
    (
      panel: { id: number; name: string; createdAt: Date },
      columns?: unknown,
      views?: unknown[],
    ) => ({
      id: panel.id.toString(),
      title: panel.name,
      createdAt: panel.createdAt.toISOString(),
      filters: [],
      patientViewColumns: [
        {
          id: 'name',
          key: 'name',
          name: 'Patient Name',
          type: 'string' as const,
          description: "Patient's full name",
        },
      ],
      taskViewColumns: [
        {
          id: 'taskId',
          key: 'id',
          name: 'Task ID',
          type: 'string' as const,
          description: 'Task identifier',
        },
      ],
      views: views || [],
    }),
  ),
  adaptFrontendToBackend: vi.fn(
    (
      panel: { title: string; createdAt: string },
      config: { tenantId: string; userId: string },
    ) => ({
      name: panel.title,
      description: `Panel created: ${panel.createdAt}`,
      tenantId: config.tenantId,
      userId: config.userId,
    }),
  ),
  adaptFrontendViewToBackend: vi.fn(
    (
      view: {
        title: string
        createdAt: string
        columns: { id: string }[]
        viewType: string
      },
      panelId: number,
      config: { tenantId: string; userId: string },
    ) => ({
      name: view.title,
      description: `View created: ${view.createdAt}`,
      panelId: panelId,
      config: {
        columns: view.columns.map((col: { id: string }) => col.id),
        layout: 'table' as const,
      },
      metadata: {
        viewType: view.viewType,
      },
      tenantId: config.tenantId,
      userId: config.userId,
    }),
  ),
  adaptBackendPanelsToFrontend: vi.fn(
    (panels: { id: number; name: string; createdAt: Date }[]) =>
      panels.map((panel: { id: number; name: string; createdAt: Date }) => ({
        id: panel.id.toString(),
        title: panel.name,
        createdAt: panel.createdAt.toISOString(),
        filters: [],
        patientViewColumns: [
          {
            id: 'name',
            key: 'name',
            name: 'Patient Name',
            type: 'string' as const,
            description: "Patient's full name",
          },
        ],
        taskViewColumns: [
          {
            id: 'taskId',
            key: 'id',
            name: 'Task ID',
            type: 'string' as const,
            description: 'Task identifier',
          },
        ],
        views: [],
      })),
  ),
}))

interface MockAPI {
  [key: string]: Mock | MockAPI
}

describe.skip('APIStorageAdapter', () => {
  let adapter: APIStorageAdapter
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  let mockPanelsAPI: any
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  let mockViewsAPI: any

  const mockBackendPanel = {
    id: 1,
    name: 'Test Panel',
    description: 'Test Description',
    tenantId: 'test-tenant',
    userId: 'test-user',
    cohortRule: {
      conditions: [],
      logic: 'AND' as const,
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  const mockBackendView = {
    id: 1,
    name: 'Test View',
    description: 'Test View Description',
    panelId: 1,
    userId: 'test-user',
    tenantId: 'test-tenant',
    isPublished: false,
    config: {
      columns: ['name', 'age'],
      layout: 'table' as const,
    },
    metadata: {
      viewType: 'patient',
    },
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('APP_STORAGE_MODE', 'api')
    vi.stubEnv('APP_API_BASE_URL', 'http://localhost:3001')
    vi.stubEnv('APP_TENANT_ID', 'test-tenant')
    vi.stubEnv('APP_USER_ID', 'test-user')

    // Get the mocked APIs with type assertions to bypass complex typing
    const { panelsAPI } = await import('@/api/panelsAPI')
    const { viewsAPI } = await import('@/api/viewsAPI')
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    mockPanelsAPI = panelsAPI as any
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    mockViewsAPI = viewsAPI as any

    // Setup default mock responses for the enhanced API calls
    mockPanelsAPI.columns.list.mockResolvedValue(null) // No columns by default
    mockViewsAPI.all.mockResolvedValue({ total: 0, views: [] }) // No views by default

    adapter = new APIStorageAdapter()
  })

  describe('Panel Operations', () => {
    test('should fetch all panels from API', async () => {
      mockPanelsAPI.all.mockResolvedValue([mockBackendPanel])

      const panels = await adapter.getPanels()

      expect(mockPanelsAPI.all).toHaveBeenCalledWith('test-tenant', 'test-user')
      expect(panels).toHaveLength(1)
      expect(panels[0]).toEqual({
        id: '1',
        title: 'Test Panel',
        createdAt: '2024-01-01T00:00:00.000Z',
        filters: [],
        patientViewColumns: expect.any(Array),
        taskViewColumns: expect.any(Array),
        views: [],
      })
    })

    test('should get a specific panel by ID', async () => {
      mockPanelsAPI.get.mockResolvedValue(mockBackendPanel)

      const panel = await adapter.getPanel('1')

      expect(mockPanelsAPI.get).toHaveBeenCalledWith({ id: '1' })
      expect(panel).toEqual({
        id: '1',
        title: 'Test Panel',
        createdAt: '2024-01-01T00:00:00.000Z',
        filters: [],
        patientViewColumns: expect.any(Array),
        taskViewColumns: expect.any(Array),
        views: [],
      })
    })

    test('should return null for non-existent panel', async () => {
      mockPanelsAPI.get.mockRejectedValue(new Error('404 Not Found'))

      const panel = await adapter.getPanel('999')

      expect(panel).toBeNull()
    })

    test('should create a new panel', async () => {
      const newPanel: Omit<PanelDefinition, 'id'> = {
        title: 'New Panel',
        createdAt: new Date().toISOString(),
        filters: [],
        patientViewColumns: [],
        taskViewColumns: [],
        views: [],
      }

      mockPanelsAPI.create.mockResolvedValue({
        ...mockBackendPanel,
        id: 2,
        name: 'New Panel',
      })

      const createdPanel = await adapter.createPanel(newPanel)

      expect(mockPanelsAPI.create).toHaveBeenCalledWith({
        name: 'New Panel',
        description: expect.stringContaining('Panel created:'),
        tenantId: 'test-tenant',
        userId: 'test-user',
      })
      expect(createdPanel.id).toBe('2')
      expect(createdPanel.title).toBe('New Panel')
    })

    test('should update an existing panel', async () => {
      // Mock getting the current panel
      mockPanelsAPI.get.mockResolvedValue(mockBackendPanel)
      mockPanelsAPI.update.mockResolvedValue(undefined)

      await adapter.updatePanel('1', { title: 'Updated Panel' })

      expect(mockPanelsAPI.get).toHaveBeenCalledWith({ id: '1' })
      expect(mockPanelsAPI.update).toHaveBeenCalledWith({
        id: '1',
        name: 'Updated Panel',
        description: expect.stringContaining('Panel created:'),
        tenantId: 'test-tenant',
        userId: 'test-user',
      })
    })

    test('should delete a panel', async () => {
      mockPanelsAPI.delete.mockResolvedValue(undefined)

      await adapter.deletePanel('1')

      expect(mockPanelsAPI.delete).toHaveBeenCalledWith({
        id: '1',
        tenantId: 'test-tenant',
        userId: 'test-user',
      })
    })

    test('should handle API errors gracefully', async () => {
      mockPanelsAPI.all.mockRejectedValue(new Error('Network error'))

      await expect(adapter.getPanels()).rejects.toThrow('Failed to load panels')
    })
  })

  describe('View Operations', () => {
    test('should add a view to a panel', async () => {
      const newView: Omit<ViewDefinition, 'id'> = {
        title: 'New View',
        createdAt: new Date().toISOString(),
        filters: [],
        columns: [
          {
            id: 'name',
            key: 'name',
            name: 'Name',
            type: 'string',
            description: 'Name column',
          },
        ],
        viewType: 'patient',
      }

      mockViewsAPI.create.mockResolvedValue({
        ...mockBackendView,
        id: 2,
        name: 'New View',
      })

      const createdView = await adapter.addView('1', newView)

      expect(mockViewsAPI.create).toHaveBeenCalledWith({
        name: 'New View',
        description: expect.stringContaining('View created:'),
        panelId: 1,
        config: {
          columns: ['name'],
          layout: 'table',
        },
        metadata: {
          viewType: 'patient',
        },
        tenantId: 'test-tenant',
        userId: 'test-user',
      })
      expect(createdView.id).toBe('2')
      expect(createdView.title).toBe('New View')
    })

    test('should get a specific view', async () => {
      mockViewsAPI.get.mockResolvedValue(mockBackendView)

      const view = await adapter.getView('1', '1')

      expect(mockViewsAPI.get).toHaveBeenCalledWith({ id: '1' })
      expect(view).toEqual({
        id: '1',
        title: 'Test View',
        createdAt: expect.any(String),
        filters: [],
        columns: expect.any(Array),
        viewType: 'patient',
      })
    })

    test('should return null for non-existent view', async () => {
      mockViewsAPI.get.mockRejectedValue(new Error('404 Not Found'))

      const view = await adapter.getView('1', '999')

      expect(view).toBeNull()
    })

    test('should update an existing view', async () => {
      // Mock getting current view and updating
      mockViewsAPI.get.mockResolvedValue(mockBackendView)
      mockViewsAPI.update.mockResolvedValue(undefined)

      await adapter.updateView('1', '1', { title: 'Updated View' })

      expect(mockViewsAPI.get).toHaveBeenCalledWith({ id: '1' })
      expect(mockViewsAPI.update).toHaveBeenCalledWith({
        id: '1',
        name: 'Updated View',
        description: expect.stringContaining('View created:'),
        panelId: 1,
        config: {
          columns: ['name', 'age'],
          layout: 'table',
        },
        metadata: {
          viewType: 'patient',
        },
        tenantId: 'test-tenant',
        userId: 'test-user',
      })
    })

    test('should delete a view', async () => {
      mockViewsAPI.delete.mockResolvedValue(undefined)

      await adapter.deleteView('1', '1')

      expect(mockViewsAPI.delete).toHaveBeenCalledWith({
        id: '1',
        tenantId: 'test-tenant',
        userId: 'test-user',
      })
    })

    test('should handle view API errors gracefully', async () => {
      mockViewsAPI.create.mockRejectedValue(new Error('Network error'))

      const newView: Omit<ViewDefinition, 'id'> = {
        title: 'New View',
        createdAt: new Date().toISOString(),
        filters: [],
        columns: [],
        viewType: 'patient',
      }

      await expect(adapter.addView('1', newView)).rejects.toThrow(
        'Failed to add view',
      )
    })
  })

  describe('Configuration', () => {
    test('should not have persistent loading state', () => {
      expect(adapter.isLoading()).toBe(false)
    })

    test('should use correct tenant and user configuration', async () => {
      mockPanelsAPI.all.mockResolvedValue([])

      await adapter.getPanels()

      expect(mockPanelsAPI.all).toHaveBeenCalledWith('test-tenant', 'test-user')
    })
  })
})
