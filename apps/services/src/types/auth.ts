/**
 * Role-Based Access Control (RBAC) types
 * These types define the user roles and permissions for the system
 */

/**
 * User roles supported by the system
 */
export enum UserRole {
  ADMIN = 'admin',
  BUILDER = 'builder',
  USER = 'user',
}

/**
 * Permission levels for resources
 */
export enum Permission {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  OWNER = 'owner',
}

/**
 * Resource types that can have ACLs
 */
export enum ResourceType {
  PANEL = 'panel',
  VIEW = 'view',
}

/**
 * User context extracted from JWT token
 */
export interface UserContext {
  userId: string
  userEmail: string
  role: UserRole
  tenantId: string
  organizationId: string
}

/**
 * JWT payload structure from Stytch
 */
export interface JWTPayload {
  aud: string[]
  email: string
  exp: number
  'https://stytch.com/organization': {
    organization_id: string
    slug: string
  }
  'https://stytch.com/session': {
    id: string
    expires_at: string
    roles: string[]
  }
  iat: number
  iss: string
  nbf: number
  sub: string
}

/**
 * Permission check result
 */
export interface PermissionResult {
  canAccess: boolean
  permission: Permission | null
  reason?: string
}

/**
 * ACL entry for resource access control
 */
export interface ACLEntry {
  id: number
  tenantId: string
  resourceType: ResourceType
  resourceId: number
  userEmail?: string // Made optional to match UserContext
  permission: Permission
  createdAt: Date
  updatedAt: Date
}
