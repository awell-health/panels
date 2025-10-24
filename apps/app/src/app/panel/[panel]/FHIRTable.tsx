'use client'

import PanelFooter from '@/app/panel/[panel]/components/PanelFooter'
import PanelNavigation from '@/app/panel/[panel]/components/PanelNavigation'
import PanelToolbar from '@/app/panel/[panel]/components/PanelToolbar'
import { VirtualizedTable } from '@/app/panel/[panel]/components/VirtualizedTable'
import { useAuthentication } from '@/hooks/use-authentication'
import { useColumnCreator } from '@/hooks/use-column-creator'
import { useColumnOperations } from '@/hooks/use-column-operations'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { useColumnLocking } from '@/hooks/use-column-locking'
import { useFHIRSearch } from '@/hooks/use-fhir-search'
import { arrayMove } from '@/lib/utils'
import type {
  Column,
  ColumnChangesResponse,
  Filter,
  Sort,
  ViewType,
  Panel,
  View,
} from '@/types/panel'
import type { DragEndEvent } from '@dnd-kit/core'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  removeQueryParamsWithoutRerender,
  setQueryParamsWithoutRerender,
} from '@/lib/url-params'
import { AddIngestionModal } from './components/AddIngestionModal'
import { useMedplum } from '@/contexts/MedplumClientProvider'
import type { FHIRCard } from './components/ModalDetails/StaticContent/FhirExpandableCard'
import { useACL } from '@/contexts/ACLContext'
import type { BundleEntry, ResourceType } from '@medplum/fhirtypes'
import { updatePanel } from '../../../lib/server/panel-api-client'
import {
  useFHIRStore,
  useFilteredAndSortedBundles,
  useFHIRFilters,
  useFHIRSort,
} from '../../../lib/fhir-store'
import { useReactivePanelStore } from '../../../hooks/use-reactive-panel-store'
import { startCase } from 'lodash'
import { useMedplumWebSocket } from '../../../hooks/use-medplum-websocket'
import HybridModalDetails from './components/ModalDetails/HybridModalDetails'
import { getAllAppointments } from '../../../lib/server/medplum-server'

interface Props {
  viewType: ViewType
  panel: Panel
  columns: Column[]
  data: BundleEntry[]
  resourceType: ResourceType
  view?: View
}

