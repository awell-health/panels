import type { IdParam } from '@panels/types'
import type {
  CreatePanelResponse,
  PanelInfo,
  PanelResponse,
  PanelsResponse,
} from '@panels/types/panels'
import type {
  ViewCreate,
  View,
  ViewSortsUpdate,
  ViewSortsResponse,
  ViewsResponse,
} from '@panels/types/views'
import { expect, vi } from 'vitest'

// Mock data generators with correct types
export const mockData = {
  panel: (): PanelInfo => ({
    name: 'Test Panel',
    description: 'Test Description',
    metadata: {},
  }),

  panelWithId: (): PanelInfo & IdParam => ({
    id: 'panel-123',
    name: 'Test Panel',
    description: 'Test Description',
    metadata: {},
  }),

  view: (): ViewCreate => ({
    name: 'Test View',
    panelId: 123,
    visibleColumns: ['name', 'status'],
  }),

  viewWithId: (): ViewCreate & IdParam => ({
    id: 'view-123',
    name: 'Test View',
    panelId: 123,
    visibleColumns: ['name', 'status'],
  }),

  viewSortsUpdate: (): ViewSortsUpdate => ({
    sorts: [
      {
        columnName: 'name',
        direction: 'asc',
        order: 1,
      },
    ],
  }),
}

// Mock responses
export const mockResponses = {
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
      metadata: {},
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z'),
    },
  ],

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
    metadata: {},
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
  }),

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
    metadata: {},
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
  }),

  viewResponse: (): View => ({
    id: 123,
    panelId: 123,
    name: 'Test View',
    ownerUserId: 'user-123',
    tenantId: 'tenant-123',
    isPublished: false,
    visibleColumns: ['name', 'status'],
    sort: [],
    metadata: {},
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
  }),

  viewsResponse: (): ViewsResponse => ({
    total: 1,
    views: [
      {
        id: 123,
        panelId: 123,
        name: 'Test View',
        ownerUserId: 'user-123',
        tenantId: 'tenant-123',
        isPublished: false,
        visibleColumns: ['name', 'status'],
        sort: [],
        metadata: {},
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
      },
    ],
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

// Mock fetch helpers
export const mockFetch = vi.fn()

export const mockFetchSuccess = (data: unknown) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  })

export const mockFetchError = (status: number, message = 'Error') =>
  Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
  })

export const mockNetworkError = () => Promise.reject(new Error('Network error'))

// Setup and cleanup functions
export const setupTest = () => {
  global.fetch = mockFetch
  vi.clearAllMocks()
  return { mockFetch }
}

export const cleanupTest = () => {
  vi.restoreAllMocks()
}

// Test utilities
export const testCrudOperations = {
  expectCorrectUrl: (
    mockFetch: ReturnType<typeof vi.fn>,
    expectedUrl: string,
  ) => {
    const calls = mockFetch.mock.calls
    expect(calls[calls.length - 1][0]).toBe(expectedUrl)
  },

  expectCorrectMethod: (
    mockFetch: ReturnType<typeof vi.fn>,
    expectedMethod: string,
  ) => {
    const calls = mockFetch.mock.calls
    const options = calls[calls.length - 1][1]
    expect(options.method).toBe(expectedMethod)
  },

  expectCorrectHeaders: (mockFetch: ReturnType<typeof vi.fn>) => {
    const calls = mockFetch.mock.calls
    const options = calls[calls.length - 1][1]
    expect(options.headers).toMatchObject({
      'Content-Type': 'application/json',
    })
  },

  expectCorrectBody: (
    mockFetch: ReturnType<typeof vi.fn>,
    expectedBody: unknown,
  ) => {
    const calls = mockFetch.mock.calls
    const options = calls[calls.length - 1][1]
    expect(JSON.parse(options.body)).toEqual(expectedBody)
  },
}
