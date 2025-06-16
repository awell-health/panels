import type { ColumnBaseCreate } from '@panels/types/columns'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { panelsAPI } from './panelsAPI'
import {
  cleanupTest,
  mockData,
  mockFetchError,
  mockFetchSuccess,
  mockNetworkError,
  mockResponses,
  setupTest,
  testCrudOperations,
} from './testUtils'

describe('panelsAPI', () => {
  let mockFetch: ReturnType<typeof setupTest>['mockFetch']

  beforeEach(() => {
    const setup = setupTest()
    mockFetch = setup.mockFetch
  })

  afterEach(() => {
    cleanupTest()
  })

  describe('get', () => {
    it('should fetch a panel by id', async () => {
      const panel = { id: 'panel-123' }
      const expectedResponse = mockResponses.panelResponse()

      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      const result = await panelsAPI.get(panel)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        'https://api.test.com/panels/panel-123',
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'GET')
      testCrudOperations.expectCorrectHeaders(mockFetch)
      expect(result).toEqual(expectedResponse)
    })

    it('should handle custom options', async () => {
      const panel = { id: 'panel-123' }
      const expectedResponse = mockResponses.panelResponse()
      const customOptions = { signal: new AbortController().signal }

      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      await panelsAPI.get(panel, customOptions)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining(customOptions),
      )
    })

    it('should handle network errors', async () => {
      const panel = { id: 'panel-123' }
      mockFetch.mockReturnValue(mockNetworkError())

      await expect(panelsAPI.get(panel)).rejects.toThrow('Network error')
    })

    it('should handle HTTP errors', async () => {
      const panel = { id: 'panel-123' }
      mockFetch.mockReturnValue(mockFetchError(404, 'Not Found'))

      // Since we're not handling errors in the API yet, it should still return the response
      const result = await panelsAPI.get(panel)
      expect(result).toMatchObject({ error: expect.any(String) })
    })
  })

  describe('all', () => {
    it('should fetch all panels for tenant and user', async () => {
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      const expectedResponse = mockResponses.panelsResponse()

      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      const result = await panelsAPI.all(tenantId, userId)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        'https://api.test.com/panels?tenantId=tenant-123&userId=user-123',
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'GET')
      testCrudOperations.expectCorrectHeaders(mockFetch)
      expect(result).toEqual(expectedResponse)
    })

    it('should handle empty response', async () => {
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      const emptyResponse: typeof mockResponses.panelsResponse = () => []

      mockFetch.mockReturnValue(mockFetchSuccess(emptyResponse()))

      const result = await panelsAPI.all(tenantId, userId)

      expect(result).toEqual([])
    })

    it('should handle server errors', async () => {
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      mockFetch.mockReturnValue(mockFetchError(500))

      const result = await panelsAPI.all(tenantId, userId)
      expect(result).toMatchObject({ error: expect.any(String) })
    })
  })

  describe('create', () => {
    it('should create a new panel', async () => {
      const panelData = mockData.panel()
      const expectedResponse = mockResponses.createPanelResponse()

      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      const result = await panelsAPI.create(panelData)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        'https://api.test.com/panels',
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'POST')
      testCrudOperations.expectCorrectHeaders(mockFetch)
      testCrudOperations.expectCorrectBody(mockFetch, {
        name: panelData.name,
        description: panelData.description,
        tenantId: panelData.tenantId,
        userId: panelData.userId,
      })
      expect(result).toEqual(expectedResponse)
    })

    it('should handle validation errors', async () => {
      const panelData = mockData.panel()
      mockFetch.mockReturnValue(mockFetchError(400, 'Bad Request'))

      const result = await panelsAPI.create(panelData)
      expect(result).toMatchObject({ error: expect.any(String) })
    })

    it('should handle unauthorized errors', async () => {
      const panelData = mockData.panel()
      mockFetch.mockReturnValue(mockFetchError(401, 'Unauthorized'))

      const result = await panelsAPI.create(panelData)
      expect(result).toMatchObject({ error: expect.any(String) })
    })
  })

  describe('update', () => {
    it('should update an existing panel', async () => {
      const panelData = mockData.panelWithId()
      const expectedResponse = mockResponses.panelResponse()

      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      const result = await panelsAPI.update(panelData)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        `https://api.test.com/panels/${panelData.id}`,
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'PUT')
      testCrudOperations.expectCorrectHeaders(mockFetch)
      testCrudOperations.expectCorrectBody(mockFetch, {
        name: panelData.name,
        description: panelData.description,
        tenantId: panelData.tenantId,
        userId: panelData.userId,
      })
      expect(result).toEqual(expectedResponse)
    })

    it('should handle not found errors', async () => {
      const panelData = mockData.panelWithId()
      mockFetch.mockReturnValue(mockFetchError(404, 'Not Found'))

      const result = await panelsAPI.update(panelData)
      expect(result).toMatchObject({ error: expect.any(String) })
    })
  })

  describe('delete', () => {
    it('should delete a panel', async () => {
      const panelData = {
        id: 'panel-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
      }

      mockFetch.mockReturnValue(mockFetchSuccess(null, 204))

      await panelsAPI.delete(panelData)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        `https://api.test.com/panels/${panelData.id}`,
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'DELETE')
      testCrudOperations.expectCorrectHeaders(mockFetch)
      testCrudOperations.expectCorrectBody(mockFetch, {
        tenantId: panelData.tenantId,
        userId: panelData.userId,
      })
    })

    it('should handle forbidden errors', async () => {
      const panelData = {
        id: 'panel-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
      }

      mockFetch.mockReturnValue(mockFetchError(403, 'Forbidden'))

      // Since delete doesn't return anything, we need to check if it throws or handles gracefully
      await expect(panelsAPI.delete(panelData)).resolves.toBeUndefined()
    })
  })

  describe('dataSources', () => {
    describe('list', () => {
      it('should fetch data sources for a panel', async () => {
        const panel = { id: 'panel-123' }
        const tenantId = 'tenant-123'
        const userId = 'user-123'
        const expectedResponse = { success: true, data: [] }

        mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

        const result = await panelsAPI.dataSources.list(panel, tenantId, userId)

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/panels/${panel.id}/datasources?tenantId=${tenantId}&userId=${userId}`,
        )
        testCrudOperations.expectCorrectMethod(mockFetch, 'GET')
        expect(result).toEqual(expectedResponse)
      })
    })

    describe('create', () => {
      it('should create a data source for a panel', async () => {
        const panel = { id: 'panel-123' }
        const dataSource = {
          type: 'database' as const,
          config: { host: 'localhost' },
          tenantId: 'tenant-123',
          userId: 'user-123',
        }
        const expectedResponse = {
          success: true,
          data: { id: 1, ...dataSource },
        }

        mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

        const result = await panelsAPI.dataSources.create(panel, dataSource)

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/panels/${panel.id}/datasources`,
        )
        testCrudOperations.expectCorrectMethod(mockFetch, 'POST')
        testCrudOperations.expectCorrectBody(mockFetch, dataSource)
        expect(result).toEqual(expectedResponse)
      })
    })
  })

  describe('columns', () => {
    describe('list', () => {
      it('should fetch columns for a panel', async () => {
        const panel = { id: 'panel-123' }
        const tenantId = 'tenant-123'
        const userId = 'user-123'
        const expectedResponse = {
          success: true,
          data: { baseColumns: [], calculatedColumns: [] },
        }

        mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

        const result = await panelsAPI.columns.list(panel, tenantId, userId)

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/panels/${panel.id}/columns?tenantId=${tenantId}&userId=${userId}`,
        )
        testCrudOperations.expectCorrectMethod(mockFetch, 'GET')
        expect(result).toEqual(expectedResponse)
      })
    })

    describe('createBase', () => {
      it('should create a base column for a panel', async () => {
        const panel = { id: 'panel-123' }
        const column: ColumnBaseCreate = {
          name: 'Test Column',
          type: 'text' as const,
          tenantId: 'tenant-123',
          userId: 'user-123',
          sourceField: 'test',
          dataSourceId: 1,
          properties: {},
        }
        const expectedResponse = { success: true, data: { id: 1, ...column } }

        mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

        const result = await panelsAPI.columns.createBase(panel, column)

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/panels/${panel.id}/columns/base`,
        )
        testCrudOperations.expectCorrectMethod(mockFetch, 'POST')
        testCrudOperations.expectCorrectBody(mockFetch, column)
        expect(result).toEqual(expectedResponse)
      })
    })
  })

  describe('environment configuration', () => {
    it('should use different base URLs based on environment', async () => {
      // Test with different environment variable
      vi.stubEnv('NEXT_PUBLIC_APP_API_BASE_URL', 'https://api.production.com')

      const panel = { id: 'panel-123' }
      const expectedResponse = mockResponses.panelResponse()

      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      await panelsAPI.get(panel)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        'https://api.production.com/panels/panel-123',
      )
    })

    it('should handle missing base URL gracefully', async () => {
      // Remove the base URL
      vi.stubEnv('NEXT_PUBLIC_APP_API_BASE_URL', '')

      const panel = { id: 'panel-123' }
      const expectedResponse = mockResponses.panelResponse()

      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      await panelsAPI.get(panel)

      // Should use relative URL when no base URL is set
      testCrudOperations.expectCorrectUrl(mockFetch, '/panels/panel-123')
    })
  })
})
