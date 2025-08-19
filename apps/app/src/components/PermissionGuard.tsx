import type { ReactNode } from 'react'
import { useACL } from '@/contexts/ACLContext'

type ResourceType = 'panel' | 'view'
type Permission = 'viewer' | 'editor' | 'owner'

interface PermissionGuardProps {
  resourceType: ResourceType
  resourceId: string | number
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGuard({
  resourceType,
  resourceId,
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission } = useACL()

  if (hasPermission(resourceType, resourceId, permission)) {
    return <>{children}</>
  }

  return <>{fallback}</>
}

// Convenience components for common use cases
export function PanelPermissionGuard({
  panelId,
  permission,
  children,
  fallback,
}: Omit<PermissionGuardProps, 'resourceType'> & { panelId: string | number }) {
  return (
    <PermissionGuard
      resourceType="panel"
      resourceId={panelId}
      permission={permission}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  )
}

export function ViewPermissionGuard({
  viewId,
  permission,
  children,
  fallback,
}: Omit<PermissionGuardProps, 'resourceType'> & { viewId: string | number }) {
  return (
    <PermissionGuard
      resourceType="view"
      resourceId={viewId}
      permission={permission}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  )
}

// Guard that checks both panel and view permissions (view takes precedence)
interface ResourcePermissionGuardProps {
  panelId: string | number
  viewId?: string | number
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}

export function ResourcePermissionGuard({
  panelId,
  viewId,
  permission,
  children,
  fallback = null,
}: ResourcePermissionGuardProps) {
  const { hasPermission } = useACL()

  // If viewId is provided, check view permission first, then fall back to panel
  const hasAccess = viewId
    ? hasPermission('view', viewId, permission) ||
      hasPermission('panel', panelId, permission)
    : hasPermission('panel', panelId, permission)

  if (hasAccess) {
    return <>{children}</>
  }

  return <>{fallback}</>
}
