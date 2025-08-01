'use client'

import {
  forwardRef,
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from 'react'
import { VariableSizeGrid } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import type { Column, Filter, Sort } from '@/types/panel'
import { getNestedValue, isMatchingFhirPathCondition } from '@/lib/fhir-path'
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import { StickyGridProvider } from './StickyContext'
import { VirtualizedCell } from './VirtualizedCell'
import { StickyHeader } from './StickyHeader'
import {
  calculateColumnWidthByTitle,
  SELECTION_COLUMN_WIDTH,
  ROW_HEIGHT,
  HEADER_HEIGHT,
  MIN_COLUMN_WIDTH,
  MAX_COLUMN_WIDTH,
} from './constants'
import { template } from 'lodash'

interface VirtualizedTableProps {
  isLoading: boolean
  selectedRows: string[]
  toggleSelectAll: () => void
  columns: Column[]
  orderColumnMode?: 'auto' | 'manual'
  // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
  tableData: Record<string, any>[]
  handlePDFClick: (pdfUrl: string, patientName: string) => void
  handleTaskClick: (
    task: string,
    taskStatus: string,
    patientName: string,
  ) => void
  handleRowHover: (
    rowIndex: number,
    isHovered: boolean,
    rect: DOMRect | null,
  ) => void
  toggleSelectRow: (rowId: string) => void
  handleAssigneeClick: (taskId: string) => Promise<void>
  onColumnUpdate: (updates: Partial<Column>) => void
  onColumnDelete?: (columnId: string) => void
  onSortUpdate: (sort: Sort | undefined) => void
  currentView: string
  filters: Filter[]
  onFiltersChange: (filters: Filter[]) => void
  initialSort: Sort | null
  currentUserName?: string
  // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
  onRowClick: (row: Record<string, any>) => void
  handleDragEnd?: (event: DragEndEvent) => void
  hasMore?: boolean
  onLoadMore?: () => void
  isLoadingMore?: boolean
}

export function VirtualizedTable({
  isLoading,
  selectedRows,
  toggleSelectAll,
  columns,
  orderColumnMode = 'auto',
  tableData,
  handlePDFClick,
  handleTaskClick,
  handleRowHover,
  toggleSelectRow,
  handleAssigneeClick,
  onColumnUpdate,
  onColumnDelete,
  onSortUpdate,
  currentView,
  filters,
  onFiltersChange,
  initialSort,
  currentUserName,
  onRowClick,
  handleDragEnd,
  hasMore,
  onLoadMore,
  isLoadingMore,
}: VirtualizedTableProps) {
  // Drag and drop state
  const [activeColumn, setActiveColumn] = useState<Column | null>(null)

  // Row hover state
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null)

  // Grid ref for resetting cached dimensions
  const gridRef = useRef<VariableSizeGrid>(null)

  // Sort columns by order if needed
  const visibleColumns = useMemo(() => {
    if (orderColumnMode === 'auto') {
      return columns.sort((a: Column, b: Column) => {
        const orderA = a.properties?.display?.order ?? Number.MAX_SAFE_INTEGER
        const orderB = b.properties?.display?.order ?? Number.MAX_SAFE_INTEGER
        return orderA - orderB
      })
    }
    return columns
  }, [columns, orderColumnMode])

  // Create a stable key for grid re-rendering
  const gridKey = useMemo(() => {
    const columnIds = visibleColumns.map((col: Column) => col.id).join('-')
    return `${currentView}-${columnIds}`
  }, [currentView, visibleColumns])

  // Reset grid dimensions when view or columns change
  // biome-ignore lint/correctness/useExhaustiveDependencies: dependencies are fine
  useEffect(() => {
    if (gridRef.current) {
      // Reset cached column widths
      gridRef.current.resetAfterColumnIndex(0)
      // Reset cached row heights
      gridRef.current.resetAfterRowIndex(0)
    }
  }, [currentView, visibleColumns])

  // Apply filtering and sorting to data
  const filteredAndSortedData = useMemo(() => {
    // First apply filters
    let filteredData = tableData
    if (filters && filters.length > 0) {
      filteredData = tableData.filter((row) => {
        return filters.every((filter) => {
          const column = columns.find((c) => c.id === filter.columnId)
          if (column) {
            if (filter.fhirExpressionTemplate) {
              // For date filters, parse from/to from the value
              let templateVars: Record<string, string> = {
                sourceField: column.sourceField || '',
                value: filter.value,
              }

              // Parse date range if the filter contains a date range format
              // This handles both explicit date columns and any filter with date range format
              if (column.type === 'date') {
                // Handle both '#' and ' - ' delimiters for backward compatibility
                const delimiter = filter.value.includes('#') ? '#' : ' - '
                const [from, to] = filter.value.split(delimiter)
                templateVars = {
                  ...templateVars,
                  from: from?.trim() || '',
                  to: to?.trim() || '',
                }
              }

              const fhirPath = template(filter.fhirExpressionTemplate, {
                interpolate: /{{([\s\S]+?)}}/g,
              })(templateVars)
              return isMatchingFhirPathCondition(row, fhirPath)
            }
            return true
          }
          // Legacy behaviour
          const legacyColumn = columns.find(
            (c) => c.sourceField === filter.fhirPathFilter?.[0],
          )
          if (legacyColumn && filter.fhirPathFilter) {
            const fhirPath = `${legacyColumn.sourceField}.lower().contains('${filter.fhirPathFilter[1].toLowerCase()}')`
            return isMatchingFhirPathCondition(row, fhirPath)
          }
          return true
        })
      })
    }

    // Then apply sorting
    if (!initialSort) return filteredData

    const sortFhirPath = columns.find(
      (c) => c.id === initialSort.columnId,
    )?.sourceField
    if (!sortFhirPath) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = getNestedValue(a, sortFhirPath)
      const bValue = getNestedValue(b, sortFhirPath)

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return initialSort.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return initialSort.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return initialSort.direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime()
      }

      return initialSort.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue))
    })
  }, [tableData, initialSort, filters, columns])

  // Calculate base column width based on title length and custom width
  const getBaseColumnWidth = useCallback(
    (columnIndex: number) => {
      const column = visibleColumns[columnIndex]
      if (!column) return MIN_COLUMN_WIDTH

      const customWidth = column.properties?.display?.width
      const calculatedWidth = calculateColumnWidthByTitle(
        column.name,
        column.type,
      )

      return Math.max(
        MIN_COLUMN_WIDTH,
        Math.min(MAX_COLUMN_WIDTH, customWidth || calculatedWidth),
      )
    },
    [visibleColumns],
  )

  // Calculate column width for grid (includes selection column at index 0)
  const getColumnWidth = useCallback(
    (columnIndex: number) => {
      // Selection column
      if (columnIndex === 0) {
        return SELECTION_COLUMN_WIDTH
      }

      // Data columns
      return getBaseColumnWidth(columnIndex - 1)
    },
    [getBaseColumnWidth],
  )

  // Handle sorting
  const handleSort = useCallback(
    (columnId: string) => {
      const current = initialSort
      let newSort: Sort | undefined

      if (current?.columnId === columnId) {
        newSort = {
          columnId,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        }
      } else {
        newSort = { columnId, direction: 'desc' }
      }

      onSortUpdate(newSort)
    },
    [initialSort, onSortUpdate],
  )

  // Handle filtering
  const handleFilter = useCallback(
    (columnId: string, value: string) => {
      const newFilters = filters.filter((f) => f.columnId !== columnId)
      const column = columns.find((c) => c.id === columnId)

      if (value) {
        if (column?.type === 'date') {
          // For date filters, determine if it's a period object or simple date field
          const [from, to] = value.split('#')
          const isSimpleDateField =
            column.sourceField === 'birthDate' ||
            column.sourceField?.endsWith('.birthDate') ||
            !column.sourceField?.includes('period')

          // Create conditional FHIR expression based on available values and field type
          let fhirExpression = ''

          if (isSimpleDateField) {
            // Simple date field (like birthDate)
            if (from?.trim() && to?.trim()) {
              fhirExpression = `{{sourceField}} >= '{{from}}' and {{sourceField}} <= '{{to}}'`
            } else if (to?.trim()) {
              fhirExpression = `{{sourceField}} <= '{{to}}'`
            } else if (from?.trim()) {
              fhirExpression = `{{sourceField}} >= '{{from}}'`
            }
          } else {
            // Period object (like admission/discharge periods)
            if (from?.trim() && to?.trim()) {
              fhirExpression = `{{sourceField}}.start <= '{{to}}' and {{sourceField}}.end >= '{{from}}'`
            } else if (to?.trim()) {
              fhirExpression = `{{sourceField}}.start <= '{{to}}'`
            } else if (from?.trim()) {
              fhirExpression = `{{sourceField}}.end >= '{{from}}'`
            }
          }

          newFilters.push({
            columnId: columnId,
            value: value.trim(), // Don't lowercase dates
            fhirExpressionTemplate: fhirExpression,
          })
        } else {
          newFilters.push({
            columnId: columnId,
            value: value.trim().toLowerCase(),
            fhirExpressionTemplate: `{{sourceField}}.lower().contains('{{value}}')`,
          })
        }
      }

      onFiltersChange(newFilters)
    },
    [filters, onFiltersChange, columns],
  )

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      const column = visibleColumns.find((col) => col.id === active.id)
      setActiveColumn(column || null)
    },
    [visibleColumns],
  )

  const handleDragEndWithReset = useCallback(
    (event: DragEndEvent) => {
      setActiveColumn(null)
      handleDragEnd?.(event)
    },
    [handleDragEnd],
  )

  // Drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  )

  // Get type icon for drag overlay
  const getTypeIcon = useCallback((column: Column) => {
    switch (column.type) {
      case 'date':
        return (
          <svg
            className="h-3.5 w-3.5 mr-1.5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            role="img"
          >
            <title>Date column</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )
      case 'number':
        return (
          <svg
            className="h-3.5 w-3.5 mr-1.5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            role="img"
          >
            <title>Number column</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
            />
          </svg>
        )
      case 'boolean':
        return (
          <svg
            className="h-3.5 w-3.5 mr-1.5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            role="img"
          >
            <title>Boolean column</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )
      default:
        return (
          <svg
            className="h-3.5 w-3.5 mr-1.5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            role="img"
          >
            <title>Text column</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h7"
            />
          </svg>
        )
    }
  }, [])

  // Handle internal row hover - manages local state and calls parent handler
  const handleInternalRowHover = useCallback(
    (rowIndex: number, isHovered: boolean, rect: DOMRect | null) => {
      setHoveredRowIndex(isHovered ? rowIndex : null)
      handleRowHover(rowIndex, isHovered, rect)
    },
    [handleRowHover],
  )

  // Handle when items are rendered to detect when we're near the end
  const handleItemsRendered = useCallback(
    ({ overscanRowStopIndex }: { overscanRowStopIndex: number }) => {
      if (!onLoadMore || !hasMore || isLoadingMore || isLoading) return

      const totalRows = filteredAndSortedData.length
      const threshold = 5

      if (overscanRowStopIndex >= totalRows - threshold) {
        onLoadMore()
      }
    },
    [
      onLoadMore,
      hasMore,
      isLoadingMore,
      isLoading,
      filteredAndSortedData.length,
    ],
  )

  // Prepare data for rows - uses filtered and sorted data
  const rowData = useMemo(
    () => ({
      rows: filteredAndSortedData,
      selectedRows,
      toggleSelectRow,
      onRowClick,
      onRowHover: handleInternalRowHover,
      onPDFClick: handlePDFClick,
      onTaskClick: handleTaskClick,
      onAssigneeClick: handleAssigneeClick,
      currentView,
      currentUserName,
      hoveredRowIndex,
      // Header-specific data
      toggleSelectAll,
      tableDataLength: filteredAndSortedData.length,
    }),
    [
      filteredAndSortedData,
      selectedRows,
      toggleSelectRow,
      onRowClick,
      handleInternalRowHover,
      handlePDFClick,
      handleTaskClick,
      handleAssigneeClick,
      currentView,
      currentUserName,
      hoveredRowIndex,
      toggleSelectAll,
    ],
  )

  // Get row height - header row is taller
  const getRowHeight = useCallback((rowIndex: number) => {
    return rowIndex === 0 ? HEADER_HEIGHT : ROW_HEIGHT
  }, [])

  // Custom inner element that renders sticky header
  const CustomInnerElement = useMemo(() => {
    // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
    return forwardRef<HTMLDivElement, any>(({ children, ...rest }, ref) => (
      <div ref={ref} {...rest}>
        <StickyHeader
          key={gridKey} // Force header re-render when view changes
          selectedRows={selectedRows}
          toggleSelectAll={toggleSelectAll}
          tableDataLength={filteredAndSortedData.length}
          getColumnWidth={getColumnWidth}
        />
        <div style={{ paddingTop: HEADER_HEIGHT }}>{children}</div>
      </div>
    ))
  }, [
    gridKey,
    selectedRows,
    toggleSelectAll,
    filteredAndSortedData.length,
    getColumnWidth,
  ])

  // Context value for sticky grid
  const contextValue = useMemo(
    () => ({
      stickyIndices: [0], // First row is header
      columns: visibleColumns,
      getColumnWidth,
      onSort: handleSort,
      sortConfig: initialSort,
      onFilter: handleFilter,
      filters,
      onColumnUpdate,
      onColumnDelete,
    }),
    [
      visibleColumns,
      getColumnWidth,
      handleSort,
      initialSort,
      handleFilter,
      filters,
      onColumnUpdate,
      onColumnDelete,
    ],
  )

  if (isLoading && filteredAndSortedData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 text-blue-500 animate-spin mb-2" />
          <p className="text-sm text-gray-500 font-normal">
            Building your panel...
          </p>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEndWithReset}
      modifiers={[restrictToHorizontalAxis]}
    >
      <StickyGridProvider value={contextValue}>
        <div className="h-full w-full">
          <AutoSizer>
            {({ height, width }) => {
              // Create a closure that captures the container width
              const getColumnWidthWithContainer = (columnIndex: number) => {
                return getColumnWidth(columnIndex)
              }

              return (
                <VariableSizeGrid
                  ref={gridRef}
                  key={gridKey} // Force re-render when view or columns change
                  height={height}
                  width={width}
                  columnCount={visibleColumns.length + 1} // +1 for selection column
                  rowCount={filteredAndSortedData.length + 1} // +1 for header row
                  columnWidth={getColumnWidthWithContainer}
                  rowHeight={getRowHeight}
                  itemData={{
                    ...rowData,
                  }}
                  innerElementType={CustomInnerElement}
                  onItemsRendered={handleItemsRendered}
                >
                  {VirtualizedCell}
                </VariableSizeGrid>
              )
            }}
          </AutoSizer>
        </div>
      </StickyGridProvider>

      {/* Drag Overlay - Shows the column being dragged */}
      <DragOverlay>
        {activeColumn ? (
          <div className="bg-white border border-blue-300 rounded shadow-lg px-3 py-2 text-xs font-normal text-gray-700 flex items-center opacity-90">
            {getTypeIcon(activeColumn)}
            <span>{activeColumn.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
