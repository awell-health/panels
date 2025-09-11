'use client'

import {
  forwardRef,
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from 'react'
import { TableVirtuoso } from 'react-virtuoso'
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
import { VirtualizedRow } from './VirtualizedRow'
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
import { cn } from '@/lib/utils'
import { Table } from 'lucide-react'

interface VirtualizedTableProps {
  isLoading: boolean
  selectedRows: string[]
  toggleSelectAll: () => void
  allColumns: Column[]
  visibleColumns: Column[]
  orderColumnMode?: 'auto' | 'manual'
  // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
  tableData: Record<string, any>[]
  handlePDFClick: (pdfUrl: string, patientName: string) => void
  handleTaskClick: (
    task: string,
    taskStatus: string,
    patientName: string,
  ) => void
  handleRowHover: (rowIndex: number) => void
  toggleSelectRow: (rowId: string) => void
  handleAssigneeClick: (taskId: string) => Promise<void>
  onColumnUpdate?: (updates: Partial<Column>) => void
  onColumnDelete?: (columnId: string) => void
  onSortUpdate?: (sort: Sort | undefined) => void
  currentView: string
  filters?: Filter[]
  onFiltersChange?: (filters: Filter[]) => void
  initialSort?: Sort | null
  currentUserName?: string
  // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
  onRowClick: (row: Record<string, any>) => void
  handleDragEnd: (event: DragEndEvent) => void
  hasMore?: boolean
  onLoadMore?: () => void
  isLoadingMore?: boolean
}

// Icon helper function (same as original)
function getTypeIcon(column: Column) {
  const iconClasses = 'w-3 h-3 mr-1 text-gray-400'
  switch (column.type) {
    case 'text':
      return <span className={iconClasses}>📝</span>
    case 'number':
      return <span className={iconClasses}>🔢</span>
    case 'date':
    case 'datetime':
      return <span className={iconClasses}>📅</span>
    case 'boolean':
      return <span className={iconClasses}>☑️</span>
    case 'select':
    case 'multi_select':
      return <span className={iconClasses}>📋</span>
    case 'user':
      return <span className={iconClasses}>👤</span>
    case 'file':
      return <span className={iconClasses}>📎</span>
    default:
      return <span className={iconClasses}>🔧</span>
  }
}

export function VirtualizedTable({
  isLoading,
  selectedRows,
  toggleSelectAll,
  allColumns,
  visibleColumns,
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
  // State management (similar to original)

  const [activeColumn, setActiveColumn] = useState<Column | null>(null)
  const [sortConfig, setSortConfig] = useState<Sort | undefined>(
    initialSort || undefined,
  )
  const [containerWidth, setContainerWidth] = useState(1200)
  const [gridKey, setGridKey] = useState(0)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [isResizing, setIsResizing] = useState(false)

  // Refs
  const virtuosoRef = useRef(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  )

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    const resizeObserver = new ResizeObserver(handleResize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [])

  // Force re-render when view or columns change
  useEffect(() => {
    setGridKey((prevKey) => prevKey + 1)
  }, [])

  // Update sort config when initialSort changes
  useEffect(() => {
    setSortConfig(initialSort || undefined)
  }, [initialSort])

  // Pre-calculate all column widths to prevent recalculation during scroll
  const calculatedColumnWidths = useMemo(() => {
    const widths = visibleColumns.map((column) => {
      // Use custom width if set, otherwise use calculated width
      if (columnWidths[column.id]) {
        return columnWidths[column.id]
      }
      if (
        column.properties?.display?.width &&
        column.properties.display.width > 0
      ) {
        return Math.max(
          Math.min(column.properties.display.width, MAX_COLUMN_WIDTH),
          MIN_COLUMN_WIDTH,
        )
      }
      const width = calculateColumnWidthByTitle(column.name, column.type, true) // Use header calculation
      return width
    })

    return widths
  }, [visibleColumns, columnWidths])

  // Simple column width getter
  const getColumnWidth = useCallback(
    (columnIndex: number) => {
      return calculatedColumnWidths[columnIndex] || MIN_COLUMN_WIDTH
    },
    [calculatedColumnWidths],
  )

  // Pre-calculate sticky positions for all locked columns to ensure consistency
  const stickyPositions = useMemo(() => {
    const positions: number[] = []
    let currentPosition = 0

    for (let i = 0; i < visibleColumns.length; i++) {
      const column = visibleColumns[i]
      const isLocked = column?.properties?.display?.locked

      if (isLocked) {
        positions[i] = currentPosition
        const columnWidth = calculatedColumnWidths[i] || MIN_COLUMN_WIDTH
        currentPosition += columnWidth
      } else {
        positions[i] = 0 // Not used for unlocked columns
      }
    }

    return positions
  }, [visibleColumns, calculatedColumnWidths])

  // Calculate sticky left positions for locked columns
  const getStickyColumnStyles = useCallback(
    (columnIndex: number, isHeader = false) => {
      const column = visibleColumns[columnIndex]
      // Check view-specific locked state first, then fall back to column-level for backward compatibility
      const isLocked = column?.properties?.display?.locked

      if (!isLocked) {
        return {}
      }
      const leftPosition = stickyPositions[columnIndex] || 0
      const columnWidth =
        calculatedColumnWidths[columnIndex] || MIN_COLUMN_WIDTH

      return {
        position: 'sticky' as const,
        left: leftPosition,
        width: columnWidth,
        minWidth: columnWidth, // Minimum width for both headers and data cells
        maxWidth: columnWidth,
        // Headers need higher z-index to stay above both content and regular headers
        // Data cells need lower z-index to stay below headers during scroll
        zIndex: isHeader ? 41 : 1,
        backgroundColor: isHeader ? '#fefefe' : 'white', // Slightly off-white for headers
        boxShadow: isHeader
          ? '2px 0 8px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)' // Enhanced shadow for headers
          : '2px 0 8px rgba(0,0,0,0.15)',
        // Ensure proper stacking context
        isolation: 'isolate' as const,
        // Force the browser to respect the exact width
        flexShrink: 0,
        boxSizing: 'border-box' as const,
        whiteSpace: 'nowrap',
      }
    },
    [visibleColumns, calculatedColumnWidths, stickyPositions],
  )

  // Data filtering and sorting (same logic as original)
  const filteredAndSortedData = useMemo(() => {
    let processedData = [...tableData]

    // Helper function to check if a date value falls within a range
    const isDateInRange = (dateValue: string, filterValue: string): boolean => {
      if (!dateValue || !filterValue) return false

      try {
        const cellDate = new Date(dateValue)
        if (Number.isNaN(cellDate.getTime())) return false

        // Check if filter value contains date range delimiter
        if (filterValue.includes('#')) {
          const [fromDate, toDate] = filterValue.split('#')

          if (fromDate && toDate) {
            const from = new Date(fromDate)
            const to = new Date(toDate)
            return cellDate >= from && cellDate <= to
          }

          if (fromDate) {
            const from = new Date(fromDate)
            return cellDate >= from
          }

          if (toDate) {
            const to = new Date(toDate)
            return cellDate <= to
          }
        }

        // Fallback to string matching for non-range filters
        return String(dateValue)
          .toLowerCase()
          .includes(filterValue.toLowerCase())
      } catch (error) {
        console.warn('Error parsing date for filtering:', error)
        return false
      }
    }

    // Apply filters
    if (filters && filters.length > 0) {
      processedData = processedData.filter((row) => {
        return filters.every((filter) => {
          if (!filter.value || filter.value.trim() === '') return true

          // Handle new filter format with columnId
          if (filter.columnId) {
            const column = allColumns.find((col) => col.id === filter.columnId)
            if (!column) return true

            const cellValue = getNestedValue(row, column.sourceField)
            const filterValue = filter.value

            if (cellValue === null || cellValue === undefined) return false

            // Handle date range filtering
            if (column.type === 'date' || column.type === 'datetime') {
              return isDateInRange(cellValue, filterValue)
            }

            // Default string matching for non-date columns
            return String(cellValue)
              .toLowerCase()
              .includes(filterValue.toLowerCase())
          }

          // Handle legacy filter format with fhirPathFilter
          if (filter.fhirPathFilter && filter.fhirPathFilter.length >= 2) {
            const [fhirPath, expectedValue] = filter.fhirPathFilter
            const fhirExpression = `${fhirPath}.lower().contains('${expectedValue.toLowerCase()}')`
            return isMatchingFhirPathCondition(row, fhirExpression)
          }

          return true
        })
      })
    }

    // Apply sorting
    if (sortConfig) {
      processedData.sort((a, b) => {
        const column = visibleColumns.find(
          (col) => col.id === sortConfig.columnId,
        )
        if (!column) return 0

        const aValue = getNestedValue(a, column.sourceField)
        const bValue = getNestedValue(b, column.sourceField)

        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        let comparison = 0
        if (column.type === 'number') {
          comparison = Number(aValue) - Number(bValue)
        } else if (column.type === 'date' || column.type === 'datetime') {
          comparison = new Date(aValue).getTime() - new Date(bValue).getTime()
        } else {
          comparison = String(aValue).localeCompare(String(bValue))
        }

        return sortConfig.direction === 'desc' ? -comparison : comparison
      })
    }

    return processedData
  }, [tableData, filters, sortConfig, visibleColumns, allColumns])

  // Handle internal row hover
  const handleInternalRowHover = useCallback(
    (rowIndex: number, isHovered: boolean, rect: DOMRect | null) => {
      if (isHovered) {
        handleRowHover(rowIndex)
      }
    },
    [handleRowHover],
  )

  // Handle sort
  const handleSort = useCallback(
    (columnId: string) => {
      const newSortConfig: Sort = {
        columnId,
        direction:
          sortConfig?.columnId === columnId && sortConfig.direction === 'asc'
            ? 'desc'
            : 'asc',
      }
      setSortConfig(newSortConfig)
      onSortUpdate?.(newSortConfig)
    },
    [sortConfig, onSortUpdate],
  )

  // Handle filter
  const handleFilter = useCallback(
    (columnId: string, value: string) => {
      if (!onFiltersChange) return

      const newFilters = [...(filters || [])]
      const existingFilterIndex = newFilters.findIndex(
        (f) => f.columnId === columnId,
      )

      if (value.trim() === '') {
        if (existingFilterIndex >= 0) {
          newFilters.splice(existingFilterIndex, 1)
        }
      } else {
        const newFilter: Filter = {
          columnId,
          value,
          fhirExpressionTemplate: `{{sourceField}}.lower().contains('{{value}}')`,
        }
        if (existingFilterIndex >= 0) {
          newFilters[existingFilterIndex] = newFilter
        } else {
          newFilters.push(newFilter)
        }
      }

      onFiltersChange(newFilters)
    },
    [filters, onFiltersChange],
  )

  // Drag handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const columnId = event.active.id as string
      const column = visibleColumns.find((col) => col.id === columnId)
      setActiveColumn(column || null)
    },
    [visibleColumns],
  )

  const handleDragEndWithReset = useCallback(
    (event: DragEndEvent) => {
      handleDragEnd(event)
      setActiveColumn(null)
    },
    [handleDragEnd],
  )

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore()
    }
  }, [hasMore, isLoadingMore, onLoadMore])

  // Context value for sticky grid - keep stable by excluding frequently changing values
  const contextValue = useMemo(
    () => ({
      stickyIndices: [0],
      columns: visibleColumns,
      getColumnWidth,
      getStickyColumnStyles,
      onSort: handleSort,
      onFilter: handleFilter,
      onColumnUpdate,
      onColumnDelete,
    }),
    [
      visibleColumns,
      getColumnWidth,
      getStickyColumnStyles,
      handleSort,
      handleFilter,
      onColumnUpdate,
      onColumnDelete,
    ],
  )

  // Row renderer for TableVirtuoso
  const RowRenderer = useCallback(
    (index: number) => {
      const row = filteredAndSortedData[index]
      if (!row) return null

      return (
        <VirtualizedRow
          key={row.id || index}
          index={index}
          row={row}
          selectedRows={selectedRows}
          toggleSelectRow={toggleSelectRow}
          onRowClick={onRowClick}
          onRowHover={handleInternalRowHover}
          onPDFClick={handlePDFClick}
          onTaskClick={handleTaskClick}
          onAssigneeClick={handleAssigneeClick}
          currentView={currentView}
          currentUserName={currentUserName}
          getColumnWidth={getColumnWidth}
        />
      )
    },
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
      getColumnWidth,
    ],
  )

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // Handle empty columns state
  if (visibleColumns.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <Table className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-500 text-sm">No columns configured</p>
          <p className="text-gray-400 text-xs mt-1">
            Add columns to start viewing your data
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
        <div ref={containerRef} className="h-full w-full overflow-auto">
          <TableVirtuoso
            ref={virtuosoRef}
            key={gridKey}
            totalCount={filteredAndSortedData.length}
            fixedHeaderContent={() => (
              <StickyHeader
                selectedRows={selectedRows}
                toggleSelectAll={toggleSelectAll}
                tableDataLength={filteredAndSortedData.length}
                getColumnWidth={getColumnWidth}
                sortConfig={sortConfig}
                filters={filters}
              />
            )}
            itemContent={(index) => RowRenderer(index)}
            endReached={handleLoadMore}
            overscan={10}
            style={{ height: '100%' }}
            components={{
              Table: ({ style, ...props }) => (
                <table
                  {...props}
                  style={{
                    ...style,
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    tableLayout: 'auto',
                    width: 'max-content',
                    minWidth: '100%',
                    position: 'relative',
                  }}
                />
              ),
              TableHead: forwardRef<HTMLTableSectionElement>((props, ref) => (
                <thead {...props} ref={ref} />
              )),
              TableRow: ({ ...props }) => <tr {...props} />,
              TableBody: forwardRef<HTMLTableSectionElement>((props, ref) => (
                <tbody {...props} ref={ref} />
              )),
            }}
          />
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
