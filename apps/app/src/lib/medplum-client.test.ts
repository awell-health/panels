import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  MedplumStore,
  PaginationOptions,
  PaginatedResult,
} from './medplum-client'
import type { Patient, Task } from '@medplum/fhirtypes'

// Mock MedplumClient
const mockClient = {
  search: vi.fn(),
  readResource: vi.fn(),
  updateResource: vi.fn(),
  createResource: vi.fn(),
  deleteResource: vi.fn(),
  searchOne: vi.fn(),
  getAccessToken: vi.fn(),
  isAuthenticated: vi.fn(),
  startClientLogin: vi.fn(),
  getActiveLogin: vi.fn(),
}

describe('MedplumStore Pagination', () => {
  let store: MedplumStore

  beforeEach(() => {
    vi.clearAllMocks()
    // biome-ignore lint/suspicious/noExplicitAny: Mock client for testing
    store = new MedplumStore(mockClient as any, 'wss://test.com')
  })

  describe('getPatientsPaginated', () => {
    it('should fetch first page of patients', async () => {
      const mockBundle = {
        entry: [
          {
            resource: {
              id: '1',
              resourceType: 'Patient',
              meta: { lastUpdated: '2024-01-01T10:00:00Z' },
            },
          },
          {
            resource: {
              id: '2',
              resourceType: 'Patient',
              meta: { lastUpdated: '2024-01-01T09:00:00Z' },
            },
          },
        ],
        total: 5,
      }

      mockClient.search.mockResolvedValue(mockBundle)

      const result = await store.getPatientsPaginated({ pageSize: 2 })

      expect(mockClient.search).toHaveBeenCalledWith('Patient', {
        _count: '2',
        _sort: '-_lastUpdated',
      })

      expect(result).toEqual({
        data: mockBundle.entry.map((e) => e.resource),
        hasMore: true,
        nextCursor: '2024-01-01T09:00:00Z',
        totalCount: 5,
      })
    })

    it('should fetch subsequent pages with cursor', async () => {
      const mockBundle = {
        entry: [
          {
            resource: {
              id: '3',
              resourceType: 'Patient',
              meta: { lastUpdated: '2024-01-01T08:00:00Z' },
            },
          },
        ],
        total: 5,
      }

      mockClient.search.mockResolvedValue(mockBundle)

      const result = await store.getPatientsPaginated({
        pageSize: 2,
        lastUpdated: '2024-01-01T09:00:00Z',
      })

      expect(mockClient.search).toHaveBeenCalledWith('Patient', {
        _count: '2',
        _sort: '-_lastUpdated',
        _lastUpdated: 'lt2024-01-01T09:00:00Z',
      })

      expect(result).toEqual({
        data: mockBundle.entry.map((e) => e.resource),
        hasMore: false, // Only 1 record returned, less than pageSize
        nextCursor: undefined, // No next cursor since hasMore is false
        totalCount: 5,
      })
    })

    it('should handle empty results', async () => {
      const mockBundle = { entry: [], total: 0 }
      mockClient.search.mockResolvedValue(mockBundle)

      const result = await store.getPatientsPaginated()

      expect(result).toEqual({
        data: [],
        hasMore: false,
        nextCursor: undefined,
        totalCount: 0,
      })
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('Network error')
      mockClient.search.mockRejectedValue(error)

      await expect(store.getPatientsPaginated()).rejects.toThrow(
        'Network error',
      )
    })
  })

  describe('getTasksPaginated', () => {
    it('should fetch first page of tasks', async () => {
      const mockBundle = {
        entry: [
          {
            resource: {
              id: '1',
              resourceType: 'Task',
              meta: { lastUpdated: '2024-01-01T10:00:00Z' },
            },
          },
          {
            resource: {
              id: '2',
              resourceType: 'Task',
              meta: { lastUpdated: '2024-01-01T09:00:00Z' },
            },
          },
        ],
        total: 3,
      }

      mockClient.search.mockResolvedValue(mockBundle)

      const result = await store.getTasksPaginated({ pageSize: 2 })

      expect(mockClient.search).toHaveBeenCalledWith('Task', {
        _count: '2',
        _sort: '-_lastUpdated',
      })

      expect(result).toEqual({
        data: mockBundle.entry.map((e) => e.resource),
        hasMore: true,
        nextCursor: '2024-01-01T09:00:00Z',
        totalCount: 3,
      })
    })

    it('should use default page size when not specified', async () => {
      const mockBundle = { entry: [], total: 0 }
      mockClient.search.mockResolvedValue(mockBundle)

      await store.getTasksPaginated()

      expect(mockClient.search).toHaveBeenCalledWith('Task', {
        _count: '1000',
        _sort: '-_lastUpdated',
      })
    })
  })
})
