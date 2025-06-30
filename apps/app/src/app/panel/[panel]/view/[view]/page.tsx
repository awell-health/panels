'use client'
import WorklistFooter from '@/app/panel/[panel]/components/WorklistFooter'
import WorklistNavigation from '@/app/panel/[panel]/components/WorklistNavigation'
import { VirtualizedWorklistTable } from '@/app/panel/[panel]/components/WorklistVirtualizedTable'
import WorklistToolbar from '@/app/panel/[panel]/components/WorklistToolbar'
import { useColumnCreator } from '@/hooks/use-column-creator'
import { useMedplumStore } from '@/hooks/use-medplum-store'
import { useReactivePanelStore } from '@/hooks/use-reactive-panel-store'
import { useReactivePanel, useReactiveView } from '@/hooks/use-reactive-data'
import { useSearch } from '@/hooks/use-search'
import { arrayMove } from '@/lib/utils'
import type {
  ColumnDefinition,
  Filter,
  PanelDefinition,
  SortConfig,
  ViewDefinition,
  WorklistDefinition,
} from '@/types/worklist'
import type { DragEndEvent } from '@dnd-kit/core'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { useDrawer } from '@/contexts/DrawerContext'
import { TaskDetails } from '@/app/panel/[panel]/components/TaskDetails'
import { PatientContext } from '@/app/panel/[panel]/components/PatientContext'
import type { WorklistPatient, WorklistTask } from '@/hooks/use-medplum-store'

interface TableFilter {
  key: string
  value: string
}

export default function WorklistViewPage() {
  const {
    patients,
    tasks,
    toggleTaskOwner,
    isLoading: isMedplumLoading,
  } = useMedplumStore()
  const { updatePanel, updateView, addView, updateColumn } =
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
  const [tableFilters, setTableFilters] = useState<TableFilter[]>([])

  const searchData = view?.viewType === 'patient' ? patients : tasks
  const { searchTerm, setSearchTerm, searchMode, setSearchMode, filteredData } =
    // @ts-ignore - Type mismatch between patient/task arrays but useSearch handles both
    useSearch(searchData)

  const columns =
    view?.columns && view.columns.length > 0
      ? view.columns
      : view?.viewType === 'patient'
        ? (panel?.patientViewColumns ?? [])
        : (panel?.taskViewColumns ?? [])
  const tableData = filteredData ?? []

  // Set filters from view
  useEffect(() => {
    if (view) {
      setTableFilters(
        view.filters.map((filter) => ({
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

  const onColumnUpdate = async (updates: Partial<ColumnDefinition>) => {
    if (!view || !panel || !updates.id) {
      return
    }

    try {
      // Update the column in the panel first
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
    const newFilters: Filter[] = newTableFilters.map((filter) => ({
      fhirPathFilter: [filter.key, filter.value],
    }))
    const newView = {
      ...view,
      filters: newFilters,
    }

    try {
      await updateView?.(panelId, viewId, newView)
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

    // Update the view definition
    const newView = {
      ...view,
      columns: reorderedColumns,
    }

    try {
      await updateView?.(panelId, viewId, newView)
    } catch (error) {
      console.error('Failed to reorder columns:', error)
    }
  }

  const onColumnChange = async (
    column: ViewDefinition | WorklistDefinition,
  ) => {
    if (!view) {
      return
    }

    const newView = {
      ...view,
      ...column,
    }

    try {
      await updateView?.(panelId, viewId, newView)
    } catch (error) {
      console.error('Failed to update view:', error)
    }
  }

  const { onAddColumn } = useColumnCreator({
    currentView: view?.viewType ?? 'patient',
    patients,
    tasks,
    worklistDefinition: view || undefined,
    onDefinitionChange: onColumnChange,
  })

  const onNewView = async () => {
    if (!panel) {
      return
    }

    try {
      const newView = await addView?.(panelId, {
        title: 'New View',
        filters: view?.filters ?? panel.filters,
        columns:
          view?.viewType === 'patient'
            ? panel.patientViewColumns
            : panel.taskViewColumns,
        createdAt: new Date(),
        viewType: view?.viewType ?? 'task',
        sortConfig: view?.sortConfig ?? [],
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
    const newView = {
      ...view,
      sortConfig: sortConfig ? [sortConfig] : [],
    }
    await updateView?.(panelId, viewId, newView)
  }

  // Centralized row click handler - optimized with useCallback
  const handleRowClick = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
    (row: Record<string, any>) => {
      if (view?.viewType === 'task') {
        openDrawer(
          <TaskDetails taskData={row as WorklistTask} />,
          row.description || 'Task Details',
        )
      } else if (view?.viewType === 'patient') {
        openDrawer(
          <PatientContext patient={row as WorklistPatient} />,
          `${row.name} - Patient Details`,
        )
      }
    },
    [view?.viewType, openDrawer],
  )

  const onViewTitleChange = async (newTitle: string) => {
    if (!view) {
      return
    }

    try {
      await updateView?.(panelId, viewId, { title: newTitle })
    } catch (error) {
      console.error('Failed to update view title:', error)
    }
  }

  const isLoading = isPanelLoading || isViewLoading || !panel || !view

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
              <WorklistNavigation
                panelDefinition={panel}
                selectedViewId={viewId}
                onNewView={onNewView}
                onViewTitleChange={onViewTitleChange}
              />
            )}
          </div>
          <div className="toolbar-area">
            <WorklistToolbar
              searchTerm={searchTerm}
              onSearch={setSearchTerm}
              searchMode={searchMode}
              onSearchModeChange={setSearchMode}
              currentView={view?.viewType}
              setCurrentView={() => {}}
              worklistColumns={columns}
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
              <VirtualizedWorklistTable
                isLoading={isMedplumLoading}
                selectedRows={[]}
                toggleSelectAll={() => {}}
                worklistColumns={columns}
                onSortConfigUpdate={onSortConfigUpdate}
                tableData={filteredData}
                handlePDFClick={() => {}}
                handleTaskClick={() => {}}
                handleRowHover={() => {}}
                toggleSelectRow={() => {}}
                handleAssigneeClick={(taskId: string) =>
                  toggleTaskOwner(taskId)
                }
                currentView={view?.viewType ?? 'patient'}
                onColumnUpdate={onColumnUpdate}
                filters={tableFilters}
                onFiltersChange={onFiltersChange}
                initialSortConfig={view?.sortConfig?.[0] ?? null}
                onRowClick={handleRowClick}
                handleDragEnd={handleDragEnd}
              />
            </div>
          </div>
          <div className="footer-area">
            <WorklistFooter
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
