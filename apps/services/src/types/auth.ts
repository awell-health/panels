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
}

/**
 * JWT payload structure from Stytch
 */
export interface JWTPayload {
  userId: string
  userEmail: string
  role: UserRole
  tenantId: string
  iat: number
  exp: number
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
  userEmail: string
  permission: Permission
  createdAt: Date
  updatedAt: Date
}
