import { describe, it, expect } from 'vitest'
import {
  UserRole,
  Permission,
  ResourceType,
  type UserContext,
  type JWTPayload,
  type ACLEntry,
} from './auth.js'

describe('Auth Types', () => {
  describe('UserRole enum', () => {
    it('should have the correct role values', () => {
      expect(UserRole.ADMIN).toBe('admin')
      expect(UserRole.BUILDER).toBe('builder')
      expect(UserRole.USER).toBe('user')
    })

    it('should include all expected roles', () => {
      const roles = Object.values(UserRole)
      expect(roles).toContain('admin')
      expect(roles).toContain('builder')
      expect(roles).toContain('user')
      expect(roles).toHaveLength(3)
    })
  })

  describe('Permission enum', () => {
    it('should have the correct permission values', () => {
      expect(Permission.VIEWER).toBe('viewer')
      expect(Permission.EDITOR).toBe('editor')
      expect(Permission.OWNER).toBe('owner')
    })

    it('should include all expected permissions', () => {
      const permissions = Object.values(Permission)
      expect(permissions).toContain('viewer')
      expect(permissions).toContain('editor')
      expect(permissions).toContain('owner')
      expect(permissions).toHaveLength(3)
    })
  })

  describe('ResourceType enum', () => {
    it('should have the correct resource type values', () => {
      expect(ResourceType.PANEL).toBe('panel')
      expect(ResourceType.VIEW).toBe('view')
    })

    it('should include all expected resource types', () => {
      const resourceTypes = Object.values(ResourceType)
      expect(resourceTypes).toContain('panel')
      expect(resourceTypes).toContain('view')
      expect(resourceTypes).toHaveLength(2)
    })
  })

  describe('UserContext interface', () => {
    it('should create a valid user context', () => {
      const userContext: UserContext = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        role: UserRole.BUILDER,
        tenantId: 'tenant-456',
      }

      expect(userContext.userId).toBe('user-123')
      expect(userContext.userEmail).toBe('test@example.com')
      expect(userContext.role).toBe(UserRole.BUILDER)
      expect(userContext.tenantId).toBe('tenant-456')
    })
  })

  describe('JWTPayload interface', () => {
    it('should create a valid JWT payload', () => {
      const now = Math.floor(Date.now() / 1000)
      const jwtPayload: JWTPayload = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        role: UserRole.ADMIN,
        tenantId: 'tenant-456',
        iat: now,
        exp: now + 3600, // 1 hour from now
      }

      expect(jwtPayload.userId).toBe('user-123')
      expect(jwtPayload.userEmail).toBe('test@example.com')
      expect(jwtPayload.role).toBe(UserRole.ADMIN)
      expect(jwtPayload.tenantId).toBe('tenant-456')
      expect(jwtPayload.iat).toBe(now)
      expect(jwtPayload.exp).toBe(now + 3600)
    })
  })

  describe('ACLEntry interface', () => {
    it('should create a valid ACL entry', () => {
      const aclEntry: ACLEntry = {
        id: 1,
        tenantId: 'tenant-456',
        resourceType: ResourceType.PANEL,
        resourceId: 123,
        userEmail: 'test@example.com',
        permission: Permission.EDITOR,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      }

      expect(aclEntry.id).toBe(1)
      expect(aclEntry.tenantId).toBe('tenant-456')
      expect(aclEntry.resourceType).toBe(ResourceType.PANEL)
      expect(aclEntry.resourceId).toBe(123)
      expect(aclEntry.userEmail).toBe('test@example.com')
      expect(aclEntry.permission).toBe(Permission.EDITOR)
      expect(aclEntry.createdAt).toBeInstanceOf(Date)
      expect(aclEntry.updatedAt).toBeInstanceOf(Date)
    })
  })
})
