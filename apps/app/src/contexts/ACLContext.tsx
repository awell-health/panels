'use client'

import type React from 'react'
import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { useAuthentication } from '@/hooks/use-authentication'
import { useReactivePanelStore } from '@/hooks/use-reactive-panel-store'
import type { ACL } from '@panels/types/acls'

type ResourceType = 'panel' | 'view'

interface ACLContextType {
  // Get user role for a specific resource
  getUserRole: (
    resourceType: ResourceType,
    resourceId: string | number,
  ) => string | null
  // Get ACL object for a specific resource
  getUserACL: (
    resourceType: ResourceType,
    resourceId: string | number,
  ) => ACL | null
  // Check if user has specific permission
  hasPermission: (
    resourceType: ResourceType,
    resourceId: string | number,
    permission: 'viewer' | 'editor' | 'owner',
  ) => boolean
  // Get all ACLs for current user
  getAllUserACLs: () => Record<string, ACL | null>
  // Loading state
  isLoading: boolean
  // Refresh ACLs for a specific resource
  refreshACL: (
    resourceType: ResourceType,
    resourceId: string | number,
  ) => Promise<void>
  // Refresh all ACLs
  refreshAllACLs: () => Promise<void>
}

const ACLContext = createContext<ACLContextType | null>(null)

interface ACLProviderProps {
  children: React.ReactNode
}

export function ACLProvider({ children }: ACLProviderProps) {
  const { email, isAdmin } = useAuthentication()
  const { getACLs } = useReactivePanelStore()
  const [acls, setAcls] = useState<Record<string, ACL | null>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [loadedResources, setLoadedResources] = useState<Set<string>>(new Set())

  // Create a key for storing ACLs in the map
  const createACLKey = (
    resourceType: ResourceType,
    resourceId: string | number,
  ) => `${resourceType}:${resourceId}`

  // Fetch ACL for a specific resource
  const fetchACL = async (
    resourceType: ResourceType,
    resourceId: string | number,
  ) => {
    if (!email) return null

    const key = createACLKey(resourceType, resourceId)

    // Don't fetch if already loaded
    if (loadedResources.has(key)) {
      return acls[key] || null
    }

    try {
      const resourceACLs = await getACLs(resourceType, Number(resourceId))
      const userACL =
        resourceACLs.find((acl) => acl.userEmail === email) || null

      setAcls((prev) => ({
        ...prev,
        [key]: userACL,
      }))

      setLoadedResources((prev) => new Set(prev).add(key))

      return userACL
    } catch (error) {
      console.error(
        `Failed to fetch ACL for ${resourceType} ${resourceId}:`,
        error,
      )
      return null
    }
  }

  // Get user role for a specific resource
  const getUserRole = (
    resourceType: ResourceType,
    resourceId: string | number,
  ): string | null => {
    const key = createACLKey(resourceType, resourceId)

    // If not loaded yet, trigger a fetch
    if (!loadedResources.has(key)) {
      fetchACL(resourceType, resourceId)
    }

    return acls[key]?.permission || null
  }

  // Get ACL object for a specific resource
  const getUserACL = (
    resourceType: ResourceType,
    resourceId: string | number,
  ): ACL | null => {
    const key = createACLKey(resourceType, resourceId)

    // If not loaded yet, trigger a fetch
    if (!loadedResources.has(key)) {
      fetchACL(resourceType, resourceId)
    }

    return acls[key] || null
  }

  // Check if user has specific permission
  const hasPermission = (
    resourceType: ResourceType,
    resourceId: string | number,
    permission: 'viewer' | 'editor' | 'owner',
  ): boolean => {
    if (isAdmin) {
      return true
    }

    const userRole = getUserRole(resourceType, resourceId)
    if (!userRole) return false

    const permissionLevels = {
      viewer: 1,
      editor: 2,
      owner: 3,
    }

    return (
      permissionLevels[userRole as keyof typeof permissionLevels] >=
      permissionLevels[permission]
    )
  }

  // Get all ACLs for current user
  const getAllUserACLs = (): Record<string, ACL | null> => {
    return acls
  }

  // Refresh ACL for a specific resource
  const refreshACL = async (
    resourceType: ResourceType,
    resourceId: string | number,
  ) => {
    const key = createACLKey(resourceType, resourceId)
    setLoadedResources((prev) => {
      const newSet = new Set(prev)
      newSet.delete(key)
      return newSet
    })
    await fetchACL(resourceType, resourceId)
  }

  // Refresh all ACLs
  const refreshAllACLs = async () => {
    setIsLoading(true)
    setLoadedResources(new Set())
    setAcls({})
    setIsLoading(false)
  }

  // Clear ACLs when user changes
  useEffect(() => {
    setAcls({})
    setLoadedResources(new Set())
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const contextValue = useMemo(
    () => ({
      getUserRole,
      getUserACL,
      hasPermission,
      getAllUserACLs,
      isLoading,
      refreshACL,
      refreshAllACLs,
    }),
    [acls, isLoading],
  )

  return (
    <ACLContext.Provider value={contextValue}>{children}</ACLContext.Provider>
  )
}

// Hook to use the ACL context
export function useACL() {
  const context = useContext(ACLContext)
  if (!context) {
    throw new Error('useACL must be used within an ACLProvider')
  }
  return context
}

// Convenience hook for getting user role for a panel
export function usePanelRole(panelId: string | number) {
  const { getUserRole, getUserACL, hasPermission } = useACL()

  return {
    role: getUserRole('panel', panelId),
    acl: getUserACL('panel', panelId),
    hasViewerPermission: hasPermission('panel', panelId, 'viewer'),
    hasEditorPermission: hasPermission('panel', panelId, 'editor'),
    hasOwnerPermission: hasPermission('panel', panelId, 'owner'),
  }
}

// Convenience hook for getting user role for a view
export function useViewRole(viewId: string | number) {
  const { getUserRole, getUserACL, hasPermission } = useACL()

  return {
    role: getUserRole('view', viewId),
    acl: getUserACL('view', viewId),
    hasViewerPermission: hasPermission('view', viewId, 'viewer'),
    hasEditorPermission: hasPermission('view', viewId, 'editor'),
    hasOwnerPermission: hasPermission('view', viewId, 'owner'),
  }
}

// Hook to get both panel and view roles (useful for nested resources)
export function useResourceRole(
  panelId: string | number,
  viewId?: string | number,
) {
  const { getUserRole, getUserACL, hasPermission } = useACL()

  const panelRole = getUserRole('panel', panelId)
  const viewRole = viewId ? getUserRole('view', viewId) : null

  // For views, check both panel and view permissions
  const effectiveRole = viewId ? viewRole || panelRole : panelRole

  return {
    panelRole,
    viewRole,
    effectiveRole,
    panelAcl: getUserACL('panel', panelId),
    viewAcl: viewId ? getUserACL('view', viewId) : null,
    // Permission checks that consider both panel and view levels
    hasViewerPermission: viewId
      ? hasPermission('view', viewId, 'viewer') ||
        hasPermission('panel', panelId, 'viewer')
      : hasPermission('panel', panelId, 'viewer'),
    hasEditorPermission: viewId
      ? hasPermission('view', viewId, 'editor') ||
        hasPermission('panel', panelId, 'editor')
      : hasPermission('panel', panelId, 'editor'),
    hasOwnerPermission: viewId
      ? hasPermission('view', viewId, 'owner') ||
        hasPermission('panel', panelId, 'owner')
      : hasPermission('panel', panelId, 'owner'),
  }
}
