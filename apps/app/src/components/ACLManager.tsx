'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useReactivePanelStore } from '@/hooks/use-reactive-panel-store'
import { useOrganizationMembers } from '@/hooks/use-organization-members'
import type { ACL, ACLCreate, ACLUpdate } from '@panels/types/acls'
import type { Panel, View } from '@/types/panel'

export function ACLManager() {
  const { store, getACLs, getACLsByUser, createACL, updateACL, deleteACL } =
    useReactivePanelStore()
  const {
    members: organizationMembers,
    isLoading: membersLoading,
    error: membersError,
  } = useOrganizationMembers()

  // Use ref to store the latest getACLs function to avoid stale closures
  const getACLsRef = useRef(getACLs)
  getACLsRef.current = getACLs

  // Use ref to store the latest getACLsByUser function to avoid stale closures
  const getACLsByUserRef = useRef(getACLsByUser)
  getACLsByUserRef.current = getACLsByUser

  const [panels, setPanels] = useState<Panel[]>([])
  const [selectedPanel, setSelectedPanel] = useState<string>('')
  const [views, setViews] = useState<View[]>([])
  const [selectedView, setSelectedView] = useState<string>('')
  const [resourceType, setResourceType] = useState<'panel' | 'view'>('panel')
  const [resourceId, setResourceId] = useState<number>(0)
  const [acls, setAcls] = useState<ACL[]>([])

  // User-based ACL view state
  const [viewMode, setViewMode] = useState<'resource' | 'user'>('resource')
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('')
  const [userAcls, setUserAcls] = useState<ACL[]>([])
  const [userResourceTypeFilter, setUserResourceTypeFilter] = useState<
    'all' | 'panel' | 'view'
  >('all')
  const [userAclsWithNames, setUserAclsWithNames] = useState<
    Array<ACL & { resourceName: string }>
  >([])

  console.log('acls', acls)
  console.log('userAcls', userAcls)

  // Form state for creating/updating ACLs
  const [userEmail, setUserEmail] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [permission, setPermission] = useState<'viewer' | 'editor' | 'owner'>(
    'viewer',
  )
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Load panels from the store
  useEffect(() => {
    if (store) {
      const panelsTable = store.getTable('panels')
      const panelsData = Object.values(panelsTable).map(
        (panel: Record<string, string | number | boolean>) => ({
          id: panel.id as string,
          name: panel.name as string,
          description: panel.description as string,
          metadata: panel.metadata ? JSON.parse(panel.metadata as string) : {},
          createdAt: new Date(panel.createdAt as string),
        }),
      )
      setPanels(panelsData)
      if (panelsData.length > 0) {
        setSelectedPanel(panelsData[0].id)
        setResourceId(Number.parseInt(panelsData[0].id))
      }
    }
  }, [store])

  // Load views when panel changes
  useEffect(() => {
    if (!selectedPanel || !store) return

    const viewsTable = store.getTable('views')
    const viewsData = Object.values(viewsTable)
      .map((view: Record<string, string | number | boolean>) => ({
        id: view.id as string,
        name: view.name as string,
        panelId: view.panelId as string,
        visibleColumns: view.visibleColumns
          ? JSON.parse(view.visibleColumns as string)
          : [],
        isPublished: Boolean(view.isPublished),
        metadata: view.metadata ? JSON.parse(view.metadata as string) : {},
        createdAt: new Date(view.createdAt as string),
      }))
      .filter((view: View) => view.panelId === selectedPanel)

    setViews(viewsData)
    setSelectedView('')
    setResourceType('panel')
    setResourceId(Number.parseInt(selectedPanel))
  }, [selectedPanel, store])

  // Load ACLs when resource changes - removed getACLs from dependencies
  useEffect(() => {
    const loadACLs = async () => {
      if (!resourceId) return
      try {
        setIsLoading(true)
        // Use the ref to get the latest function
        const aclsData = await getACLsRef.current(resourceType, resourceId)
        setAcls(aclsData)
        setMessage(
          `Loaded ${aclsData.length} ACLs for ${resourceType} ${resourceId}`,
        )
      } catch (error) {
        setMessage(`Failed to load ACLs: ${error}`)
      } finally {
        setIsLoading(false)
      }
    }
    loadACLs()
  }, [resourceType, resourceId]) // Removed getACLs from dependencies

  // Load ACLs by user when user email or filter changes
  useEffect(() => {
    const loadUserACLs = async () => {
      if (!selectedUserEmail) return
      try {
        setIsLoading(true)
        const resourceTypeFilter =
          userResourceTypeFilter === 'all' ? undefined : userResourceTypeFilter
        const userAclsData = await getACLsByUserRef.current(
          selectedUserEmail,
          resourceTypeFilter,
        )
        setUserAcls(userAclsData)

        // Enrich ACLs with resource names
        const enrichedACLs = await enrichACLsWithNames(userAclsData)
        setUserAclsWithNames(enrichedACLs)

        setMessage(
          `Loaded ${userAclsData.length} ACLs for user ${selectedUserEmail} (includes user-specific and public ACLs)`,
        )
      } catch (error) {
        setMessage(`Failed to load user ACLs: ${error}`)
      } finally {
        setIsLoading(false)
      }
    }
    loadUserACLs()
  }, [selectedUserEmail, userResourceTypeFilter])

  const handleViewChange = (viewId: string) => {
    setSelectedView(viewId)
    if (viewId) {
      setResourceType('view')
      setResourceId(Number.parseInt(viewId))
    } else {
      setResourceType('panel')
      setResourceId(Number.parseInt(selectedPanel))
    }
  }

  const handleMemberChange = (memberId: string) => {
    setSelectedMemberId(memberId)
    if (memberId) {
      const selectedMember = organizationMembers.find(
        (m) => m.member_id === memberId,
      )
      if (selectedMember) {
        setUserEmail(selectedMember.email_address)
      }
    } else {
      setUserEmail('')
    }
  }

  const handleUserSelection = (userEmail: string) => {
    setSelectedUserEmail(userEmail)
  }

  const enrichACLsWithNames = async (
    acls: ACL[],
  ): Promise<Array<ACL & { resourceName: string }>> => {
    if (!store)
      return acls.map((acl) => ({
        ...acl,
        resourceName: `ID: ${acl.resourceId}`,
      }))

    const enrichedACLs = await Promise.all(
      acls.map(async (acl) => {
        try {
          if (acl.resourceType === 'panel') {
            const panel = panels.find((p) => p.id === acl.resourceId.toString())
            return {
              ...acl,
              resourceName: panel ? panel.name : `Panel ID: ${acl.resourceId}`,
            }
          }
          if (acl.resourceType === 'view') {
            // Find the view
            const allViews = Object.values(store.getTable('views')).map(
              (view: Record<string, string | number | boolean>) => ({
                id: view.id as string,
                name: view.name as string,
                panelId: view.panelId as string,
              }),
            )

            const view = allViews.find(
              (v) => v.id === acl.resourceId.toString(),
            )
            if (view) {
              // Find the panel for this view
              const panel = panels.find((p) => p.id === view.panelId)
              const panelName = panel ? panel.name : `Panel ID: ${view.panelId}`
              return {
                ...acl,
                resourceName: `${view.name} (${panelName})`,
              }
            }
            return {
              ...acl,
              resourceName: `View ID: ${acl.resourceId}`,
            }
          }
          return { ...acl, resourceName: `ID: ${acl.resourceId}` }
        } catch (error) {
          console.error('Error enriching ACL with name:', error)
          return { ...acl, resourceName: `ID: ${acl.resourceId}` }
        }
      }),
    )

    return enrichedACLs
  }

  const handleCreateACL = async () => {
    if (!userEmail || !permission || !resourceId) {
      setMessage('Please fill in all fields')
      return
    }

    try {
      setIsLoading(true)
      const aclData: ACLCreate = { userEmail, permission }
      await createACL(resourceType, resourceId, aclData)
      setMessage(`ACL created successfully for ${userEmail}`)
      setUserEmail('')
      setPermission('viewer')

      // Reload ACLs using the ref
      const updatedAcls = await getACLsRef.current(resourceType, resourceId)
      setAcls(updatedAcls)
    } catch (error) {
      setMessage(`Failed to create ACL: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateACL = async (
    acl: ACL,
    newPermission: 'viewer' | 'editor' | 'owner',
  ) => {
    try {
      setIsLoading(true)
      const updateData: ACLUpdate = { permission: newPermission }
      await updateACL(resourceType, resourceId, acl.userEmail, updateData)
      setMessage(`ACL updated successfully for ${acl.userEmail}`)

      // Reload ACLs using the ref
      const updatedAcls = await getACLsRef.current(resourceType, resourceId)
      setAcls(updatedAcls)
    } catch (error) {
      setMessage(`Failed to update ACL: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteACL = async (acl: ACL) => {
    try {
      setIsLoading(true)
      await deleteACL(resourceType, resourceId, acl.userEmail)
      setMessage(`ACL deleted successfully for ${acl.userEmail}`)

      // Reload ACLs using the ref
      const updatedAcls = await getACLsRef.current(resourceType, resourceId)
      setAcls(updatedAcls)
    } catch (error) {
      setMessage(`Failed to delete ACL: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getPermissionColor = (perm: string) => {
    switch (perm) {
      case 'owner':
        return 'text-red-600 font-bold'
      case 'editor':
        return 'text-blue-600 font-semibold'
      case 'viewer':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const getAccessTypeInfo = (acl: ACL) => {
    if (acl.userEmail === '_all') {
      return {
        type: 'Public',
        color: 'text-purple-600 font-semibold',
        description: 'Available to all users',
      }
    }
    return {
      type: 'User-specific',
      color: 'text-gray-600',
      description: 'Specific to this user',
    }
  }

  if (!store) {
    return (
      <div className="p-6 text-center">
        <p>
          Store not available. Make sure you're using this component within a
          ReactivePanelStoreProvider.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ACL Management Component</h1>

      {/* Organization Members Info */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Organization Members</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Total Members:{' '}
              {membersLoading ? 'Loading...' : organizationMembers.length}
            </p>
            {membersError && (
              <p className="text-sm text-red-600 mt-1">
                Error loading members: {membersError}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">View Mode</h2>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="viewMode"
              value="resource"
              checked={viewMode === 'resource'}
              onChange={(e) =>
                setViewMode(e.target.value as 'resource' | 'user')
              }
              className="mr-2"
            />
            <span>View ACLs by Resource</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="viewMode"
              value="user"
              checked={viewMode === 'user'}
              onChange={(e) =>
                setViewMode(e.target.value as 'resource' | 'user')
              }
              className="mr-2"
            />
            <span>View ACLs by User</span>
          </label>
        </div>
      </div>

      {/* User Selection (for user-based view) */}
      {viewMode === 'user' && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3">Select User</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="user-select"
                className="block text-sm font-medium mb-2"
              >
                Organization Member:
              </label>
              <select
                id="user-select"
                value={selectedUserEmail}
                onChange={(e) => handleUserSelection(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={membersLoading}
              >
                <option value="">Select a user...</option>
                {organizationMembers.map((member) => (
                  <option key={member.member_id} value={member.email_address}>
                    {member.name || member.email_address} (
                    {member.email_address})
                  </option>
                ))}
              </select>
              {membersLoading && (
                <p className="text-sm text-gray-500 mt-1">Loading members...</p>
              )}
            </div>

            <div>
              <label
                htmlFor="user-resource-type-filter"
                className="block text-sm font-medium mb-2"
              >
                Resource Type Filter:
              </label>
              <select
                id="user-resource-type-filter"
                value={userResourceTypeFilter}
                onChange={(e) =>
                  setUserResourceTypeFilter(
                    e.target.value as 'all' | 'panel' | 'view',
                  )
                }
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Resources</option>
                <option value="panel">Panels Only</option>
                <option value="view">Views Only</option>
              </select>
            </div>
          </div>

          {selectedUserEmail && (
            <div className="mt-3 p-3 bg-blue-50 rounded border">
              <strong>Selected User:</strong> {selectedUserEmail}
              {userResourceTypeFilter !== 'all' && (
                <span className="ml-2">
                  <strong>Filter:</strong> {userResourceTypeFilter}s only
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Resource Selection (for resource-based view) */}
      {viewMode === 'resource' && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3">Select Resource</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="panel-select"
                className="block text-sm font-medium mb-2"
              >
                Panel:
              </label>
              <select
                id="panel-select"
                value={selectedPanel}
                onChange={(e) => setSelectedPanel(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                {panels.map((panel) => (
                  <option key={panel.id} value={panel.id}>
                    {panel.name} (ID: {panel.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="view-select"
                className="block text-sm font-medium mb-2"
              >
                View (Optional):
              </label>
              <select
                id="view-select"
                value={selectedView}
                onChange={(e) => handleViewChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">No view selected (use panel)</option>
                {views.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.name} (ID: {view.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 p-3 bg-blue-50 rounded border">
            <strong>Current Resource:</strong> {resourceType} ID: {resourceId}
          </div>
        </div>
      )}

      {/* Create ACL Form (only in resource mode) */}
      {viewMode === 'resource' && (
        <div className="bg-white border border-gray-200 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3">Create New ACL</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="member-select"
                className="block text-sm font-medium mb-2"
              >
                Organization Member:
              </label>
              <select
                id="member-select"
                value={selectedMemberId}
                onChange={(e) => handleMemberChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                disabled={membersLoading}
              >
                <option value="">Select a member...</option>
                {organizationMembers.map((member) => (
                  <option key={member.member_id} value={member.member_id}>
                    {member.name || member.email_address} (
                    {member.email_address})
                  </option>
                ))}
              </select>
              {membersLoading && (
                <p className="text-sm text-gray-500 mt-1">Loading members...</p>
              )}
              {membersError && (
                <p className="text-sm text-red-500 mt-1">
                  Error: {membersError}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="user-email"
                className="block text-sm font-medium mb-2"
              >
                User Email:
              </label>
              <input
                id="user-email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label
                htmlFor="permission-select"
                className="block text-sm font-medium mb-2"
              >
                Permission:
              </label>
              <select
                id="permission-select"
                value={permission}
                onChange={(e) =>
                  setPermission(e.target.value as 'viewer' | 'editor' | 'owner')
                }
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="owner">Owner</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedMemberId('')
                  setUserEmail('')
                  // The hook will automatically refetch when called
                }}
                className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                title="Clear form and refresh members list"
              >
                ↻ Refresh Members
              </button>
              <button
                type="button"
                onClick={handleCreateACL}
                disabled={isLoading || !userEmail}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create ACL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACL List - Resource Mode */}
      {viewMode === 'resource' && (
        <div className="bg-white border border-gray-200 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3">
            ACLs for {resourceType} {resourceId}
            {isLoading && (
              <span className="ml-2 text-gray-500">(Loading...)</span>
            )}
          </h2>

          {acls.length === 0 ? (
            <p className="text-gray-500">No ACLs found for this resource.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {acls.map((acl) => (
                    <tr
                      key={`${acl.resourceType}-${acl.resourceId}-${acl.userEmail}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {acl.userEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={getPermissionColor(acl.permission)}>
                          {acl.permission}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(acl.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {/* Permission Update Buttons */}
                          {acl.permission !== 'viewer' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateACL(acl, 'viewer')}
                              disabled={isLoading}
                              className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                            >
                              Set Viewer
                            </button>
                          )}
                          {acl.permission !== 'editor' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateACL(acl, 'editor')}
                              disabled={isLoading}
                              className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                            >
                              Set Editor
                            </button>
                          )}
                          {acl.permission !== 'owner' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateACL(acl, 'owner')}
                              disabled={isLoading}
                              className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                            >
                              Set Owner
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteACL(acl)}
                            disabled={isLoading}
                            className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* User ACL List - User Mode */}
      {viewMode === 'user' && (
        <div className="bg-white border border-gray-200 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-3">
            ACLs for User: {selectedUserEmail || 'No user selected'}
            {isLoading && (
              <span className="ml-2 text-gray-500">(Loading...)</span>
            )}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            This view shows both user-specific ACLs and public ACLs (marked as
            "Public" in the Access Type column) that apply to this user.
          </p>

          {!selectedUserEmail ? (
            <p className="text-gray-500">
              Please select a user to view their ACLs.
            </p>
          ) : userAclsWithNames.length === 0 ? (
            <p className="text-gray-500">No ACLs found for this user.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Access Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userAclsWithNames.map((acl) => {
                    const accessTypeInfo = getAccessTypeInfo(acl)
                    return (
                      <tr
                        key={`${acl.resourceType}-${acl.resourceId}-${acl.userEmail}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {acl.resourceType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {acl.resourceName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={getPermissionColor(acl.permission)}>
                            {acl.permission}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={accessTypeInfo.color}
                            title={accessTypeInfo.description}
                          >
                            {accessTypeInfo.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(acl.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Status Messages */}
      {message && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-blue-800">{message}</p>
        </div>
      )}
    </div>
  )
}
