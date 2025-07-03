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
      const expectedResponse = mockResponses.viewResponse()
      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      const result = await viewsAPI.get('tenant-123', 'user-123', view)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        `https://api.test.com/views/${view.id}?tenantId=tenant-123&userId=user-123`,
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'GET')
      testCrudOperations.expectCorrectHeaders(mockFetch)
      expect(result).toEqual(expectedResponse)
    })

    it('should handle not found errors', async () => {
      const view = { id: 'view-123' }
      mockFetch.mockReturnValue(mockFetchError(404, 'Not Found'))

      const result = await viewsAPI.get('tenant-123', 'user-123', view)
      expect(result).toMatchObject({ error: expect.any(String) })
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
      const view = { id: 'view-123' }
      mockFetch.mockReturnValue(mockFetchSuccess({}))

      await viewsAPI.delete('tenant-123', 'user-123', view)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        `https://api.test.com/views/${view.id}?tenantId=tenant-123&userId=user-123`,
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'DELETE')
    })

    it('should handle not found errors', async () => {
      const view = { id: 'view-123' }
      mockFetch.mockReturnValue(mockFetchError(404, 'Not Found'))

      await viewsAPI.delete('tenant-123', 'user-123', view)
      // Delete operations typically don't return anything, so we just ensure no errors are thrown
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
})
