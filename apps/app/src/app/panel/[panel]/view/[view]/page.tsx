'use client'
import PanelFooter from '@/app/panel/[panel]/components/PanelFooter'
import { VirtualizedTable } from '@/app/panel/[panel]/components/VirtualizedTable'
import { useDrawer } from '@/contexts/DrawerContext'
import { useAuthentication } from '@/hooks/use-authentication'
import { useColumnCreator } from '@/hooks/use-column-creator'
import { useColumnOperations } from '@/hooks/use-column-operations'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import {
  useMedplumStore,
  type WorklistPatient,
  type WorklistTask,
} from '@/hooks/use-medplum-store'
import { useProgressiveMedplumData } from '@/hooks/use-progressive-medplum-data'
import {
  useReactiveColumns,
  useReactivePanel,
  useReactiveView,
} from '@/hooks/use-reactive-data'
import { useReactivePanelStore } from '@/hooks/use-reactive-panel-store'
import { useSearch } from '@/hooks/use-search'
import { arrayMove } from '@/lib/utils'
import type { Column, ColumnChangesResponse, Filter, Sort } from '@/types/panel'
import type { DragEndEvent } from '@dnd-kit/core'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import ModalDetails from '../../components/ModalDetails/ModalDetails'
import PanelNavigation from '../../components/PanelNavigation'
import PanelToolbar from '../../components/PanelToolbar'

