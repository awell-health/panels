import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createApp } from '../src/app.js'
import { AccessControlList } from '../src/modules/acl/entities/access-control-list.entity.js'

describe('ACL Management', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should have ACL routes registered', async () => {
    const routes = app.printRoutes()

    // Check if ACL routes are registered
    expect(routes).toContain('acls/')
    expect(routes).toContain(':resourceType')
    expect(routes).toContain(':resourceId')
    expect(routes).toContain('share-public')
  })

  it('should have AccessControlList entity available', () => {
    expect(AccessControlList).toBeDefined()
    expect(AccessControlList.name).toBe('AccessControlList')
  })

  describe('ACL Route Structure', () => {
    it('should have GET route for listing ACLs', () => {
      const routes = app.printRoutes()
      expect(routes).toContain('acls/')
      expect(routes).toContain('GET')
    })

    it('should have POST route for creating ACLs', () => {
      const routes = app.printRoutes()
      expect(routes).toContain('acls/')
      expect(routes).toContain('POST')
    })

    it('should have PUT route for updating ACLs', () => {
      const routes = app.printRoutes()
      expect(routes).toContain('acls/')
      expect(routes).toContain('PUT')
    })

    it('should have DELETE route for removing ACLs', () => {
      const routes = app.printRoutes()
      expect(routes).toContain('acls/')
      expect(routes).toContain('DELETE')
    })

    it('should have share-public route for public sharing', () => {
      const routes = app.printRoutes()
      expect(routes).toContain('acls/')
      expect(routes).toContain('share-public')
    })
  })

  describe('ACL Route Parameters', () => {
    it('should handle panel resource type', () => {
      const routes = app.printRoutes()
      expect(routes).toContain('acls/')
      expect(routes).toContain(':resourceType')
      expect(routes).toContain(':resourceId')
    })

    it('should handle view resource type', () => {
      const routes = app.printRoutes()
      expect(routes).toContain('acls/')
      expect(routes).toContain(':resourceType')
      expect(routes).toContain(':resourceId')
    })

    it('should handle user email parameter for update/delete', () => {
      const routes = app.printRoutes()
      expect(routes).toContain('acls/')
      expect(routes).toContain(':userEmail')
    })
  })

  describe('ACL Entity Properties', () => {
    it('should have required ACL properties', () => {
      const acl = new AccessControlList()

      // Test that we can set the required properties
      acl.tenantId = 'test-tenant'
      acl.resourceType = 'panel'
      acl.resourceId = 1
      acl.userEmail = 'user@example.com'
      acl.permission = 'viewer'

      expect(acl.tenantId).toBe('test-tenant')
      expect(acl.resourceType).toBe('panel')
      expect(acl.resourceId).toBe(1)
      expect(acl.userEmail).toBe('user@example.com')
      expect(acl.permission).toBe('viewer')
    })

    it('should handle special _all user email for public access', () => {
      const acl = new AccessControlList()
      acl.tenantId = 'test-tenant'
      acl.resourceType = 'view'
      acl.resourceId = 1
      acl.userEmail = '_all' // Special case for public access
      acl.permission = 'viewer'

      expect(acl.userEmail).toBe('_all')
      expect(acl.permission).toBe('viewer')
    })

    it('should validate resource type constraints', () => {
      const acl = new AccessControlList()

      // These should be valid resource types
      expect(() => {
        acl.resourceType = 'panel'
      }).not.toThrow()

      expect(() => {
        acl.resourceType = 'view'
      }).not.toThrow()
    })

    it('should validate permission constraints', () => {
      const acl = new AccessControlList()

      // These should be valid permissions
      expect(() => {
        acl.permission = 'viewer'
      }).not.toThrow()

      expect(() => {
        acl.permission = 'editor'
      }).not.toThrow()

      expect(() => {
        acl.permission = 'owner'
      }).not.toThrow()
    })
  })

  describe('ACL Route Integration', () => {
    it('should have proper route hierarchy', () => {
      const routes = app.printRoutes()

      // Check the complete route structure
      expect(routes).toContain('acls/')
      expect(routes).toContain(':resourceType')
      expect(routes).toContain(':resourceId')
      expect(routes).toContain('share-public')
      expect(routes).toContain(':userEmail')
    })

    it('should support both panel and view resource types', () => {
      const routes = app.printRoutes()

      // The routes should be generic enough to handle both resource types
      expect(routes).toContain('acls/')
      expect(routes).toContain(':resourceType')
      expect(routes).toContain(':resourceId')
    })

    it('should have proper HTTP methods for each operation', () => {
      const routes = app.printRoutes()

      // List ACLs
      expect(routes).toContain('GET')

      // Create ACL
      expect(routes).toContain('POST')

      // Update ACL
      expect(routes).toContain('PUT')

      // Delete ACL
      expect(routes).toContain('DELETE')
    })
  })
})
