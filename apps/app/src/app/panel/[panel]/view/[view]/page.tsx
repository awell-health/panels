'use client'
import { PatientContext } from '@/app/panel/[panel]/components/PatientContext'
import { TaskDetails } from '@/app/panel/[panel]/components/TaskDetails'
import { VirtualizedTable } from '@/app/panel/[panel]/components/VirtualizedTable'
import PanelFooter from '@/app/panel/[panel]/components/PanelFooter'
import { useDrawer } from '@/contexts/DrawerContext'
import { useColumnCreator } from '@/hooks/use-column-creator'
import type { WorklistPatient, WorklistTask } from '@/hooks/use-medplum-store'
import { useMedplumStore } from '@/hooks/use-medplum-store'
import { useReactiveColumns, useReactivePanel, useReactiveView } from '@/hooks/use-reactive-data'
import { useReactivePanelStore } from '@/hooks/use-reactive-panel-store'
import { useSearch } from '@/hooks/use-search'
import { arrayMove } from '@/lib/utils'
import type { Column, ColumnChangesResponse } from '@/types/panel'
import type { DragEndEvent } from '@dnd-kit/core'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PanelNavigation from '../../components/PanelNavigation'
import PanelToolbar from '../../components/PanelToolbar'

interface TableFilter {
  key: string
  value: string
}

interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export default function WorklistViewPage() {
  const {
    patients,
    tasks,
    toggleTaskOwner,
    isLoading: isMedplumLoading,
  } = useMedplumStore()
  const { updateView, addView, updateColumn, applyColumnChanges } =
    useReactivePanelStore()
  const { openDrawer } = useDrawer()
  const params = useParams()
  const panelId = params.panel as string
  const viewId = params.view as string
  const router = useRouter()

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
  const {
    columns: allColumns,
    isLoading: isColumnsLoading,
  } = useReactiveColumns(panelId)
  const [tableFilters, setTableFilters] = useState<TableFilter[]>([])

  const searchData = view?.metadata.viewType === 'patient' ? patients : tasks
  const { searchTerm, setSearchTerm, searchMode, setSearchMode, filteredData } =
    // @ts-ignore - Type mismatch between patient/task arrays but useSearch handles both
    useSearch(searchData)

  // Get columns using new filtering approach
  const columns = view?.visibleColumns?.length
    ? allColumns.filter(col => view.visibleColumns.includes(col.id))
    : allColumns.filter(col =>
      view?.metadata.viewType === 'patient'
        ? col.tags?.includes('panels:patients')
        : col.tags?.includes('panels:tasks')
    )

  const tableData = filteredData ?? []

  // Set filters from view
  useEffect(() => {
    if (view) {
      setTableFilters(
        view.metadata.filters.map((filter) => ({
          key: filter.fhirPathFilter[0],
          value: filter.fhirPathFilter[1],
        })),
      )
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
      await updateColumn?.(panelId, updates.id, updates)
    } catch (error) {
      console.error('Failed to update column:', error)
    }
  }

  const onFiltersChange = async (newTableFilters: TableFilter[]) => {
    if (!view) {
      return
    }

    // Convert table filters to view filters
    const newFilters = newTableFilters.map((filter) => ({
      fhirPathFilter: [filter.key, filter.value],
    }))

    try {
      await updateView?.(panelId, viewId, {
        metadata: {
          ...view.metadata,
          filters: newFilters,
        },
      })
      setTableFilters(newTableFilters)
    } catch (error) {
      console.error('Failed to update filters:', error)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !view) {
      return
    }

    // Find the active column's index and the over column's index
    const oldIndex = columns.findIndex((col) => col.id === active.id)
    const newIndex = columns.findIndex((col) => col.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Reorder the columns
    const reorderedColumns = arrayMove(columns, oldIndex, newIndex)

    // Update the view's visible columns order
    try {
      await updateView?.(panelId, viewId, {
        visibleColumns: reorderedColumns.map(col => col.id),
      })
    } catch (error) {
      console.error('Failed to reorder columns:', error)
    }
  }

  const handleColumnChanges = async (columnChanges: ColumnChangesResponse) => {
    if (!view || !panel) return

    try {
      await applyColumnChanges(panelId, columnChanges)
    } catch (error) {
      console.error('Failed to apply column changes to view:', error)
    }
  }

  const { onAddColumn } = useColumnCreator({
    currentViewType: view?.metadata.viewType ?? 'patient',
    patients,
    tasks,
    panel,
    columns,
    currentViewId: viewId,
    onColumnChanges: handleColumnChanges,
  })

  const onNewView = async () => {
    if (!panel) {
      return
    }

    try {
      const newView = await addView?.(panelId, {
        name: 'New View',
        panelId: panelId,
        visibleColumns: columns.map(col => col.id),
        sorts: [],
        createdAt: new Date(),
        isPublished: false,
        metadata: {
          filters: view?.metadata.filters ?? panel.metadata.filters,
          viewType: view?.metadata.viewType ?? 'task',
        },
      })
      if (newView) {
        router.push(`/panel/${panelId}/view/${newView.id}`)
      }
    } catch (error) {
      console.error('Failed to create new view:', error)
    }
  }

  const onSortConfigUpdate = async (sortConfig: SortConfig | undefined) => {
    if (!view) {
      return
    }

    const sorts = sortConfig ? [{
      columnName: sortConfig.key,
      direction: sortConfig.direction,
      order: 0,
      id: Date.now(), // temporary ID
    }] : []

    try {
      await updateView?.(panelId, viewId, { sorts })
    } catch (error) {
      console.error('Failed to update sort config:', error)
    }
  }

  // Centralized row click handler - optimized with useCallback
  const handleRowClick = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
    (row: Record<string, any>) => {
      if (view?.metadata.viewType === 'task') {
        openDrawer(
          <TaskDetails taskData={row as WorklistTask} />,
          row.description || 'Task Details',
        )
      } else if (view?.metadata.viewType === 'patient') {
        openDrawer(
          <PatientContext patient={row as WorklistPatient} />,
          `${row.name} - Patient Details`,
        )
      }
    },
    [view?.metadata.viewType, openDrawer],
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

  const isLoading = isPanelLoading || isViewLoading || isColumnsLoading || !panel || !view

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
                onNewView={onNewView}
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
              columns={columns}
              onAddColumn={onAddColumn}
              onColumnVisibilityChange={(columnId, visible) =>
                onColumnUpdate({
                  id: columnId,
                  properties: { display: { visible } },
                })
              }
            />
          </div>
          <div className="content-area">
            <div className="table-scroll-container">
              <VirtualizedTable
                isLoading={isMedplumLoading}
                selectedRows={[]}
                toggleSelectAll={() => { }}
                columns={columns}
                onSortConfigUpdate={onSortConfigUpdate}
                tableData={filteredData}
                handlePDFClick={() => { }}
                handleTaskClick={() => { }}
                handleRowHover={() => { }}
                toggleSelectRow={() => { }}
                handleAssigneeClick={(taskId: string) =>
                  toggleTaskOwner(taskId)
                }
                currentView={view?.metadata.viewType ?? 'patient'}
                onColumnUpdate={onColumnUpdate}
                filters={tableFilters}
                onFiltersChange={onFiltersChange}
                initialSortConfig={view?.sorts?.[0] ? {
                  key: view.sorts[0].columnName,
                  direction: view.sorts[0].direction,
                } : null}
                onRowClick={handleRowClick}
                handleDragEnd={handleDragEnd}
              />
            </div>
          </div>
          <div className="footer-area">
            <PanelFooter
              columnsCounter={columns.length}
              rowsCounter={tableData.length}
              navigateToHome={() => router.push('/')}
              isAISidebarOpen={false}
            />
          </div>
        </>
      )}
    </>
  )
}
