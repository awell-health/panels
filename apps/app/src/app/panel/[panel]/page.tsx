'use client'

import PanelFooter from '@/app/panel/[panel]/components/PanelFooter'
import PanelNavigation from '@/app/panel/[panel]/components/PanelNavigation'
import PanelToolbar from '@/app/panel/[panel]/components/PanelToolbar'
import { VirtualizedTable } from '@/app/panel/[panel]/components/VirtualizedTable'
import { useDrawer } from '@/contexts/DrawerContext'
import { useAuthentication } from '@/hooks/use-authentication'
import { useColumnCreator } from '@/hooks/use-column-creator'
import type { WorklistPatient, WorklistTask } from '@/hooks/use-medplum-store'
import { useMedplumStore } from '@/hooks/use-medplum-store'
import { useReactiveColumns, useReactivePanel, useReactiveViews } from '@/hooks/use-reactive-data'
import { useReactivePanelStore } from '@/hooks/use-reactive-panel-store'
import { useSearch } from '@/hooks/use-search'
import { arrayMove } from '@/lib/utils'
import type { Column, ColumnChangesResponse, ViewType } from '@/types/panel'
import type { DragEndEvent } from '@dnd-kit/core'
import { Loader2 } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AddIngestionModal } from './components/AddIngestionModal'
import { PatientContext } from './components/PatientContext'
import { TaskDetails } from './components/TaskDetails'

interface TableFilter {
  key: string
  value: string
}

interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export default function WorklistPage() {
  const params = useParams()
  const panelId = params.panel as string
  const [currentView, setCurrentView] = useState<ViewType>('patient')
  const [isAddingIngestionSource, setIsAddingIngestionSource] = useState(false)
  const [tableFilters, setTableFilters] = useState<TableFilter[]>([])
  const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(
    undefined,
  )
  const [selectedRows] = useState<string[]>([])

  const {
    patients,
    tasks,
    toggleTaskOwner,
    isLoading: isMedplumLoading,
  } = useMedplumStore()
  const { updatePanel, addView, updateColumn, applyColumnChanges } = useReactivePanelStore()
  const {
    panel,
    isLoading: isPanelLoading,
    error: panelError,
  } = useReactivePanel(panelId)
  const {
    columns: allColumns,
    isLoading: isColumnsLoading,
  } = useReactiveColumns(panelId)
  const {
    views,
    isLoading: isViewsLoading,
  } = useReactiveViews(panelId)
  const { openDrawer } = useDrawer()

  const router = useRouter()

  // Get columns for current view type using tag-based filtering
  const columns = allColumns.filter(col =>
    currentView === 'patient'
      ? col.tags?.includes('panels:patients')
      : col.tags?.includes('panels:tasks')
  )

  // Set table data based on current view
  const tableData = currentView === 'patient' ? patients : tasks
  const { searchTerm, setSearchTerm, searchMode, setSearchMode, filteredData } =
    // @ts-ignore - Type mismatch between patient/task arrays but useSearch handles both
    useSearch(tableData)

  // Set filters from panel
  useEffect(() => {
    if (panel) {
      setTableFilters(
        panel.metadata.filters.map((filter) => ({
          key: filter.fhirPathFilter[0],
          value: filter.fhirPathFilter[1],
        })),
      )
    }
  }, [panel])

  // Handle panel not found
  useEffect(() => {
    if (!isPanelLoading && !panel && !panelError) {
      router.push('/')
    }
  }, [isPanelLoading, panel, panelError, router])

  const handleColumnChanges = async (columnChanges: ColumnChangesResponse) => {
    if (!panel) return

    try {
      await applyColumnChanges(panel.id, columnChanges)
    } catch (error) {
      console.error('Failed to apply column changes to panel:', error)
    }
  }

  const { onAddColumn } = useColumnCreator({
    currentViewType: currentView,
    patients,
    tasks,
    panel,
    columns: allColumns,
    onColumnChanges: handleColumnChanges,
  })

  const onNewView = async () => {
    if (!panel) {
      return
    }

    try {
      const newView = await addView?.(panel.id, {
        name: 'New View',
        panelId: panel.id,
        visibleColumns: columns.map(col => col.id),
        sorts: [],
        createdAt: new Date(),
        isPublished: false,
        metadata: {
          filters: panel.metadata.filters,
          viewType: currentView,
        },
      })
      if (newView) {
        router.push(`/panel/${panel.id}/view/${newView.id}`)
      }
    } catch (error) {
      console.error('Failed to create new view:', error)
    }
  }

  const onPanelTitleChange = async (newTitle: string) => {
    if (!panel) {
      return
    }

    try {
      await updatePanel?.(panel.id, { name: newTitle })
    } catch (error) {
      console.error('Failed to update panel title:', error)
    }
  }

  const onColumnUpdate = async (updates: Partial<Column>) => {
    if (!panel || !updates.id) {
      return
    }

    try {
      await updateColumn?.(panel.id, updates.id, updates)
    } catch (error) {
      console.error('Failed to update column:', error)
    }
  }

  const onSortConfigUpdate = async (sortConfig: SortConfig | undefined) => {
    setSortConfig(sortConfig)
  }

  const onFiltersChange = (filters: TableFilter[]) => {
    setTableFilters(filters)
  }

  // Centralized row click handler
  const handleRowClick = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
    (row: Record<string, any>) => {
      if (currentView === 'task') {
        openDrawer(
          <TaskDetails taskData={row as WorklistTask} />,
          row.description || 'Task Details',
        )
      } else if (currentView === 'patient') {
        openDrawer(
          <PatientContext patient={row as WorklistPatient} />,
          `${row.name} - Patient Details`,
        )
      }
    },
    [currentView, openDrawer],
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
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

    // Update column order in each column's display properties
    const columnsWithOrder = reorderedColumns.map((col, index) => ({
      ...col,
      properties: {
        ...col.properties,
        display: {
          ...col.properties?.display,
          order: index,
        },
      },
    }))

    // Update each column individually
    for (const column of columnsWithOrder) {
      try {
        await onColumnUpdate(column)
      } catch (error) {
        console.error('Failed to update column order:', error)
      }
    }
  }

  const isLoading = isPanelLoading || isColumnsLoading || isViewsLoading || !panel

  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center h-screen">
          <Loader2
            className="h-8 w-8 text-blue-500 animate-spin mb-2"
            aria-label="Loading Panel"
          />
        </div>
      ) : (
        <>
          <div className="navigation-area">
            {panel && (
              <PanelNavigation
                panel={panel}
                selectedViewId={undefined}
                onNewView={onNewView}
                onPanelTitleChange={onPanelTitleChange}
              />
            )}
          </div>
          <div className="toolbar-area">
            <PanelToolbar
              searchTerm={searchTerm}
              onSearch={setSearchTerm}
              searchMode={searchMode}
              onSearchModeChange={setSearchMode}
              currentView={currentView}
              setCurrentView={setCurrentView}
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
                selectedRows={selectedRows}
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
                currentView={currentView}
                onColumnUpdate={onColumnUpdate}
                filters={tableFilters}
                onFiltersChange={onFiltersChange}
                initialSortConfig={sortConfig ?? null}
                onRowClick={handleRowClick}
                handleDragEnd={handleDragEnd}
              />
              {isAddingIngestionSource && (
                <AddIngestionModal
                  isOpen={isAddingIngestionSource}
                  onClose={() => setIsAddingIngestionSource(false)}
                  onSelectSource={() => { }}
                  ingestionBots={[]}
                />
              )}
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
