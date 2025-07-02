'use client'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import { useReactiveViews } from '@/hooks/use-reactive-data'
import { useReactivePanelStore } from '@/hooks/use-reactive-panel-store'
import type { Panel, View } from '@/types/panel'
import {
  LayoutGrid,
  Plus,
  X
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface PanelNavigationProps {
  panel: Panel
  onNewView: () => void
  selectedViewId?: string
  onPanelTitleChange?: (newTitle: string) => void
  onViewTitleChange?: (newTitle: string) => void
}

export default function PanelNavigation({
  panel,
  onNewView,
  selectedViewId,
  onPanelTitleChange,
  onViewTitleChange,
}: PanelNavigationProps) {
  const { deletePanel, deleteView, updatePanel, updateView } =
    useReactivePanelStore()
  const router = useRouter()
  const [editingPanel, setEditingPanel] = useState(false)
  const [editingViewId, setEditingViewId] = useState<string | null>(null)
  const [panelTitle, setPanelTitle] = useState(panel.name)
  const [viewTitles, setViewTitles] = useState<Record<string, string>>({})
  const [hoveredViewId, setHoveredViewId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [viewToDelete, setViewToDelete] = useState<{
    id: string
    title: string
  } | null>(null)
  const [deletingViewId, setDeletingViewId] = useState<string | null>(null)
  const { views } = useReactiveViews(panel.id)

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
    const currentView = views.find((v) => v.id === viewId)

    if (newTitle && newTitle !== (currentView?.name || '')) {
      onViewTitleChange?.(newTitle)
    } else {
      setViewTitles((prev) => ({ ...prev, [viewId]: currentView?.name || '' }))
    }
    setEditingViewId(null)
  }

  const handleDeleteViewClick = (viewId: string, viewTitle: string) => {
    setViewToDelete({ id: viewId, title: viewTitle })
    setShowDeleteModal(true)
  }

  const handleDeleteViewConfirm = async () => {
    if (!viewToDelete) return

    // Close the modal immediately to prevent showing "undefined" during optimistic update
    setShowDeleteModal(false)
    setDeletingViewId(viewToDelete.id)

    try {
      if (viewToDelete.id === panel.id) {
        // Deleting the panel
        await deletePanel?.(viewToDelete.id)
        router.push('/')
      } else {
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

  const getSaveStatusIcon = (entityId: string) => {
    // For now, we'll always show saved status since reactive updates are immediate
    return null
  }

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
                  setEditingPanel(true)
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
                    setEditingPanel(true)
                  } else {
                    handlePanelClick()
                  }
                }
              }}
            >
              <div
                className={`
                  h-9 px-4 relative z-10 flex items-center rounded-t-md border-l border-t border-r whitespace-nowrap
                  ${editingPanel
                    ? 'bg-slate-50 border-blue-200' // Highlight when editing
                    : !selectedViewId
                      ? 'bg-white border-gray-200'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
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
                      className="bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-xs"
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
                    <button
                      type="button"
                      className="ml-2 text-gray-400 hover:text-gray-600"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteViewClick(
                          panel.id,
                          panel.name,
                        )
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
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
                    h-9 px-4 relative z-10 flex items-center rounded-t-md border-l border-t border-r whitespace-nowrap
                    ${editingViewId === view.id
                      ? 'bg-slate-50 border-blue-200' // Highlight when editing
                      : view.id === selectedViewId
                        ? 'bg-white border-gray-200'
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
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
                            setEditingViewId(null)
                          }
                        }}
                        className="bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-xs"
                      />
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
                            setEditingViewId(view.id)
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
                      <button
                        type="button"
                        className="ml-2 text-gray-400 hover:text-gray-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteViewClick(view.id, view.name || '')
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Add View Button */}
            <button
              type="button"
              className="ml-2 mb-[-1px] h-9 px-3 flex items-center text-sm text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-t-md border-l border-t border-r border-gray-200 whitespace-nowrap"
              onClick={onNewView}
            >
              <Plus className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="text-xs">Add View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={handleDeleteModalClose}
        onConfirm={handleDeleteViewConfirm}
        title={
          viewToDelete?.id === panel.id
            ? 'Delete Panel'
            : 'Delete View'
        }
        message={`Are you sure you want to delete the ${viewToDelete?.id === panel.id ? 'panel' : 'view'} "${viewToDelete?.title}"? This action cannot be undone.`}
        isDeleting={!!deletingViewId}
      />
    </>
  )
} 