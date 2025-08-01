'use client'

import PanelFooter from '@/app/panel/[panel]/components/PanelFooter'
import PanelNavigation from '@/app/panel/[panel]/components/PanelNavigation'
import PanelToolbar from '@/app/panel/[panel]/components/PanelToolbar'
import { VirtualizedTable } from '@/app/panel/[panel]/components/VirtualizedTable'
import { useAuthentication } from '@/hooks/use-authentication'
import { useColumnCreator } from '@/hooks/use-column-creator'
import { useColumnOperations } from '@/hooks/use-column-operations'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import {
  useReactiveColumns,
  useReactivePanel,
  useReactiveViews,
} from '@/hooks/use-reactive-data'
import { useReactivePanelStore } from '@/hooks/use-reactive-panel-store'
import { useSearch } from '@/hooks/use-search'
import { arrayMove } from '@/lib/utils'
import type {
  Column,
  ColumnChangesResponse,
  Filter,
  Sort,
  ViewType,
} from '@/types/panel'
import type { DragEndEvent } from '@dnd-kit/core'
import { Loader2 } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AddIngestionModal } from './components/AddIngestionModal'
import { ModalDetails } from './components/ModalDetails'
import { useProgressiveMedplumData } from '@/hooks/use-progressive-medplum-data'
import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'
import { useMedplum } from '@/contexts/MedplumClientProvider'
import type { FHIRCard } from './components/ModalDetails/StaticContent/FhirExpandableCard'

