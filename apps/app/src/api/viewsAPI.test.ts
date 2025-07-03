import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { viewsAPI } from './viewsAPI'
import { mockData, mockResponses, testCrudOperations } from './testUtils'

// Mock the API config
vi.mock('./config/apiConfig', () => ({
  getApiConfig: () => ({
    buildUrl: (path: string) => `https://api.test.com${path}`,
  }),
}))

describe('viewsAPI', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    global.fetch = mockFetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mockFetchSuccess = (data: unknown) =>
    Promise.resolve({
      json: () => Promise.resolve(data),
    })

  const mockFetchError = (status: number, message: string) =>
    Promise.resolve({
      json: () => Promise.resolve({ error: message }),
      status,
    })

  describe('all', () => {
    it('should fetch all views', async () => {
      const expectedResponse = mockResponses.viewsResponse()
      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      const result = await viewsAPI.all('tenant-123', 'user-123')

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        'https://api.test.com/views?tenantId=tenant-123&userId=user-123',
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'GET')
      testCrudOperations.expectCorrectHeaders(mockFetch)
      expect(result).toEqual(expectedResponse)
    })

    it('should handle fetch errors', async () => {
      mockFetch.mockReturnValue(mockFetchError(500, 'Internal Server Error'))

      const result = await viewsAPI.all('tenant-123', 'user-123')
      expect(result).toMatchObject({ error: expect.any(String) })
    })
  })

  describe('get', () => {
    it('should fetch a single view', async () => {
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

      await expect(viewsAPI.get(tenantId, userId, view)).rejects.toThrow(
        'Network error',
      )
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
  })

  describe('update', () => {
    it('should update a view', async () => {
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
  })

  describe('delete', () => {
    it('should delete a view', async () => {
      const viewData = {
        id: 'view-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
      }

      mockFetch.mockReturnValue(mockFetchSuccess(null, 204))

      await viewsAPI.delete(viewData)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        `https://api.test.com/views/${viewData.id}`,
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'DELETE')
      testCrudOperations.expectCorrectHeaders(mockFetch)
      testCrudOperations.expectCorrectBody(mockFetch, {
        tenantId: viewData.tenantId,
        userId: viewData.userId,
      })
    })

    it('should handle forbidden errors', async () => {
      const viewData = {
        id: 'view-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
      }

      mockFetch.mockReturnValue(mockFetchError(403, 'Forbidden'))

      await expect(viewsAPI.delete(viewData)).resolves.toBeUndefined()
    })

    it('should handle not found errors on delete', async () => {
      const viewData = {
        id: 'nonexistent-view',
        tenantId: 'tenant-123',
        userId: 'user-123',
      }

      mockFetch.mockReturnValue(mockFetchError(404, 'Not Found'))

      await expect(viewsAPI.delete(viewData)).resolves.toBeUndefined()
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
        const sortsData = mockData.viewSortsUpdate()
        const expectedResponse = mockResponses.viewSortsResponse()

        mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

        const result = await viewsAPI.sorts.update(view, sortsData)

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/views/${view.id}/sorts`,
        )
        testCrudOperations.expectCorrectMethod(mockFetch, 'PUT')
        testCrudOperations.expectCorrectHeaders(mockFetch)
        testCrudOperations.expectCorrectBody(mockFetch, sortsData)
        expect(result).toEqual(expectedResponse)
      })

      it('should handle validation errors', async () => {
        const view = { id: 'view-123' }
        const sortsData = mockData.viewSortsUpdate()
        mockFetch.mockReturnValue(mockFetchError(400, 'Bad Request'))

        const result = await viewsAPI.sorts.update(view, sortsData)
        expect(result).toMatchObject({ error: expect.any(String) })
      })
    })

    describe('get', () => {
      it('should get view sorts', async () => {
        const view = { id: 'view-123' }
        const expectedResponse = mockResponses.viewSortsResponse()

        mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

        const result = await viewsAPI.sorts.get(view, 'tenant-123', 'user-123')

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/views/${view.id}/sorts?tenantId=tenant-123&userId=user-123`,
        )
        testCrudOperations.expectCorrectMethod(mockFetch, 'GET')
        testCrudOperations.expectCorrectHeaders(mockFetch)
        expect(result).toEqual(expectedResponse)
      })

      it('should handle not found errors', async () => {
        const view = { id: 'view-123' }
        mockFetch.mockReturnValue(mockFetchError(404, 'Not Found'))

        const result = await viewsAPI.sorts.get(view, 'tenant-123', 'user-123')
        expect(result).toMatchObject({ error: expect.any(String) })
      })
    })
  })

  describe('edge cases', () => {
    it('should handle malformed JSON responses', async () => {
      const view = { id: 'view-123' }
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.reject(new SyntaxError('Unexpected token')),
        } as Response),
      )

      await expect(viewsAPI.get(view)).rejects.toThrow('Unexpected token')
    })

    it('should handle timeout errors', async () => {
      const view = { id: 'view-123' }
      mockFetch.mockReturnValue(Promise.reject(new Error('Request timeout')))

      await expect(viewsAPI.get(view)).rejects.toThrow('Request timeout')
    })

    it('should handle custom request options', async () => {
      const view = { id: 'view-123' }
      const expectedResponse = mockResponses.viewResponse()
      const customOptions = {
        cache: 'no-cache' as RequestCache,
        priority: 'high' as RequestPriority,
      }

      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      const result = await viewsAPI.get(view, customOptions)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining(customOptions),
      )
      expect(result).toEqual(expectedResponse)
    })
  })

  describe('environment configuration', () => {
    it('should use different base URLs based on environment', async () => {
      // Test with different environment variable
      vi.stubEnv('NEXT_PUBLIC_APP_API_BASE_URL', 'https://api.production.com')

      const view = { id: 'view-123' }
      const expectedResponse = mockResponses.viewResponse()

      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      await viewsAPI.get(view)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        'https://api.production.com/views/view-123',
      )
    })

    it('should handle missing base URL gracefully', async () => {
      // Remove the base URL
      vi.stubEnv('NEXT_PUBLIC_APP_API_BASE_URL', '')

      const view = { id: 'view-123' }
      const expectedResponse = mockResponses.viewResponse()

      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      await viewsAPI.get(view)

      // Should use relative URL when no base URL is set
      testCrudOperations.expectCorrectUrl(mockFetch, '/views/view-123')
    })
  })
})