export default function WorklistViewPage() {
  const { updateView } = useReactivePanelStore()
  const { updateColumn, applyColumnChanges } = useColumnOperations()
  const { openDrawer } = useDrawer()
  const params = useParams()
  const panelId = params.panel as string
  const viewId = params.view as string
  const router = useRouter()
  const { user } = useAuthentication()
  const {
    panel,
    isLoading: isPanelLoading,
    error: panelError,
  } = useReactivePanel(panelId)
  const {
    view,
    isLoading: isViewLoading,
    error: viewError,
  } = useReactiveView(panelId, viewId)
  const { columns: allColumns, isLoading: isColumnsLoading } =
    useReactiveColumns(panelId)
  const [tableFilters, setTableFilters] = useState<Filter[]>([])

  const { toggleTaskOwner } = useMedplumStore()
  const {
    data: progressiveData,
    isLoading: isProgressiveLoading,
    isLoadingMore,
    hasMore,
    error: progressiveError,
    loadMore,
    refresh,
    dataAfter,
  } = useProgressiveMedplumData(
    view?.metadata.viewType === 'patient' ? 'Patient' : 'Task',
    {
      pageSize: 50,
      maxRecords: 50000,
      showLoadAll: true,
    },
  )

  // Get the appropriate data based on view type
  const patients =
    view?.metadata.viewType === 'patient'
      ? (progressiveData as WorklistPatient[])
      : []
  const tasks =
    view?.metadata.viewType === 'task'
      ? (progressiveData as WorklistTask[])
      : []

  // Create column visibility context for view
  const columnVisibilityContext = useColumnVisibility(panelId, viewId)

  const searchData = view?.metadata.viewType === 'patient' ? patients : tasks
  const { searchTerm, setSearchTerm, searchMode, setSearchMode, filteredData } =
    // @ts-ignore - Type mismatch between patient/task arrays but useSearch handles both
    useSearch(searchData)

  const [selectedItem, setSelectedItem] = useState<
    WorklistPatient | WorklistTask | null
  >(null)

  // Get columns using new filtering approach
  const allColumnsForViewType = allColumns.filter((col) =>
    view?.metadata.viewType === 'patient'
      ? col.tags?.includes('panels:patients')
      : col.tags?.includes('panels:tasks'),
  )

  // Get only visible columns using column visibility context
  const visibleColumns = columnVisibilityContext.getVisibleColumns()

  const tableData = filteredData ?? []

  // Set filters from view
  useEffect(() => {
    if (view) {
      setTableFilters(view.metadata.filters)
    }
  }, [view])

  // Handle panel or view not found
  useEffect(() => {
    if (!isPanelLoading && !panel && !panelError) {
      router.push('/')
      return
    }
    if (!isViewLoading && !view && !viewError) {
      router.push(`/panel/${panelId}`)
      return
    }
  }, [
    isPanelLoading,
    isViewLoading,
    panel,
    view,
    panelError,
    viewError,
    router,
    panelId,
  ])

  const onColumnUpdate = async (updates: Partial<Column>) => {
    if (!view || !panel || !updates.id) {
      return
    }

    try {
      // Update the column in the panel
      await updateColumn(panelId, updates.id, updates)
    } catch (error) {
      console.error('Failed to update column:', error)
    }
  }

  const onFiltersChange = async (newTableFilters: Filter[]) => {
    if (!view) {
      return
    }

    try {
      await updateView?.(panelId, viewId, {
        metadata: {
          ...view.metadata,
          filters: newTableFilters,
        },
      })
      setTableFilters(newTableFilters)
    } catch (error) {
      console.error('Failed to update filters:', error)
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: It's only the columns that matter here
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id || !view) {
        return
      }

      // Find the active column's index and the over column's index
      const oldIndex = view.visibleColumns.findIndex((col) => col === active.id)
      const newIndex = view.visibleColumns.findIndex((col) => col === over.id)

      if (oldIndex === -1 || newIndex === -1) {
        return
      }

      // Reorder the columns
      const reorderedColumns = arrayMove(
        view.visibleColumns,
        oldIndex,
        newIndex,
      )

      // Update the view's visible columns order
      try {
        await updateView?.(panelId, viewId, {
          visibleColumns: reorderedColumns,
        })
      } catch (error) {
        console.error('Failed to reorder columns:', error)
      }
    },
    [view],
  )

  const handleColumnChanges = async (columnChanges: ColumnChangesResponse) => {
    if (!view || !panel) return

    try {
      await applyColumnChanges(panelId, columnChanges, viewId)
    } catch (error) {
      console.error('Failed to apply column changes to view:', error)
    }
  }

  const { onAddColumn } = useColumnCreator({
    currentViewType: view?.metadata.viewType ?? 'patient',
    patients,
    tasks,
    panel,
    columns: allColumnsForViewType,
    currentViewId: viewId,
    onColumnChanges: handleColumnChanges,
  })

  const onSortUpdate = async (sort: Sort | undefined) => {
    if (!view) {
      return
    }

    try {
      await updateView?.(panelId, viewId, {
        metadata: {
          ...view.metadata,
          sort,
        },
      })
    } catch (error) {
      console.error('Failed to update sort config:', error)
    }
  }

  // Centralized row click handler - optimized with useCallback
  const handleRowClick = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
    (row: Record<string, any>) => {
      setSelectedItem(row as WorklistPatient | WorklistTask)
    },
    [],
  )

  const onViewTitleChange = async (newTitle: string) => {
    if (!view) {
      return
    }

    try {
      await updateView?.(panelId, viewId, { name: newTitle })
    } catch (error) {
      console.error('Failed to update view title:', error)
    }
  }

  const onViewTypeChange = async (newViewType: 'patient' | 'task') => {
    if (!view || view.metadata.viewType === newViewType) {
      return
    }

    try {
      await updateView?.(panelId, viewId, {
        metadata: {
          ...view.metadata,
          viewType: newViewType,
        },
      })
    } catch (error) {
      console.error('Failed to update view type:', error)
    }
  }

  const isLoading =
    isPanelLoading || isViewLoading || isColumnsLoading || !panel || !view

  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
        </div>
      ) : (
        <>
          <div className="navigation-area">
            {panel && (
              <PanelNavigation
                panel={panel}
                selectedViewId={viewId}
                currentViewType={view?.metadata.viewType}
                onViewTitleChange={onViewTitleChange}
              />
            )}
          </div>
          <div className="toolbar-area">
            <PanelToolbar
              searchTerm={searchTerm}
              onSearch={setSearchTerm}
              searchMode={searchMode}
              onSearchModeChange={setSearchMode}
              currentView={view?.metadata.viewType}
              setCurrentView={onViewTypeChange}
              columnVisibilityContext={columnVisibilityContext}
              onAddColumn={onAddColumn}
              isViewPage={true}
            />
          </div>
          <div className="content-area">
            <div className="table-scroll-container">
              <VirtualizedTable
                isLoading={isProgressiveLoading}
                selectedRows={[]}
                toggleSelectAll={() => {}}
                columns={visibleColumns}
                orderColumnMode="manual"
                onSortUpdate={onSortUpdate}
                tableData={filteredData}
                handlePDFClick={() => {}}
                handleTaskClick={() => {}}
                handleRowHover={() => {}}
                toggleSelectRow={() => {}}
                handleAssigneeClick={async (taskId: string) => {
                  await toggleTaskOwner(taskId)
                }}
                currentView={view?.metadata.viewType ?? 'patient'}
                currentUserName={user?.name}
                onColumnUpdate={onColumnUpdate}
                filters={tableFilters}
                onFiltersChange={onFiltersChange}
                initialSort={view?.metadata.sort || null}
                onRowClick={handleRowClick}
                handleDragEnd={handleDragEnd}
                hasMore={hasMore}
                onLoadMore={loadMore}
                isLoadingMore={isLoadingMore}
              />
            </div>
          </div>
          {selectedItem && (
            <ModalDetails
              patient={
                selectedItem.resourceType === 'Patient'
                  ? (selectedItem as WorklistPatient)
                  : undefined
              }
              task={
                selectedItem.resourceType === 'Task'
                  ? (selectedItem as WorklistTask)
                  : undefined
              }
              onClose={() => setSelectedItem(null)}
            />
          )}
          <div className="footer-area">
            <PanelFooter
              columnsCounter={visibleColumns.length}
              rowsCounter={tableData.length}
              navigateToHome={() => router.push('/')}
              isAISidebarOpen={false}
              dataAfter={dataAfter}
              hasMore={hasMore}
              onLoadMore={loadMore}
              isLoadingMore={isLoadingMore}
              onRefresh={refresh}
              isLoading={isProgressiveLoading}
            />
          </div>
        </>
      )}
    </>
  )
}
