import type { IdParam } from '@panels/types'
import type {
  CreatePanelResponse,
  PanelInfo,
  PanelResponse,
  PanelsResponse,
} from '@panels/types/panels'
import type {
  ViewInfo,
  ViewPublishInfo,
  ViewPublishResponse,
  ViewResponse,
  ViewSortsInfo,
  ViewSortsResponse,
  ViewsResponse,
} from '@panels/types/views'
import { expect, vi } from 'vitest'

// Mock data generators with correct types
export const mockData = {
  panel: (): PanelInfo => ({
    name: 'Test Panel',
    description: 'Test Description',
    tenantId: 'tenant-123',
    userId: 'user-123',
  }),

  panelWithId: (): PanelInfo & IdParam => ({
    id: 'panel-123',
    name: 'Test Panel',
    description: 'Test Description',
    tenantId: 'tenant-123',
    userId: 'user-123',
  }),

  view: (): ViewInfo => ({
    name: 'Test View',
    description: 'Test View Description',
    panelId: 123,
    config: {
      columns: ['name', 'status'],
      layout: 'table',
    },
    tenantId: 'tenant-123',
    userId: 'user-123',
  }),

  viewWithId: (): ViewInfo & IdParam => ({
    id: 'view-123',
    name: 'Test View',
    description: 'Test View Description',
    panelId: 123,
    config: {
      columns: ['name', 'status'],
      layout: 'table',
    },
    tenantId: 'tenant-123',
    userId: 'user-123',
  }),

  viewPublishInfo: (): ViewPublishInfo => ({
    tenantId: 'tenant-123',
    userId: 'user-123',
  }),

  viewSortsInfo: (): ViewSortsInfo => ({
    sorts: [
      {
        columnName: 'name',
        direction: 'asc',
        order: 1,
      },
    ],
    tenantId: 'tenant-123',
    userId: 'user-123',
  }),
}

// Mock response generators
export const mockResponses = {
  panelResponse: (): PanelResponse => ({
    id: 123,
    name: 'Test Panel',
    description: 'Test Description',
    tenantId: 'tenant-123',
    userId: 'user-123',
    cohortRule: {
      conditions: [
        {
          field: 'status',
          operator: 'eq',
          value: 'active',
        },
      ],
      logic: 'AND',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  panelsResponse: (): PanelsResponse => [
    {
      id: 123,
      name: 'Test Panel',
      description: 'Test Description',
      tenantId: 'tenant-123',
      userId: 'user-123',
      cohortRule: {
        conditions: [
          {
            field: 'status',
            operator: 'eq',
            value: 'active',
          },
        ],
        logic: 'AND',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],

  createPanelResponse: (): CreatePanelResponse => ({
    id: 123,
    name: 'Test Panel',
    description: 'Test Description',
    tenantId: 'tenant-123',
    userId: 'user-123',
    cohortRule: {
      conditions: [
        {
          field: 'status',
          operator: 'eq',
          value: 'active',
        },
      ],
      logic: 'AND',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  viewResponse: (): ViewResponse => ({
    id: 123,
    name: 'Test View',
    description: 'Test View Description',
    panelId: 123,
    userId: 'user-123',
    tenantId: 'tenant-123',
    isPublished: false,
    config: {
      columns: ['name', 'status'],
      layout: 'table',
    },
  }),

  viewsResponse: (): ViewsResponse => ({
    total: 1,
    views: [
      {
        id: 123,
        name: 'Test View',
        description: 'Test View Description',
        panelId: 123,
        userId: 'user-123',
        tenantId: 'tenant-123',
        isPublished: false,
        config: {
          columns: ['name', 'status'],
          layout: 'table',
        },
        panel: {
          id: 123,
          name: 'Test Panel',
        },
      },
    ],
  }),

  viewPublishResponse: (): ViewPublishResponse => ({
    id: 123,
    name: 'Test View',
    isPublished: true,
    publishedBy: 'user-123',
    publishedAt: new Date(),
  }),

  viewSortsResponse: (): ViewSortsResponse => ({
    sorts: [
      {
        id: 1,
        columnName: 'name',
        direction: 'asc',
        order: 1,
      },
      {
        id: 2,
        columnName: 'createdAt',
        direction: 'desc',
        order: 2,
      },
    ],
  }),

  errorResponse: (message = 'Something went wrong') => ({
    error: message,
    success: false,
  }),
}

// Fetch mock utilities
export const createMockFetch = () => {
  const mockFetch = vi.fn()
  global.fetch = mockFetch
  return mockFetch
}

export const mockFetchSuccess = (data: unknown, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response)
}

export const mockFetchError = (
  status = 500,
  statusText = 'Internal Server Error',
) => {
  return Promise.resolve({
    ok: false,
    status,
    statusText,
    json: () =>
      Promise.resolve(
        mockResponses.errorResponse(`HTTP ${status}: ${statusText}`),
      ),
  } as Response)
}

export const mockNetworkError = () => {
  return Promise.reject(new Error('Network error'))
}

// Test helper functions
export const setupTest = () => {
  const mockFetch = createMockFetch()

  // Set test environment variables using Vitest's stubEnv
  vi.stubEnv('APP_API_BASE_URL', 'https://api.test.com')

  return { mockFetch }
}

export const cleanupTest = () => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
}

// Helper function to set up specific environment for individual tests
export const setTestBaseUrl = (baseUrl: string) => {
  vi.stubEnv('APP_API_BASE_URL', baseUrl)
}

export const clearTestBaseUrl = () => {
  vi.stubEnv('APP_API_BASE_URL', '')
}

// Common test patterns
export const testCrudOperations = {
  expectCorrectUrl: (
    mockFetch: ReturnType<typeof vi.fn>,
    expectedUrl: string,
  ) => {
    expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object))
  },

  expectCorrectMethod: (
    mockFetch: ReturnType<typeof vi.fn>,
    expectedMethod: string,
  ) => {
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: expectedMethod,
      }),
    )
  },

  expectCorrectHeaders: (mockFetch: ReturnType<typeof vi.fn>) => {
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    )
  },

  expectCorrectBody: (
    mockFetch: ReturnType<typeof vi.fn>,
    expectedBody: unknown,
  ) => {
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify(expectedBody),
      }),
    )
  },
}
