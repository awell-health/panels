'use client'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useReactiveViews,
  useReactiveColumns,
  useReactiveView,
} from '@/hooks/use-reactive-data'
import { useReactivePanelStore } from '@/hooks/use-reactive-panel-store'
import type { Panel, View, Filter } from '@/types/panel'
import {
  LayoutGrid,
  Plus,
  X,
  Users,
  CheckSquare,
  Copy,
  FileText,
  Edit3Icon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface PanelNavigationProps {
  panel: Panel
  selectedViewId?: string
  currentViewType?: 'patient' | 'task'
  currentFilters?: Filter[]
  onPanelTitleChange?: (newTitle: string) => void
  onViewTitleChange?: (newTitle: string) => void
  canEdit: boolean
}

type ViewCreationType = 'patient' | 'task' | 'from-panel' | 'copy-view'

export default function PanelNavigation({
  panel,
  selectedViewId,
  currentViewType,
  currentFilters,
  onPanelTitleChange,
  onViewTitleChange,
  canEdit,
}: PanelNavigationProps) {
  const { deletePanel, deleteView, updatePanel, updateView, addView } =
    useReactivePanelStore()
  const router = useRouter()
  const [editingPanel, setEditingPanel] = useState(false)
  const [editingViewId, setEditingViewId] = useState<string | null>(null)
  const [panelTitle, setPanelTitle] = useState(panel.name)
  const [viewTitles, setViewTitles] = useState<Record<string, string>>({})
  const [hoveredViewId, setHoveredViewId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCreateViewModal, setShowCreateViewModal] = useState(false)
  const [viewToDelete, setViewToDelete] = useState<{
    id: string
    title: string
    viewType: 'panel' | 'view'
  } | null>(null)
  const [deletingViewId, setDeletingViewId] = useState<string | null>(null)
  const [creatingView, setCreatingView] = useState(false)
  const { views } = useReactiveViews(panel.id)
  const { columns } = useReactiveColumns(panel.id)
  const { view: currentView } = useReactiveView(panel.id, selectedViewId || '')

  const handleSetEditingPanel = (value: boolean | null) => {
    if (canEdit) {
      setEditingPanel(value || false)
    }
  }

  const handleSetEditingView = (value: string | null) => {
    if (canEdit) {
      setEditingViewId(value)
    }
  }

  useEffect(() => {
    setPanelTitle(panel.name)
    const initialViewTitles: Record<string, string> = {}
    for (const view of views) {
      initialViewTitles[view.id] = view.name || ''
    }
    setViewTitles(initialViewTitles)
  }, [panel, views])

  const handleViewClick = (view: View) => {
    if (view.id === selectedViewId) return
    router.push(`/panel/${panel.id}/view/${view.id}`)
  }

  const handlePanelClick = () => {
    if (selectedViewId) {
      router.push(`/panel/${panel.id}`)
    }
  }

  const handlePanelTitleSubmit = () => {
    if (panelTitle.trim() && panelTitle.trim() !== panel.name) {
      onPanelTitleChange?.(panelTitle.trim())
    } else {
      setPanelTitle(panel.name)
    }
    setEditingPanel(false)
  }

  const handleViewTitleSubmit = (viewId: string) => {
    const newTitle = viewTitles[viewId]?.trim() || ''
    const currentViewToUpdate = views.find((v) => v.id === viewId)

    if (newTitle && newTitle !== (currentViewToUpdate?.name || '')) {
      onViewTitleChange?.(newTitle)
    } else {
      setViewTitles((prev) => ({
        ...prev,
        [viewId]: currentViewToUpdate?.name || '',
      }))
    }
    setEditingViewId(null)
  }

  const handleDeleteViewClick = (
    viewId: string,
    viewTitle: string,
    viewType: 'panel' | 'view',
  ) => {
    setViewToDelete({ id: viewId, title: viewTitle, viewType })
    setShowDeleteModal(true)
  }

  const handleDeleteViewConfirm = async () => {
    if (!viewToDelete) return

    // Close the modal immediately to prevent showing "undefined" during optimistic update
    setShowDeleteModal(false)
    setDeletingViewId(viewToDelete.id)

    try {
      if (viewToDelete.viewType === 'panel' && viewToDelete.id === panel.id) {
        // Deleting the panel
        await deletePanel?.(viewToDelete.id)
        router.push('/')
      } else if (viewToDelete.viewType === 'view') {
        // Deleting a view
        await deleteView?.(panel.id, viewToDelete.id)
        // Navigate to panel if we're deleting the currently selected view
        if (selectedViewId === viewToDelete.id) {
          router.push(`/panel/${panel.id}`)
        }
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    } finally {
      setDeletingViewId(null)
      setViewToDelete(null)
    }
  }

  const handleDeleteModalClose = () => {
    setShowDeleteModal(false)
    setViewToDelete(null)
    setDeletingViewId(null)
  }

  const handleCreateView = async (type: ViewCreationType) => {
    if (!addView) return

    setCreatingView(true)
    try {
      let newView: View

      switch (type) {
        case 'patient': {
          // Create new patient view with all patient columns
          const patientColumns = columns.filter((col) =>
            col.tags?.includes('panels:patients'),
          )

          // Create columnVisibility with all columns visible
          const columnVisibility = patientColumns.reduce(
            (acc, col) => {
              acc[col.id] = true
              return acc
            },
            {} as Record<string, boolean>,
          )

          newView = await addView(panel.id, {
            name: 'New Patient View',
            panelId: panel.id,
            visibleColumns: patientColumns.map((col) => col.id),
            createdAt: new Date(),
            isPublished: false,
            metadata: {
              filters: [],
              viewType: 'patient',
              columnVisibility,
            },
          })
          break
        }
        case 'task': {
          // Create new task view with all task columns
          const taskColumns = columns.filter((col) =>
            col.tags?.includes('panels:tasks'),
          )

          // Create columnVisibility with all columns visible
          const columnVisibility = taskColumns.reduce(
            (acc, col) => {
              acc[col.id] = true
              return acc
            },
            {} as Record<string, boolean>,
          )

          newView = await addView(panel.id, {
            name: 'New Task View',
            panelId: panel.id,
            visibleColumns: taskColumns.map((col) => col.id),
            createdAt: new Date(),
            isPublished: false,
            metadata: {
              filters: [],
              viewType: 'task',
              columnVisibility,
            },
          })
          break
        }
        case 'from-panel': {
          // Create view from current panel - use current applied filters and current view type
          const viewType = currentViewType || 'patient'
          const relevantColumns = columns.filter((col) =>
            viewType === 'patient'
              ? col.tags?.includes('panels:patients')
              : col.tags?.includes('panels:tasks'),
          )

          // Only include visible columns from the panel
          const visibleColumns = relevantColumns
            .filter((col) => col.properties?.display?.visible !== false)
            .map((col) => col.id)

          // Create columnVisibility metadata based on panel's current visibility
          const columnVisibility = relevantColumns.reduce(
            (acc, col) => {
              acc[col.id] = col.properties?.display?.visible !== false
              return acc
            },
            {} as Record<string, boolean>,
          )

          newView = await addView(panel.id, {
            name: `${panel.name} View`,
            panelId: panel.id,
            visibleColumns,
            createdAt: new Date(),
            isPublished: false,
            metadata: {
              filters: currentFilters || panel.metadata.filters || [],
              sort: panel.metadata.sort || undefined,
              viewType: viewType,
              columnVisibility,
            },
          })
          break
        }
        case 'copy-view': {
          // Copy current view
          if (!currentView) return

          // Ensure columnVisibility exists, create it if needed for backward compatibility
          let columnVisibility = currentView.metadata.columnVisibility
          if (!columnVisibility) {
            const viewType = currentView.metadata.viewType
            const relevantColumns = columns.filter((col) =>
              viewType === 'patient'
                ? col.tags?.includes('panels:patients')
                : col.tags?.includes('panels:tasks'),
            )
            columnVisibility = relevantColumns.reduce(
              (acc, col) => {
                acc[col.id] = currentView.visibleColumns.includes(col.id)
                return acc
              },
              {} as Record<string, boolean>,
            )
          }

          newView = await addView(panel.id, {
            name: `${currentView.name} (copy)`,
            panelId: panel.id,
            visibleColumns: [...currentView.visibleColumns],
            createdAt: new Date(),
            isPublished: false,
            metadata: {
              ...currentView.metadata,
              columnVisibility,
            },
          })
          break
        }
        default:
          return
      }

      // Navigate to the new view
      if (newView) {
        router.push(`/panel/${panel.id}/view/${newView.id}`)
      }
    } catch (error) {
      console.error('Failed to create view:', error)
    } finally {
      setCreatingView(false)
      setShowCreateViewModal(false)
    }
  }

  const getSaveStatusIcon = (entityId: string) => {
    // For now, we'll always show saved status since reactive updates are immediate
    return null
  }

  const getViewCreationOptions = () => {
    const options = [
      {
        type: 'patient' as ViewCreationType,
        title: 'New Patient View',
        description:
          'Start fresh with a patient-focused view showing all patient data',
        icon: Users,
        available: true,
      },
      {
        type: 'task' as ViewCreationType,
        title: 'New Task View',
        description:
          'Start fresh with a task-focused view showing all task data',
        icon: CheckSquare,
        available: true,
      },
      {
        type: 'from-panel' as ViewCreationType,
        title: 'View from Current Panel',
        description:
          'Create a view that inherits your current filters and view settings',
        icon: FileText,
        available: !selectedViewId, // Only available on panel page
      },
      {
        type: 'copy-view' as ViewCreationType,
        title: 'Copy Current View',
        description:
          'Duplicate this view with all its columns, filters, and settings',
        icon: Copy,
        available: selectedViewId && currentView, // Only available on view page
      },
    ]

    return options.filter((option) => option.available)
  }

  const tabClassesBase =
    'h-9 px-4 relative z-10 flex items-center rounded-t-md border-l border-t border-r whitespace-nowrap'
  const tabClassesEdit = 'bg-slate-50 border-blue-300 [&>div>input]:border-b'
  const tabClassesSelected =
    'bg-white border-gray-400 [&>div>span]:font-semibold'
  const tabClassesNotSelected = 'bg-gray-100 hover:bg-gray-100 border-gray-200'
  const tabClassesInput =
    'bg-transparent border-b border-blue-300 focus:outline-none focus:ring-0 p-0 pb-0.5 text-xs'

  return (
    <>
      <div className="bg-gray-50 relative pt-4">
        <div className="h-10 flex items-end px-2 overflow-x-auto overflow-y-hidden navigation-tabs-scroll">
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gray-200" />
          <div className="flex items-end min-w-0">
            {/* Panel Tab */}
            <div
              className="relative ml-2 mb-[-1px] cursor-pointer flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                if (!selectedViewId) {
                  handleSetEditingPanel(true)
                } else {
                  handlePanelClick()
                }
              }}
              onKeyDown={(e) => {
                // Don't handle keyboard events if we're editing the panel title
                if (editingPanel) return

                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  if (!selectedViewId) {
                    handleSetEditingPanel(true)
                  } else {
                    handlePanelClick()
                  }
                }
              }}
            >
              <div
                className={`
                  ${tabClassesBase}
                  ${
                    editingPanel
                      ? tabClassesEdit
                      : !selectedViewId
                        ? tabClassesSelected
                        : tabClassesNotSelected
                  }
                `}
              >
                <LayoutGrid
                  className={`h-3 w-3 mr-2 ${!selectedViewId ? 'text-yellow-800' : 'text-gray-500'}`}
                />
                {editingPanel ? (
                  <div className="flex items-center w-full">
                    <input
                      type="text"
                      value={panelTitle}
                      placeholder="Enter panel name..."
                      onChange={(e) => setPanelTitle(e.target.value)}
                      onBlur={handlePanelTitleSubmit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handlePanelTitleSubmit()
                        } else if (e.key === 'Escape') {
                          setPanelTitle(panel.name)
                          setEditingPanel(false)
                        }
                      }}
                      className={tabClassesInput}
                    />
                    {panelTitle.trim() !== panel.name && (
                      <span
                        className="text-xs text-orange-500 ml-1"
                        title="Unsaved changes"
                      >
                        •
                      </span>
                    )}
                    {getSaveStatusIcon(panel.id)}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span
                      className="text-xs font-normal text-gray-600 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!selectedViewId) {
                          setEditingPanel(true)
                        } else {
                          handlePanelClick()
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.stopPropagation()
                          handlePanelClick()
                        }
                      }}
                    >
                      {panel.name}
                    </span>
                    {getSaveStatusIcon(panel.id)}
                    {canEdit && (
                      <button
                        type="button"
                        id="remove-view-id"
                        className="ml-2 text-gray-400 hover:text-gray-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteViewClick(panel.id, panel.name, 'panel')
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Views */}
            {views.map((view) => (
              <div
                key={view.id}
                className="relative ml-2 mb-[-1px] cursor-pointer flex-shrink-0"
                onClick={() => handleViewClick(view)}
                onMouseEnter={() => setHoveredViewId(view.id)}
                onMouseLeave={() => setHoveredViewId(null)}
                onKeyDown={(e) => {
                  // Don't handle keyboard events if we're editing the view title
                  if (editingViewId === view.id) return

                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    handleViewClick(view)
                  }
                }}
              >
                <div
                  className={`
                    ${tabClassesBase}
                    ${
                      editingViewId === view.id
                        ? tabClassesEdit
                        : view.id === selectedViewId
                          ? tabClassesSelected
                          : tabClassesNotSelected
                    }
                  `}
                >
                  {editingViewId === view.id ? (
                    <div className="flex items-center w-full">
                      <input
                        type="text"
                        value={viewTitles[view.id] || ''}
                        placeholder="Enter view name..."
                        onChange={(e) =>
                          setViewTitles((prev) => ({
                            ...prev,
                            [view.id]: e.target.value,
                          }))
                        }
                        onBlur={() => handleViewTitleSubmit(view.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleViewTitleSubmit(view.id)
                          } else if (e.key === 'Escape') {
                            setViewTitles((prev) => ({
                              ...prev,
                              [view.id]: view.name || '',
                            }))
                            handleSetEditingPanel(null)
                          }
                        }}
                        className={tabClassesInput}
                      />
                      <span className="-ml-2">
                        <Edit3Icon className="h-3 w-3 text-blue-500" />
                      </span>
                      {(viewTitles[view.id] || '').trim() !==
                        (view.name || '') && (
                        <span
                          className="text-xs text-orange-500 ml-1"
                          title="Unsaved changes"
                        >
                          •
                        </span>
                      )}
                      {getSaveStatusIcon(view.id)}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <span
                        className="text-xs font-normal text-gray-600 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (view.id === selectedViewId) {
                            handleSetEditingView(view.id)
                          } else {
                            handleViewClick(view)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            handleViewClick(view)
                          }
                        }}
                      >
                        {view.name}
                      </span>
                      {getSaveStatusIcon(view.id)}
                      {canEdit && (
                        <button
                          type="button"
                          className="ml-2 text-gray-400 hover:text-gray-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteViewClick(
                              view.id,
                              view.name || '',
                              'view',
                            )
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Add View Button */}

            <button
              type="button"
              className="ml-2 mb-[-1px] h-9 px-3 flex items-center text-sm text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-t-md border-l border-t border-r border-gray-200 whitespace-nowrap"
              onClick={() => setShowCreateViewModal(true)}
            >
              <Plus className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="text-xs">Add View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Create View Modal */}
      <Dialog
        open={showCreateViewModal}
        onOpenChange={(open) =>
          !open && !creatingView && setShowCreateViewModal(false)
        }
      >
        <DialogContent className="p-0 m-0 overflow-hidden max-w-2xl">
          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-semibold text-gray-900 leading-6">
                  Create New View
                </DialogTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Choose how you'd like to create your new view
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 pb-6">
            <div className="space-y-3">
              {getViewCreationOptions().map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.type}
                    type="button"
                    className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => handleCreateView(option.type)}
                    disabled={creatingView}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <Icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {option.title}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              type="button"
              onClick={() => setShowCreateViewModal(false)}
              disabled={creatingView}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={handleDeleteModalClose}
        onConfirm={handleDeleteViewConfirm}
        title={
          viewToDelete?.id === panel.id && viewToDelete?.viewType === 'panel'
            ? 'Delete Panel'
            : 'Delete View'
        }
        message={`Are you sure you want to delete the ${viewToDelete?.viewType === 'panel' ? 'panel' : 'view'} "${viewToDelete?.title}"? This action cannot be undone.`}
        isDeleting={!!deletingViewId}
      />
    </>
  )
}
