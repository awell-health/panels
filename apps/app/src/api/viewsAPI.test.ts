import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
import { viewsAPI } from './viewsAPI'

describe('viewsAPI', () => {
  let mockFetch: ReturnType<typeof setupTest>['mockFetch']

  beforeEach(() => {
    const setup = setupTest()
    mockFetch = setup.mockFetch
  })

  afterEach(() => {
    cleanupTest()
  })

  describe('all', () => {
    it('should fetch all views for tenant and user', async () => {
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      const expectedResponse = mockResponses.viewsResponse()

      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      const result = await viewsAPI.all(tenantId, userId)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        'https://api.test.com/views?tenantId=tenant-123&userId=user-123',
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'GET')
      testCrudOperations.expectCorrectHeaders(mockFetch)
      expect(result).toEqual(expectedResponse)
    })

    it('should handle empty response', async () => {
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      const emptyResponse = { total: 0, views: [] }

      mockFetch.mockReturnValue(mockFetchSuccess(emptyResponse))

      const result = await viewsAPI.all(tenantId, userId)

      expect(result).toEqual(emptyResponse)
    })

    it('should handle server errors', async () => {
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      mockFetch.mockReturnValue(mockFetchError(500))

      const result = await viewsAPI.all(tenantId, userId)
      expect(result).toMatchObject({ error: expect.any(String) })
    })
  })

  describe('get', () => {
    it('should fetch a view by id', async () => {
      const view = { id: 'view-123' }
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      const expectedResponse = mockResponses.viewResponse()

      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      const result = await viewsAPI.get(tenantId, userId, view)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        'https://api.test.com/views/view-123?tenantId=tenant-123&userId=user-123',
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'GET')
      testCrudOperations.expectCorrectHeaders(mockFetch)
      expect(result).toEqual(expectedResponse)
    })

    it('should handle not found errors', async () => {
      const view = { id: 'nonexistent-view' }
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      mockFetch.mockReturnValue(mockFetchError(404, 'Not Found'))

      const result = await viewsAPI.get(tenantId, userId, view)
      expect(result).toMatchObject({ error: expect.any(String) })
    })

    it('should handle network errors', async () => {
      const view = { id: 'view-123' }
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      mockFetch.mockReturnValue(mockNetworkError())

      await expect(viewsAPI.get(tenantId, userId, view)).rejects.toThrow('Network error')
    })
  })

  describe('create', () => {
    it('should create a new view', async () => {
      const viewData = mockData.view()
      const expectedResponse = mockResponses.viewResponse()

      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      const result = await viewsAPI.create(viewData)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        'https://api.test.com/views',
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'POST')
      testCrudOperations.expectCorrectHeaders(mockFetch)
      testCrudOperations.expectCorrectBody(mockFetch, viewData)
      expect(result).toEqual(expectedResponse)
    })

    it('should handle validation errors', async () => {
      const viewData = mockData.view()
      mockFetch.mockReturnValue(mockFetchError(400, 'Bad Request'))

      const result = await viewsAPI.create(viewData)
      expect(result).toMatchObject({ error: expect.any(String) })
    })

    it('should handle unauthorized errors', async () => {
      const viewData = mockData.view()
      mockFetch.mockReturnValue(mockFetchError(401, 'Unauthorized'))

      const result = await viewsAPI.create(viewData)
      expect(result).toMatchObject({ error: expect.any(String) })
    })
  })

  describe('update', () => {
    it('should update an existing view', async () => {
      const viewData = mockData.viewWithId()
      const expectedResponse = mockResponses.viewResponse()

      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      const result = await viewsAPI.update(viewData)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        `https://api.test.com/views/${viewData.id}`,
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'PUT')
      testCrudOperations.expectCorrectHeaders(mockFetch)
      testCrudOperations.expectCorrectBody(mockFetch, viewData)
      expect(result).toEqual(expectedResponse)
    })

    it('should handle not found errors', async () => {
      const viewData = mockData.viewWithId()
      mockFetch.mockReturnValue(mockFetchError(404, 'Not Found'))

      const result = await viewsAPI.update(viewData)
      expect(result).toMatchObject({ error: expect.any(String) })
    })

    it('should handle conflict errors', async () => {
      const viewData = mockData.viewWithId()
      mockFetch.mockReturnValue(mockFetchError(409, 'Conflict'))

      const result = await viewsAPI.update(viewData)
      expect(result).toMatchObject({ error: expect.any(String) })
    })
  })

  describe('delete', () => {
    it('should delete a view', async () => {
      const view = { id: 'view-123' }
      const tenantId = 'tenant-123'
      const userId = 'user-123'

      mockFetch.mockReturnValue(mockFetchSuccess(null, 204))

      await viewsAPI.delete(tenantId, userId, view)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        `https://api.test.com/views/${view.id}?tenantId=${tenantId}&userId=${userId}`,
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'DELETE')
    })

    it('should handle forbidden errors', async () => {
      const view = { id: 'view-123' }
      const tenantId = 'tenant-123'
      const userId = 'user-123'

      mockFetch.mockReturnValue(mockFetchError(403, 'Forbidden'))

      await expect(viewsAPI.delete(tenantId, userId, view)).resolves.toBeUndefined()
    })

    it('should handle not found errors on delete', async () => {
      const view = { id: 'nonexistent-view' }
      const tenantId = 'tenant-123'
      const userId = 'user-123'

      mockFetch.mockReturnValue(mockFetchError(404, 'Not Found'))

      await expect(viewsAPI.delete(tenantId, userId, view)).resolves.toBeUndefined()
    })
  })

  describe('publishing', () => {
    describe('publish', () => {
      it('should publish a view', async () => {
        const view = { id: 'view-123' }
        const publishInfo = mockData.viewPublishInfo()
        const expectedResponse = mockResponses.viewPublishResponse()

        mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

        const result = await viewsAPI.publishing.publish(view, publishInfo)

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/views/${view.id}/publish`,
        )
        testCrudOperations.expectCorrectMethod(mockFetch, 'POST')
        testCrudOperations.expectCorrectHeaders(mockFetch)
        testCrudOperations.expectCorrectBody(mockFetch, publishInfo)
        expect(result).toEqual(expectedResponse)
      })

      it('should handle already published errors', async () => {
        const view = { id: 'view-123' }
        const publishInfo = mockData.viewPublishInfo()
        mockFetch.mockReturnValue(mockFetchError(409, 'Already Published'))

        const result = await viewsAPI.publishing.publish(view, publishInfo)
        expect(result).toMatchObject({ error: expect.any(String) })
      })

      it('should handle insufficient permissions', async () => {
        const view = { id: 'view-123' }
        const publishInfo = mockData.viewPublishInfo()
        mockFetch.mockReturnValue(mockFetchError(403, 'Forbidden'))

        const result = await viewsAPI.publishing.publish(view, publishInfo)
        expect(result).toMatchObject({ error: expect.any(String) })
      })
    })
  })

  describe('sorts', () => {
    describe('update', () => {
      it('should update view sorts', async () => {
        const view = { id: 'view-123' }
        const sortsInfo = mockData.viewSortsInfo()
        const expectedResponse = mockResponses.viewSortsResponse()

        mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

        const result = await viewsAPI.sorts.update(view, sortsInfo)

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/views/${view.id}/sorts`,
        )
        testCrudOperations.expectCorrectMethod(mockFetch, 'PUT')
        testCrudOperations.expectCorrectHeaders(mockFetch)
        testCrudOperations.expectCorrectBody(mockFetch, sortsInfo)
        expect(result).toEqual(expectedResponse)
      })

      it('should handle invalid sort column errors', async () => {
        const view = { id: 'view-123' }
        const sortsInfo = mockData.viewSortsInfo()
        mockFetch.mockReturnValue(mockFetchError(400, 'Invalid sort column'))

        const result = await viewsAPI.sorts.update(view, sortsInfo)
        expect(result).toMatchObject({ error: expect.any(String) })
      })
    })

    describe('get', () => {
      it('should fetch view sorts', async () => {
        const view = { id: 'view-123' }
        const tenantId = 'tenant-123'
        const userId = 'user-123'
        const expectedResponse = mockResponses.viewSortsResponse()

        mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

        const result = await viewsAPI.sorts.get(view, tenantId, userId)

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/views/${view.id}/sorts?tenantId=${tenantId}&userId=${userId}`,
        )
        testCrudOperations.expectCorrectMethod(mockFetch, 'GET')
        testCrudOperations.expectCorrectHeaders(mockFetch)
        expect(result).toEqual(expectedResponse)
      })

      it('should handle empty sorts', async () => {
        const view = { id: 'view-123' }
        const tenantId = 'tenant-123'
        const userId = 'user-123'
        const emptyResponse = { sorts: [] }

        mockFetch.mockReturnValue(mockFetchSuccess(emptyResponse))

        const result = await viewsAPI.sorts.get(view, tenantId, userId)

        expect(result).toEqual(emptyResponse)
      })
    })
  })

  describe('edge cases', () => {
    it('should handle malformed JSON responses', async () => {
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      const view = { id: 'view-123' }
      mockFetch.mockReturnValue(Promise.resolve({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      }))

      await expect(viewsAPI.get(tenantId, userId, view)).rejects.toThrow('Unexpected token')
    })

    it('should handle timeout errors', async () => {
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      const view = { id: 'view-123' }
      mockFetch.mockReturnValue(Promise.reject(new Error('Request timeout')))

      await expect(viewsAPI.get(tenantId, userId, view)).rejects.toThrow('Request timeout')
    })

    it('should handle custom request options', async () => {
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      const view = { id: 'view-123' }
      const customOptions = { signal: new AbortController().signal }
      mockFetch.mockReturnValue(mockFetchSuccess({}))

      await viewsAPI.get(tenantId, userId, view, customOptions)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining(customOptions),
      )
    })
  })

  describe('environment configuration', () => {
    it('should use different base URLs based on environment', async () => {
      vi.stubEnv('APP_API_BASE_URL', 'https://api.production.com')
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      const view = { id: 'view-123' }
      const expectedResponse = mockResponses.viewResponse()
      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))
      await viewsAPI.get(tenantId, userId, view)
      testCrudOperations.expectCorrectUrl(
        mockFetch,
        'https://api.test.com/views/view-123?tenantId=tenant-123&userId=user-123',
      )
    })

    it('should handle missing base URL gracefully', async () => {
      vi.stubEnv('APP_API_BASE_URL', '')
      const tenantId = 'tenant-123'
      const userId = 'user-123'
      const view = { id: 'view-123' }
      const expectedResponse = mockResponses.viewResponse()
      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))
      await viewsAPI.get(tenantId, userId, view)
      testCrudOperations.expectCorrectUrl(
        mockFetch,
        'https://api.test.com/views/view-123?tenantId=tenant-123&userId=user-123',
      )
    })
  })
})
