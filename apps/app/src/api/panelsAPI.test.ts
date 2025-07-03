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

// Mock the API config
vi.mock('./config/apiConfig', () => ({
  apiConfig: {
    buildUrl: (path: string) => `https://api.test.com${path}`,
  },
}))

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
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      const expectedResponse = mockResponses.panelResponse()

      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      const result = await panelsAPI.get(panel, tenantId, userId)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        'https://api.test.com/panels/panel-123?tenantId=tenant-123&userId=user-123',
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'GET')
      testCrudOperations.expectCorrectHeaders(mockFetch)
      expect(result).toEqual(expectedResponse)
    })

    it('should handle custom options', async () => {
      const panel = { id: 'panel-123' }
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      const expectedResponse = mockResponses.panelResponse()
      const customOptions = { signal: new AbortController().signal }

      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      await panelsAPI.get(panel, tenantId, userId, customOptions)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining(customOptions),
      )
    })

    it('should handle network errors', async () => {
      const panel = { id: 'panel-123' }
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      mockFetch.mockReturnValue(mockNetworkError())

      await expect(panelsAPI.get(panel, tenantId, userId)).rejects.toThrow(
        'Network error',
      )
    })

    it('should handle HTTP errors', async () => {
      const panel = { id: 'panel-123' }
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      mockFetch.mockReturnValue(mockFetchError(404, 'Not Found'))

      const result = await panelsAPI.get(panel, tenantId, userId)
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
        metadata: panelData.metadata,
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
      testCrudOperations.expectCorrectBody(mockFetch, panelData)
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
      const panel = { id: 'panel-123' }
      const tenantId = 'tenant-123'
      const userId = 'user-123'

      mockFetch.mockReturnValue(mockFetchSuccess(null))

      await panelsAPI.delete(tenantId, userId, panel)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        `https://api.test.com/panels/${panel.id}?tenantId=${tenantId}&userId=${userId}`,
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'DELETE')
    })

    it('should handle forbidden errors', async () => {
      const panel = { id: 'panel-123' }
      const tenantId = 'tenant-123'
      const userId = 'user-123'

      mockFetch.mockReturnValue(mockFetchError(403, 'Forbidden'))

      await expect(
        panelsAPI.delete(tenantId, userId, panel),
      ).resolves.toBeUndefined()
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

      it('should handle server errors', async () => {
        const panel = { id: 'panel-123' }
        const tenantId = 'tenant-123'
        const userId = 'user-123'
        mockFetch.mockReturnValue(mockFetchError(500))

        const result = await panelsAPI.dataSources.list(panel, tenantId, userId)
        expect(result).toMatchObject({ error: expect.any(String) })
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

      it('should handle validation errors', async () => {
        const panel = { id: 'panel-123' }
        const dataSource = {
          type: 'database' as const,
          config: { host: 'localhost' },
          tenantId: 'tenant-123',
          userId: 'user-123',
        }
        mockFetch.mockReturnValue(mockFetchError(400, 'Bad Request'))

        const result = await panelsAPI.dataSources.create(panel, dataSource)
        expect(result).toMatchObject({ error: expect.any(String) })
      })
    })

    describe('update', () => {
      it('should update a data source', async () => {
        const dataSource = {
          id: 'ds-123',
          type: 'database' as const,
          config: { host: 'localhost' },
          tenantId: 'tenant-123',
          userId: 'user-123',
        }
        const expectedResponse = {
          success: true,
          data: dataSource,
        }

        mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

        const result = await panelsAPI.dataSources.update(dataSource)

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/datasources/${dataSource.id}`,
        )
        testCrudOperations.expectCorrectMethod(mockFetch, 'PUT')
        testCrudOperations.expectCorrectBody(mockFetch, dataSource)
        expect(result).toEqual(expectedResponse)
      })
    })

    describe('delete', () => {
      it('should delete a data source', async () => {
        const dataSource = {
          id: 'ds-123',
          tenantId: 'tenant-123',
          userId: 'user-123',
        }

        mockFetch.mockReturnValue(mockFetchSuccess(null))

        await panelsAPI.dataSources.delete(dataSource)

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/datasources/${dataSource.id}`,
        )
        testCrudOperations.expectCorrectMethod(mockFetch, 'DELETE')
        testCrudOperations.expectCorrectBody(mockFetch, {
          tenantId: dataSource.tenantId,
          userId: dataSource.userId,
        })
      })
    })

    describe('sync', () => {
      it('should sync a data source', async () => {
        const dataSource = { id: 'ds-123' }
        const expectedResponse = {
          success: true,
          message: 'Sync completed',
        }

        mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

        const result = await panelsAPI.dataSources.sync(dataSource)

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/datasources/${dataSource.id}/sync`,
        )
        testCrudOperations.expectCorrectMethod(mockFetch, 'POST')
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

      it('should handle filtering by ids and tags', async () => {
        const panel = { id: 'panel-123' }
        const tenantId = 'tenant-123'
        const userId = 'user-123'
        const ids = ['col1', 'col2']
        const tags = ['tag1', 'tag2']
        const expectedResponse = {
          success: true,
          data: { baseColumns: [], calculatedColumns: [] },
        }

        mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

        const result = await panelsAPI.columns.list(
          panel,
          tenantId,
          userId,
          ids,
          tags,
        )

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/panels/${panel.id}/columns?tenantId=${tenantId}&userId=${userId}&ids=col1&ids=col2&tags=tag1&tags=tag2`,
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

    describe('createCalculated', () => {
      it('should create a calculated column for a panel', async () => {
        const panel = { id: 'panel-123' }
        const column = {
          name: 'Calculated Column',
          type: 'text' as const,
          tenantId: 'tenant-123',
          userId: 'user-123',
          formula: 'column1 + column2',
          dependencies: ['column1', 'column2'],
          properties: {},
        }
        const expectedResponse = { success: true, data: { id: 1, ...column } }

        mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

        const result = await panelsAPI.columns.createCalculated(panel, column)

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/panels/${panel.id}/columns/calculated`,
        )
        testCrudOperations.expectCorrectMethod(mockFetch, 'POST')
        testCrudOperations.expectCorrectBody(mockFetch, column)
        expect(result).toEqual(expectedResponse)
      })
    })

    describe('update', () => {
      it('should update a column', async () => {
        const column = {
          id: 'col-123',
          name: 'Updated Column',
          type: 'text' as const,
          tenantId: 'tenant-123',
          userId: 'user-123',
          sourceField: 'test',
          dataSourceId: 1,
          properties: {},
        }
        const panelId = { id: 'panel-123' }
        const expectedResponse = { success: true, data: column }

        mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

        const result = await panelsAPI.columns.update(column, panelId)

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/panels/${panelId.id}/columns/${column.id}`,
        )
        testCrudOperations.expectCorrectMethod(mockFetch, 'PUT')
        testCrudOperations.expectCorrectBody(mockFetch, column)
        expect(result).toEqual(expectedResponse)
      })
    })

    describe('delete', () => {
      it('should delete a column', async () => {
        const column = {
          id: 'col-123',
          tenantId: 'tenant-123',
          userId: 'user-123',
        }
        const panelId = { id: 'panel-123' }

        mockFetch.mockReturnValue(mockFetchSuccess(null))

        await panelsAPI.columns.delete(column, panelId)

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/panels/${panelId.id}/columns/${column.id}?tenantId=${column.tenantId}&userId=${column.userId}`,
        )
        testCrudOperations.expectCorrectMethod(mockFetch, 'DELETE')
      })
    })
  })
})