export default function WorklistPage() {
  const params = useParams()
  const panelId = params.panel as string
  const [currentView, setCurrentView] = useState<ViewType>('patient')
  const [isAddingIngestionSource, setIsAddingIngestionSource] = useState(false)
  const [tableFilters, setTableFilters] = useState<Filter[]>([])

  const [selectedItem, setSelectedItem] = useState<
    WorklistPatient | WorklistTask | null
  >(null)

  const [selectedRows] = useState<string[]>([])
  const { user } = useAuthentication()
  const { toggleTaskOwner } = useMedplum()

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
    currentView === 'patient' ? 'Patient' : 'Task',
    {
      pageSize: 100,
      maxRecords: 50000,
      panelId,
    },
  )

  const patients =
    currentView === 'patient' ? (progressiveData as WorklistPatient[]) : []
  const tasks =
    currentView === 'task' ? (progressiveData as WorklistTask[]) : []

  const { updatePanel } = useReactivePanelStore()
  const { updateColumn, deleteColumn, applyColumnChanges, reorderColumns } =
    useColumnOperations()
  const {
    panel,
    isLoading: isPanelLoading,
    error: panelError,
  } = useReactivePanel(panelId)
  const { columns: allColumns, isLoading: isColumnsLoading } =
    useReactiveColumns(panelId)
  const { isLoading: isViewsLoading } = useReactiveViews(panelId)

  // Create column visibility context for panel
  const columnVisibilityContext = useColumnVisibility(panelId)

  const router = useRouter()

  // Get columns for current view type using tag-based filtering
  const allColumnsForViewType = allColumns.filter((col) =>
    currentView === 'patient'
      ? col.tags?.includes('panels:patients')
      : col.tags?.includes('panels:tasks'),
  )

  // Get only visible columns using column visibility context
  const visibleColumns = columnVisibilityContext.getVisibleColumns()

  // Set table data based on current view
  const tableData = currentView === 'patient' ? patients : tasks
  const { searchTerm, setSearchTerm, searchMode, setSearchMode, filteredData } =
    // @ts-ignore - Type mismatch between patient/task arrays but useSearch handles both
    useSearch(tableData)

  useEffect(() => {
    if (panel) {
      setTableFilters(panel.metadata.filters)
      setCurrentView(
        panel.metadata.viewType
          ? (panel.metadata.viewType as ViewType)
          : 'patient',
      )
    }
  }, [panel])

  // Handle panel not found
  useEffect(() => {
    if (!isPanelLoading && !panel && !panelError) {
      router.push('/')
    }
  }, [isPanelLoading, panel, panelError, router])

  const updatePanelViewType = async (viewType: ViewType) => {
    try {
      if (!panel) return

      setCurrentView(viewType)
      await updatePanel?.(panelId, {
        metadata: {
          ...panel.metadata,
          viewType,
        },
      })
    } catch (error) {
      console.error('Failed to update panel view type:', error)
    }
  }

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
      await updateColumn(panel.id, updates.id, updates)
    } catch (error) {
      console.error('Failed to update column:', error)
    }
  }

  const onColumnDelete = async (columnId: string) => {
    if (!panel) {
      return
    }

    // Find the column name for better toast messages
    const column = allColumns.find((col) => col.id === columnId)
    const columnName = column?.name

    try {
      await deleteColumn(panel.id, columnId, columnName)
    } catch (error) {
      console.error('Failed to delete column:', error)
    }
  }

  const onSortUpdate = async (sort: Sort | undefined) => {
    if (!panel) {
      return
    }

    try {
      await updatePanel?.(panel.id, {
        metadata: {
          ...panel.metadata,
          sort,
        },
      })
    } catch (error) {
      console.error('Failed to update sort config:', error)
    }
  }

  const onFiltersChange = async (filters: Filter[]) => {
    if (!panel) return

    try {
      await updatePanel?.(panel.id, {
        metadata: {
          ...panel.metadata,
          filters,
        },
      })
    } catch (error) {
      console.error('Failed to update panel filters:', error)
    }
  }

  const onCardsConfigurationChange = async (cardsConfiguration: FHIRCard[]) => {
    if (!panel) {
      return
    }

    try {
      await updatePanel(panel.id, {
        metadata: {
          ...panel.metadata,
          cardsConfiguration,
        },
      })
    } catch (error) {
      console.error('Failed to update panel cards configuration:', error)
    }
  }

  // Centralized row click handler
  const handleRowClick = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
    (row: Record<string, any>) => {
      setSelectedItem(row as WorklistPatient | WorklistTask)
    },
    [],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: It's only the visible columns that matter here
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) {
        return
      }

      // Find the active column's index and the over column's index
      const oldIndex = visibleColumns.findIndex((col) => col.id === active.id)
      const newIndex = visibleColumns.findIndex((col) => col.id === over.id)

      if (oldIndex === -1 || newIndex === -1) {
        return
      }

      // Reorder the columns
      const reorderedColumns = arrayMove(visibleColumns, oldIndex, newIndex)

      // Use the dedicated reorder method which shows only one toast
      if (panel) {
        try {
          await reorderColumns(panel.id, reorderedColumns)
        } catch (error) {
          console.error('Failed to reorder columns:', error)
        }
      }
    },
    [visibleColumns],
  )

  const isLoading =
    isPanelLoading || isColumnsLoading || isViewsLoading || !panel

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
                currentViewType={currentView}
                onPanelTitleChange={onPanelTitleChange}
                currentFilters={tableFilters}
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
              setCurrentView={updatePanelViewType}
              columnVisibilityContext={columnVisibilityContext}
              onAddColumn={onAddColumn}
              filters={tableFilters}
              sort={panel?.metadata.sort}
              columns={visibleColumns}
              onFiltersChange={onFiltersChange}
              onSortUpdate={onSortUpdate}
            />
          </div>
          <div className="content-area">
            <div className="table-scroll-container">
              <VirtualizedTable
                isLoading={isProgressiveLoading}
                selectedRows={selectedRows}
                toggleSelectAll={() => {}}
                columns={visibleColumns}
                onSortUpdate={onSortUpdate}
                tableData={filteredData}
                handlePDFClick={() => {}}
                handleTaskClick={() => {}}
                handleRowHover={() => {}}
                toggleSelectRow={() => {}}
                handleAssigneeClick={async (taskId: string) => {
                  await toggleTaskOwner(taskId)
                }}
                currentView={currentView}
                currentUserName={user?.name}
                onColumnUpdate={onColumnUpdate}
                onColumnDelete={onColumnDelete}
                filters={tableFilters}
                onFiltersChange={onFiltersChange}
                initialSort={panel.metadata.sort || null}
                onRowClick={handleRowClick}
                handleDragEnd={handleDragEnd}
                hasMore={hasMore}
                onLoadMore={loadMore}
                isLoadingMore={isLoadingMore}
              />
              {isAddingIngestionSource && (
                <AddIngestionModal
                  isOpen={isAddingIngestionSource}
                  onClose={() => setIsAddingIngestionSource(false)}
                  onSelectSource={() => {}}
                  ingestionBots={[]}
                />
              )}
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
              panel={panel}
              onCardsConfigurationChange={onCardsConfigurationChange}
            />
          </div>
        </>
      )}
    </>
  )
}
