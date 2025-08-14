'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { X, Search, User, Trash2, Eye, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'
import Select from 'react-select'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import { useOrganizationMembers } from '../../../../hooks/use-organization-members'
import { useReactivePanelStore } from '../../../../hooks/use-reactive-panel-store'
import { useACL } from '../../../../contexts/ACLContext'
import { useParams } from 'next/navigation'
import type { ACL } from '@panels/types/acls'
import { formatDate } from '@medplum/core'
import { orderBy, startCase } from 'lodash'
import { useToast, useToastHelpers } from '../../../../contexts/ToastContext'

type Permission = 'viewer' | 'editor' | 'owner'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  viewName?: string
}

export function ShareModal({ isOpen, onClose, viewName }: ShareModalProps) {
  const params = useParams()
  const panelId = params.panel as string
  const viewId = params.view as string
  const isView = !!viewId
  const currentResourceId = isView ? Number(viewId) : Number(panelId)
  const currentResourceType = isView ? 'view' : 'panel'

  const [sharedUsers, setSharedUsers] = useState<ACL[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userToDelete, setUserToDelete] = useState<ACL | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const { showSuccess, showInfo } = useToastHelpers()

  const { getACLs, createACL, updateACL, deleteACL } = useReactivePanelStore()
  const { refreshACL } = useACL()

  const { members: organizationMembers } = useOrganizationMembers()

  const fetchACLs = async () => {
    const acls = await getACLs(isView ? 'view' : 'panel', currentResourceId)
    setSharedUsers(acls)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      fetchACLs()
      setIsLoading(false)
    }
  }, [isOpen])

  const handleAddUser = async (email: string) => {
    try {
      const newACLUser = await createACL(
        currentResourceType,
        currentResourceId,
        {
          userEmail: email,
          permission: 'viewer',
        },
      )

      setSharedUsers((prev) => [...prev, newACLUser])

      // Refresh ACL context
      await refreshACL(currentResourceType, currentResourceId)

      showSuccess(`User ${email} has been added to the ${currentResourceType}`)
    } catch (error) {
      console.error('Failed to add user:', error)
    }
  }

  const handleRemoveUser = async (userEmail: string) => {
    try {
      setSharedUsers((prev) =>
        prev.filter((user) => user.userEmail !== userEmail),
      )

      setIsDeleteModalOpen(false)
      setUserToDelete(null)

      await deleteACL(currentResourceType, currentResourceId, userEmail)

      // Refresh ACL context
      await refreshACL(currentResourceType, currentResourceId)

      showInfo(
        `User ${userEmail} has been removed from the ${currentResourceType}`,
      )
    } catch (error) {
      console.error('Failed to remove user:', error)
    }
  }

  const openDeleteModal = (user: ACL) => {
    setUserToDelete(user)
    setIsDeleteModalOpen(true)
  }

  const handleRoleChange = async (userEmail: string, newRole: Permission) => {
    try {
      setSharedUsers((prev) =>
        prev.map((user) =>
          user.userEmail.toLowerCase() === userEmail.toLowerCase()
            ? { ...user, permission: newRole }
            : user,
        ),
      )

      await updateACL(currentResourceType, currentResourceId, userEmail, {
        permission: newRole,
      })

      // Refresh ACL context
      await refreshACL(currentResourceType, currentResourceId)

      showSuccess(`User ${userEmail} has been updated to ${newRole}`)
    } catch (error) {
      console.error('Failed to update role:', error)
    }
  }

  const handleSave = async () => {
    try {
      // Mock API call - replace with actual save API
      console.log('Saving shared users:', sharedUsers)
      onClose()
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }

  const filteredOrganizationMembers = organizationMembers?.filter(
    (member) =>
      !sharedUsers.some((user) => user.userEmail === member.email_address),
  )
  const organizationMembersOptions = orderBy(
    filteredOrganizationMembers?.map((member) => ({
      value: member.email_address,
      label: member.email_address + (member.name ? ` (${member.name})` : ''),
    })),
    ['label'],
    ['asc'],
  )

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      className="w-full max-w-2xl"
    >
      <DialogContent className="p-0 m-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-medium text-xs">
              Share{' '}
              {viewName && (
                <p className="text-xs text-gray-600 mt-1">{viewName}</p>
              )}
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-xs btn-ghost btn-square"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4 text-xs">
          <div className="space-y-2">
            <Select
              id="add-people"
              placeholder="Search by email..."
              isClearable
              isSearchable
              isLoading={isLoading}
              isDisabled={isLoading}
              defaultInputValue={''}
              options={organizationMembersOptions}
              value={
                selectedUser
                  ? { value: selectedUser, label: selectedUser }
                  : null
              }
              onChange={(option) => {
                if (option) {
                  handleAddUser(option.value)
                  setSelectedUser(null) // Reset to empty
                }
              }}
              onInputChange={(inputValue, { action }) => {
                if (action === 'set-value') {
                  return '' // Clear input after selection
                }
                return inputValue
              }}
            />

            {isLoading && (
              <div className="text-xs text-gray-500 mt-2">Searching...</div>
            )}
          </div>

          {/* Shared Users List */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">
              People with access ({sharedUsers.length})
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[40vh]">
              {sharedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-xs font-medium">
                        {user.userEmail}
                      </div>
                      <div className="text-xs text-gray-500">
                        Added {formatDate(user.updatedAt.toLocaleString())}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select
                      value={{
                        value: user.permission,
                        label: startCase(user.permission),
                      }}
                      isDisabled={user.permission === 'owner'}
                      onChange={(option) => {
                        if (option) {
                          handleRoleChange(
                            user.userEmail,
                            option.value as Permission,
                          )
                        }
                      }}
                      options={[
                        { value: 'editor' as Permission, label: 'Editor' },
                        { value: 'viewer' as Permission, label: 'Viewer' },
                      ]}
                      menuPosition="fixed"
                      classNames={{
                        container: () => 'w-32', // Set width
                        control: (state) =>
                          cn(
                            'text-xs border rounded',
                            state.isFocused
                              ? 'border-primary ring-1 ring-primary'
                              : 'border-gray-300 hover:border-gray-400',
                          ),
                        option: (state) =>
                          cn(
                            'text-xs px-2 py-1 cursor-pointer',
                            state.isFocused
                              ? 'bg-primary text-primary-foreground'
                              : '',
                            state.isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'text-gray-900',
                          ),
                        menu: () =>
                          'border border-gray-300 rounded shadow-lg bg-white',
                        menuList: () => 'py-1',
                        singleValue: () => 'text-xs text-gray-900',
                        placeholder: () => 'text-xs text-gray-500',
                        input: () => 'text-xs',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => openDeleteModal(user)}
                      className="btn btn-xs btn-ghost btn-square text-red-500 disabled:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove user"
                      disabled={user.permission === 'owner'}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}

              {sharedUsers.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No users have access yet</p>
                  <p className="text-xs">Search and add users above</p>
                </div>
              )}
            </div>
          </div>

          {/* Role Descriptions */}
          <div className="bg-blue-50 p-3 rounded-md">
            <div className="text-xs font-medium text-blue-900 mb-2">
              Role permissions:
            </div>
            <div className="space-y-1 text-xs text-blue-800">
              <div className="flex items-center space-x-2">
                <Eye className="h-3 w-3" />
                <span>
                  <strong>Viewer:</strong> Can view the panel and data
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Edit className="h-3 w-3" />
                <span>
                  <strong>Editor:</strong> Can view, edit, and manage the panel
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-sm btn-primary text-xs"
          >
            Close
          </button>
        </div>
      </DialogContent>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setUserToDelete(null)
        }}
        onConfirm={() =>
          userToDelete && handleRemoveUser(userToDelete.userEmail)
        }
        title="Remove User Access"
        message={`Are you sure you want to remove access for ${userToDelete?.userEmail}?`}
      />
    </Dialog>
  )
}