export default function FHIRTable(props: Props) {
  const { viewType, panel, columns, data, resourceType, view } = props
  const panelId = panel?.id as string
  const viewId = view?.id as string
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const currentView = viewType || 'patient'

  const initiFilters = view
    ? view.metadata.filters
    : (panel?.metadata.filters as Filter[])
  const initialSort = view ? view.metadata.sort : (panel?.metadata.sort as Sort)

  const tableData = useFilteredAndSortedBundles()
  const tableFilters = useFHIRFilters()
  const tableSortConfig = useFHIRSort()

  const [isAddingIngestionSource, setIsAddingIngestionSource] = useState(false)
  const [resourceId, setResourceId] = useState<string | null>(
    searchParams.get('resourceId') || null,
  )

  const { medplumClientId, medplumSecret } = useAuthentication()
  const store = useFHIRStore.getState()
  const { updateView } = useReactivePanelStore()

  // Conditional update function based on context
  const updateFunction = async (
    updates: Partial<Panel | View>,
  ): Promise<void> => {
    if (viewId && view) {
      const viewUpdates = {
        ...view,
        ...updates,
      } as Partial<View>
      await updateView?.(panelId, viewId, viewUpdates)
    } else {
      const panelUpdates = {
        ...panel,
        ...updates,
      } as Partial<Panel>
      await updatePanel(panelId, panelUpdates)
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    store.setBundles(data)
    store.setFilters(initiFilters || [])
    store.setSort(initialSort || null)
    store.setColumns(columns)
  }, [data, initiFilters, initialSort, columns])

  // Use the optimized WebSocket hook with global singleton (non-blocking)
  const { isReady: wsReady, isInitializing: wsInitializing } =
    useMedplumWebSocket(
      medplumClientId,
      medplumSecret,
      store.getDataResourceTypes(),
    )

  const [selectedRows] = useState<string[]>([])
  const { user } = useAuthentication()
  const { toggleTaskOwner } = useMedplum()
  const { hasPermission } = useACL()
  const canEdit = hasPermission('panel', panelId, 'editor')

  const { updateColumn, deleteColumn, applyColumnChanges, reorderColumns } =
    useColumnOperations()

  // Create column visibility context for panel
  const columnVisibilityContext = useColumnVisibility(
    panelId,
    viewId,
    currentView,
  )

  // Create column locking context for panel or view
  const { setColumnLocked, isColumnLocked } = useColumnLocking(panelId, viewId)

  // Get only visible columns using column visibility context
  const visibleColumns = columnVisibilityContext
    .getVisibleColumns()
    .filter((col) => {
      return col.tags?.includes('panels:appointments')
    })

  // Maintain separate arrays for locked and unlocked columns to preserve drag-drop order within groups
  const { visibleColumnsSorted } = useMemo(() => {
    const enhancedColumns = visibleColumns.map((column) => ({
      ...column,
      properties: {
        ...column.properties,
        display: {
          ...column.properties?.display,
          // Set locked state based on current context (panel-level or view-specific)
          locked:
            isColumnLocked(column.id) ||
            (column.properties?.display?.locked ?? false),
        },
      },
    }))

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
  }, [visibleColumns, isColumnLocked])

  const { searchTerm, setSearchTerm, searchMode, setSearchMode, filteredData } =
    useFHIRSearch({
      searchMode: 'text',
      debounceMs: 500,
      caseSensitive: false,
    })

  const setCurrentView = (viewType: ViewType) => {
    const currentParams = new URLSearchParams(searchParams.toString())
    currentParams.set('viewType', viewType)
    router.push(`${pathname}?${currentParams.toString()}`)
  }

  const handleModalClose = () => {
    setResourceId(null)
    removeQueryParamsWithoutRerender({ resourceId: '' })
  }

  const updatePanelViewType = async (viewType: ViewType) => {
    try {
      if (!panelId) return

      if (viewId) {
        await updateFunction({
          metadata: {
            ...panel.metadata,
            viewType,
          },
        })
      } else {
        await updateFunction({
          metadata: {
            ...panel.metadata,
            viewType,
          },
        })
      }

      setCurrentView(viewType)
    } catch (error) {
      console.error('Failed to update view type:', error)
    }
  }

  const handleColumnChanges = async (columnChanges: ColumnChangesResponse) => {
    if (!panel) return

    try {
      await applyColumnChanges(panel.id, columnChanges, viewId)
    } catch (error) {
      console.error('Failed to apply column changes:', error)
    }
  }

  const { onAddColumn } = useColumnCreator({
    currentViewType: currentView,
    patients: [],
    tasks: [],
    appointments: [],
    panel,
    columns: store.columns,
    currentViewId: viewId,
    onColumnChanges: handleColumnChanges,
  })

  const onPanelTitleChange = async (newTitle: string) => {
    if (!panel) {
      return
    }

    try {
      if (viewId) {
        await updateFunction({ name: newTitle })
      } else {
        await updateFunction({ name: newTitle })
      }
    } catch (error) {
      console.error('Failed to update title:', error)
    }
  }

  const onColumnUpdate = async (updates: Partial<Column>) => {
    if (!panel || !updates.id) {
      return
    }

    // Check if this is a locking/unlocking operation
    if (updates.properties?.display?.locked !== undefined) {
      // Use appropriate locking context (panel-level or view-specific)
      await setColumnLocked(updates.id, updates.properties.display.locked)
    } else {
      // For other column updates, use the regular updateColumn
      try {
        await updateColumn(panel.id, updates.id, updates)
      } catch (error) {
        console.error('Failed to update column:', error)
      }
    }
  }

  const onColumnDelete = async (columnId: string) => {
    if (!panel) {
      return
    }

    // Find the column name for better toast messages
    const column = store.columns.find((col) => col.id === columnId)
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

    if (sort && !store.columns.find((col) => col.id === sort.columnId)) {
      console.warn(`Cannot sort by column ${sort.columnId}: column not found`)
      return
    }

    try {
      // trigger sort then save in DB to unblock UI
      store.setSort(sort || null)

      // Update panel or view metadata with new sort configuration
      if (view && viewId) {
        await updateFunction({
          ...(view as View),
          metadata: {
            ...view.metadata,
            sort,
          },
        } as Partial<View>)
      } else {
        await updateFunction({
          ...panel,
          metadata: {
            ...panel.metadata,
            sort,
          },
        } as Partial<Panel>)
      }
    } catch (error) {
      console.error('Failed to update sort config:', error)
    }
  }

  const onFiltersChange = async (filters: Filter[]) => {
    if (!panel) return

    try {
      // Update panel or view metadata with new filters
      const appointmentsBundle = await getAllAppointments(
        store.columns,
        filters,
      )

      store.setFilters(filters || [])
      store.setBundles(appointmentsBundle)

      if (viewId && view) {
        await updateFunction({
          metadata: {
            ...view.metadata,
            filters,
          },
        })
      } else {
        await updateFunction({
          metadata: {
            ...panel.metadata,
            filters,
          },
        })
      }
    } catch (error) {
      console.error('Failed to update filters:', error)
    }
  }

  const onCardsConfigurationChange = async (cardsConfiguration: FHIRCard[]) => {
    if (!panel) {
      return
    }

    try {
      if (viewId) {
        await updateFunction({
          metadata: {
            ...panel.metadata,
            cardsConfiguration,
          },
        })
      } else {
        await updateFunction({
          metadata: {
            ...panel.metadata,
            cardsConfiguration,
          },
        })
      }
    } catch (error) {
      console.error('Failed to update cards configuration:', error)
    }
  }

  // Centralized row click handler
  const onRowClick =
    // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
    (row: Record<string, any>) => {
      const resourceId = row.resource.entry.find((e: BundleEntry) => {
        return e.resource?.resourceType === resourceType
      })?.resource?.id as string

      // handleRowClick(viewType as ResourceType, resourceId)
      setResourceId(resourceId)
      setQueryParamsWithoutRerender({ resourceId })
    }

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) {
        return
      }

      // Find the active column's index and the over column's index
      const oldIndex = visibleColumnsSorted.findIndex(
        (col) => col.id === active.id,
      )
      const newIndex = visibleColumnsSorted.findIndex(
        (col) => col.id === over.id,
      )

      if (oldIndex === -1 || newIndex === -1) {
        return
      }

      // Get the actual column objects to check locked states
      const activeColumn = visibleColumnsSorted[oldIndex]
      const overColumn = visibleColumnsSorted[newIndex]

      // Check locked states - for panel context, use column-level locked state directly
      const activeIsLocked = activeColumn?.properties?.display?.locked ?? false
      const overIsLocked = overColumn?.properties?.display?.locked ?? false

      // Prevent dragging between locked and unlocked groups
      // (locked columns must stay at the beginning for sticky positioning to work)
      if (activeIsLocked !== overIsLocked) {
        return
      }

      // Reorder the columns
      const reorderedColumns = arrayMove(
        visibleColumnsSorted,
        oldIndex,
        newIndex,
      )

      // Use the dedicated reorder method which shows only one toast
      if (panel) {
        try {
          await reorderColumns(panel.id, reorderedColumns)
        } catch (error) {
          console.error('Failed to reorder columns:', error)
        }
      }
    },
    [visibleColumnsSorted, panel, reorderColumns],
  )

  const onLoadMore = useCallback(async () => {
    // don't need to load anything
  }, [])

  const tableComponent = (
    <>
      <div className="navigation-area">
        {panel && (
          <PanelNavigation
            panel={panel}
            selectedViewId={viewId}
            currentViewType={currentView}
            onPanelTitleChange={onPanelTitleChange}
            currentFilters={tableFilters}
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
          currentView={currentView}
          setCurrentView={updatePanelViewType}
          columnVisibilityContext={columnVisibilityContext}
          onAddColumn={onAddColumn}
          viewId={viewId}
          viewName={panel?.name}
          panelId={panelId}
          filters={tableFilters}
          sort={tableSortConfig}
          columns={visibleColumns}
          onFiltersChange={onFiltersChange}
          onSortUpdate={onSortUpdate}
          isViewPage={!!viewId}
        />
      </div>
      <div className="content-area">
        <div className="table-scroll-container">
          <VirtualizedTable
            isFHIRBundle={true}
            isLoading={false}
            selectedRows={selectedRows}
            toggleSelectAll={() => {}}
            allColumns={store.columns}
            visibleColumns={visibleColumnsSorted}
            onSortUpdate={onSortUpdate}
            tableData={tableData}
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
            columnVisibilityContext={columnVisibilityContext}
            onColumnDelete={viewId ? undefined : onColumnDelete}
            filters={tableFilters}
            onFiltersChange={onFiltersChange}
            initialSort={tableSortConfig || null}
            onRowClick={onRowClick}
            handleDragEnd={handleDragEnd}
            hasMore={false}
            onLoadMore={onLoadMore}
            isLoadingMore={false}
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
      {resourceId && (
        <HybridModalDetails
          resourceType={startCase(viewType) as ResourceType}
          resourceId={resourceId}
          onClose={handleModalClose}
          pathname={pathname}
        />
      )}
      <div className="footer-area">
        <PanelFooter
          columnsCounter={visibleColumnsSorted.length}
          rowsCounter={tableData.length}
          navigateToHome={() => router.push('/')}
          isAISidebarOpen={false}
          dataAfter=""
          hasMore={false}
          onLoadMore={onLoadMore}
          isLoadingMore={false}
          onRefresh={() => {}}
          isLoading={false}
          panel={panel}
          onCardsConfigurationChange={onCardsConfigurationChange}
          canEdit={canEdit}
        />

        {/* WebSocket Status Indicator */}
        {!wsReady && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="alert alert-info shadow-lg max-w-sm">
              <div className="flex items-center space-x-2">
                {wsInitializing ? (
                  <>
                    <div className="loading loading-spinner loading-sm" />
                    <span className="text-sm">
                      Connecting to real-time updates...
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-warning rounded-full" />
                    <span className="text-sm">
                      Real-time updates unavailable
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )

  return tableComponent
}
