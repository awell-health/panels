import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { viewsAPI } from './viewsAPI'
import {
  mockData,
  mockResponses,
  testCrudOperations,
  setupTest,
  cleanupTest,
  mockFetchSuccess,
  mockFetchError,
  mockNetworkError,
} from './testUtils'

// Mock the API config
vi.mock('./config/apiConfig', () => ({
  apiConfig: {
    buildUrl: (path: string) => `https://api.test.com${path}`,
    getDefaultOptions: async () => ({
      headers: {
        'Content-Type': 'application/json',
      },
    }),
    getDefaultOptionsNoBody: async () => ({
      headers: {},
    }),
  },
}))

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
    it('should fetch all views', async () => {
      const expectedResponse = mockResponses.viewsResponse()
      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      const result = await viewsAPI.all()

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        'https://api.test.com/views',
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'GET')
      testCrudOperations.expectNoContentTypeHeader(mockFetch)
      expect(result).toEqual(expectedResponse)
    })

    it('should handle fetch errors', async () => {
      mockFetch.mockReturnValue(mockFetchError(500, 'Internal Server Error'))

      const result = await viewsAPI.all()
      expect(result).toMatchObject({ error: expect.any(String) })
    })
  })

  describe('get', () => {
    it('should fetch a single view', async () => {
      const view = { id: 'view-123' }
      const expectedResponse = mockResponses.viewResponse()
      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      const result = await viewsAPI.get(view)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        'https://api.test.com/views/view-123',
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'GET')
      testCrudOperations.expectNoContentTypeHeader(mockFetch)
      expect(result).toEqual(expectedResponse)
    })

    it('should handle not found errors', async () => {
      const view = { id: 'nonexistent-view' }
      mockFetch.mockReturnValue(mockFetchError(404, 'Not Found'))

      const result = await viewsAPI.get(view)
      expect(result).toMatchObject({ error: expect.any(String) })
    })

    it('should handle network errors', async () => {
      const view = { id: 'view-123' }
      mockFetch.mockReturnValue(mockNetworkError())

      await expect(viewsAPI.get(view)).rejects.toThrow('Network error')
    })

    it('should handle custom options', async () => {
      const view = { id: 'view-123' }
      const expectedResponse = mockResponses.viewResponse()
      const customOptions = { signal: new AbortController().signal }
      mockFetch.mockReturnValue(mockFetchSuccess(expectedResponse))

      await viewsAPI.get(view, customOptions)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining(customOptions),
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
      const view = { id: 'view-123' }

      mockFetch.mockReturnValue(mockFetchSuccess(null))

      await viewsAPI.delete(view)

      testCrudOperations.expectCorrectUrl(
        mockFetch,
        `https://api.test.com/views/${view.id}`,
      )
      testCrudOperations.expectCorrectMethod(mockFetch, 'DELETE')
    })

    it('should handle not found errors on delete', async () => {
      const view = { id: 'nonexistent-view' }

      mockFetch.mockReturnValue(mockFetchError(404, 'Not Found'))

      await expect(viewsAPI.delete(view)).resolves.toBeUndefined()
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

        const result = await viewsAPI.sorts.get(view)

        testCrudOperations.expectCorrectUrl(
          mockFetch,
          `https://api.test.com/views/${view.id}/sorts`,
        )
        testCrudOperations.expectCorrectMethod(mockFetch, 'GET')
        testCrudOperations.expectCorrectHeaders(mockFetch)
        expect(result).toEqual(expectedResponse)
      })

      it('should handle not found errors', async () => {
        const view = { id: 'view-123' }
        mockFetch.mockReturnValue(mockFetchError(404, 'Not Found'))

        const result = await viewsAPI.sorts.get(view)
        expect(result).toMatchObject({ error: expect.any(String) })
      })
    })
  })

  describe('error handling', () => {
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
  })
})
