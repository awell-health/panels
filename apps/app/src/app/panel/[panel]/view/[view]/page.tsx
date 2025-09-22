'use client'
import PanelFooter from '@/app/panel/[panel]/components/PanelFooter'
import { VirtualizedTable } from '@/app/panel/[panel]/components/VirtualizedTable'
import { useDrawer } from '@/contexts/DrawerContext'
import { useAuthentication } from '@/hooks/use-authentication'
import { useColumnCreator } from '@/hooks/use-column-creator'
import { useColumnOperations } from '@/hooks/use-column-operations'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { useColumnLocking } from '@/hooks/use-column-locking'
import { useMedplumStore } from '@/hooks/use-medplum-store'
import { useProgressiveMedplumData } from '@/hooks/use-progressive-medplum-data'
import {
  useReactiveColumns,
  useReactivePanel,
  useReactiveView,
} from '@/hooks/use-reactive-data-zustand'
import { useReactivePanelStore } from '@/hooks/use-reactive-panel-store'
import { useSearch } from '@/hooks/use-search'
import { arrayMove } from '@/lib/utils'
import type { Column, ColumnChangesResponse, Filter, Sort } from '@/types/panel'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useModalUrlParams } from '@/lib/url-params'
import ModalDetails from '../../components/ModalDetails/ModalDetails'
import PanelNavigation from '../../components/PanelNavigation'
import PanelToolbar from '../../components/PanelToolbar'
import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'
import type { FHIRCard } from '../../components/ModalDetails/StaticContent/FhirExpandableCard'
import { useACL } from '../../../../../contexts/ACLContext'

