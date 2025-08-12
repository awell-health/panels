import { describe, it, expect, vi, beforeEach } from 'vitest'
import { aclAPI } from './aclAPI'

// Mock the apiConfig module
vi.mock('./config/apiConfig', () => ({
  apiConfig: {
    getDefaultOptions: vi.fn().mockResolvedValue({
      headers: { 'Content-Type': 'application/json' },
    }),
    getDefaultOptionsNoBody: vi.fn().mockResolvedValue({
      headers: { 'Content-Type': 'application/json' },
    }),
    buildUrl: vi
      .fn()
      .mockImplementation((path: string) => `http://localhost:3000${path}`),
  },
}))

// Define proper types for fetch mock
type MockFetchResponse = {
  json?: () => Promise<unknown>
  status?: number
}

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('aclAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('should list ACLs for a resource', async () => {
      const mockResponse = { acls: [] }
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      } as MockFetchResponse)

      const result = await aclAPI.list('panel', 1)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/acls/panel/1',
        expect.objectContaining({
          method: 'GET',
        }),
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('create', () => {
    it('should create a new ACL entry', async () => {
      const mockResponse = {
        acl: { id: 1, userEmail: 'user@example.com', permission: 'viewer' },
      }
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      } as MockFetchResponse)

      const aclData = {
        userEmail: 'user@example.com',
        permission: 'viewer' as const,
      }
      const result = await aclAPI.create('panel', 1, aclData)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/acls/panel/1',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(aclData),
        }),
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('update', () => {
    it('should update an existing ACL entry', async () => {
      const mockResponse = {
        acl: { id: 1, userEmail: 'user@example.com', permission: 'editor' },
      }
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      } as MockFetchResponse)

      const updateData = { permission: 'editor' as const }
      const result = await aclAPI.update(
        'panel',
        1,
        'user@example.com',
        updateData,
      )

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/acls/panel/1/user@example.com',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        }),
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('delete', () => {
    it('should delete an ACL entry', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 204,
      } as MockFetchResponse)

      await aclAPI.delete('panel', 1, 'user@example.com')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/acls/panel/1/user@example.com',
        expect.objectContaining({
          method: 'DELETE',
        }),
      )
    })
  })

  describe('resource types', () => {
    it('should work with panel resource type', async () => {
      const mockResponse = { acls: [] }
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      } as MockFetchResponse)

      await aclAPI.list('panel', 1)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/acls/panel/1',
        expect.any(Object),
      )
    })

    it('should work with view resource type', async () => {
      const mockResponse = { acls: [] }
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      } as MockFetchResponse)

      await aclAPI.list('view', 1)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/acls/view/1',
        expect.any(Object),
      )
    })
  })

  describe('permissions', () => {
    it('should handle all permission types', async () => {
      const permissions = ['viewer', 'editor', 'owner'] as const

      for (const permission of permissions) {
        const mockResponse = {
          acl: { id: 1, userEmail: 'user@example.com', permission },
        }
        mockFetch.mockResolvedValueOnce({
          json: () => Promise.resolve(mockResponse),
        } as MockFetchResponse)

        const aclData = { userEmail: 'user@example.com', permission }
        const result = await aclAPI.create('panel', 1, aclData)

        expect(result.acl.permission).toBe(permission)
      }
    })
  })
})