export default function WorklistViewPage() {
  const { updateView } = useReactivePanelStore()
  const { updateColumn, applyColumnChanges } = useColumnOperations()
  const { openDrawer } = useDrawer()
  const params = useParams()
  const panelId = params.panel as string
  const viewId = params.view as string
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const { handleRowClick, handleModalClose } = useModalUrlParams()
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
  const { updatePanel } = useReactivePanelStore()
  const { hasPermission } = useACL()
  const canEdit = hasPermission('view', viewId, 'editor')

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
      pageSize: 100,
      maxRecords: 50000,
      panelId,
    },
  )

  const patientId = searchParams.get('patientId')
  const taskId = searchParams.get('taskId')

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

  // Create column locking context for view
  const { setColumnLocked, isColumnLocked } = useColumnLocking(panelId, viewId)

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

  // Maintain separate arrays for locked and unlocked columns to preserve drag-drop order within groups
  const { lockedColumns, unlockedColumns, visibleColumnsSorted } =
    useMemo(() => {
      const enhancedColumns = visibleColumns.map((column) => {
        const viewSpecificLocked = isColumnLocked(column.id)
        const columnLevelLocked = column.properties?.display?.locked ?? false

        // Check if there's a view-specific state for this column
        const hasViewSpecificState =
          view?.metadata?.columnLocked?.[column.id] !== undefined

        // Priority logic: view-specific state takes precedence over column-level state
        const finalLocked = hasViewSpecificState
          ? viewSpecificLocked
          : columnLevelLocked

        return {
          ...column,
          properties: {
            ...column.properties,
            display: {
              ...column.properties?.display,
              // Set locked state based on priority: view-specific first, then column-level fallback
              locked: finalLocked,
            },
          },
        }
      })

      // Separate into locked and unlocked arrays, preserving order within each group
      const locked = enhancedColumns.filter(
        (col) => col.properties?.display?.locked,
      )
      const unlocked = enhancedColumns.filter(
        (col) => !col.properties?.display?.locked,
      )

      // Always merge locked first, then unlocked (required for sticky positioning)
      const allOrdered = [...locked, ...unlocked]

      return {
        lockedColumns: locked,
        unlockedColumns: unlocked,
        visibleColumnsSorted: allOrdered,
      }
    }, [visibleColumns, isColumnLocked, view])

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

  // Handle column updates - with view-specific locking support
  const onColumnUpdate = async (updates: Partial<Column>) => {
    if (!updates.id) return

    // Check if this is a locking/unlocking operation
    if (updates.properties?.display?.locked !== undefined) {
      // Use view-specific locking instead of column-level locking
      console.log(
        '🔐 Calling setColumnLocked with:',
        updates.id,
        updates.properties.display.locked,
      )
      await setColumnLocked(updates.id, updates.properties.display.locked)
    } else {
      // For other column updates, use the regular updateColumn
      try {
        await updateColumn(panelId, updates.id, updates)
      } catch (error) {
        console.error('Failed to update column:', error)
      }
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

      // Get column information to check locked states
      const activeColumn = allColumnsForViewType.find(
        (col) => col.id === active.id,
      )
      const overColumn = allColumnsForViewType.find((col) => col.id === over.id)

      if (!activeColumn || !overColumn) {
        return
      }

      // Check locked states using the same logic as getVisibleColumns
      const getIsLocked = (column: Column) => {
        const hasViewSpecificState =
          view?.metadata?.columnLocked?.[column.id] !== undefined
        return hasViewSpecificState
          ? isColumnLocked(column.id)
          : (column.properties?.display?.locked ?? false)
      }

      const activeIsLocked = getIsLocked(activeColumn)
      const overIsLocked = getIsLocked(overColumn)

      // Prevent dragging between locked and unlocked groups
      // (locked columns must stay at the beginning for sticky positioning to work)
      if (activeIsLocked !== overIsLocked) {
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
    [view, updateView, panelId, viewId, allColumnsForViewType, isColumnLocked],
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

  const onRowClick =
    // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
    (row: Record<string, any>) => {
      handleRowClick(row.resourceType, row.id)
    }

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

  const onCardsConfigurationChange = async (cardsConfiguration: FHIRCard[]) => {
    if (!panel) {
      return
    }
    await updatePanel?.(panelId, {
      metadata: { ...panel.metadata, cardsConfiguration },
    })
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
                canEdit={canEdit}
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
              viewId={viewId}
              viewName={view?.name}
              panelId={panelId}
              filters={tableFilters}
              sort={view?.metadata.sort}
              columns={allColumnsForViewType}
              onFiltersChange={onFiltersChange}
              onSortUpdate={onSortUpdate}
            />
          </div>
          <div className="content-area">
            <div className="table-scroll-container">
              <VirtualizedTable
                isLoading={isProgressiveLoading}
                selectedRows={[]}
                toggleSelectAll={() => {}}
                allColumns={allColumnsForViewType}
                visibleColumns={visibleColumnsSorted}
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
                columnVisibilityContext={columnVisibilityContext}
                filters={tableFilters}
                onFiltersChange={onFiltersChange}
                initialSort={view?.metadata.sort || null}
                onRowClick={onRowClick}
                handleDragEnd={handleDragEnd}
                hasMore={hasMore}
                onLoadMore={loadMore}
                isLoadingMore={isLoadingMore}
              />
            </div>
          </div>

          <ModalDetails
            patientId={patientId || undefined}
            taskId={taskId || undefined}
            onClose={handleModalClose}
            pathname={pathname}
          />

          <div className="footer-area">
            <PanelFooter
              columnsCounter={visibleColumnsSorted.length}
              rowsCounter={tableData.length}
              navigateToHome={() => router.push('/')}
              isAISidebarOpen={false}
              dataAfter={dataAfter}
              hasMore={hasMore}
              onLoadMore={loadMore}
              isLoadingMore={isLoadingMore}
              onRefresh={refresh}
              isLoading={isProgressiveLoading}
              panel={panel}
              onCardsConfigurationChange={onCardsConfigurationChange}
              canEdit={canEdit}
            />
          </div>
        </>
      )}
    </>
  )
}
