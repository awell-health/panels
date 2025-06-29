"use client";

import { forwardRef, useCallback, useMemo, useState } from "react";
import { VariableSizeGrid } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import type { ColumnDefinition } from "@/types/worklist";
import { getNestedValue, isMatchingFhirPathCondition } from "@/lib/fhir-path";
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { StickyGridProvider } from "./StickyContext";
import { VirtualizedCell } from "./VirtualizedCell";
import {
  calculateColumnWidthByTitle,
  SELECTION_COLUMN_WIDTH,
  ROW_HEIGHT,
  HEADER_HEIGHT,
  MIN_COLUMN_WIDTH,
  MAX_COLUMN_WIDTH
} from "./constants";

interface TableFilter {
  key: string;
  value: string;
}

interface VirtualizedWorklistTableProps {
  isLoading: boolean;
  selectedRows: string[];
  toggleSelectAll: () => void;
  worklistColumns: ColumnDefinition[];
  tableData: Record<string, any>[];
  handlePDFClick: (pdfUrl: string, patientName: string) => void;
  handleTaskClick: (task: string, taskStatus: string, patientName: string) => void;
  handleRowHover: (rowIndex: number, isHovered: boolean, rect: DOMRect | null) => void;
  toggleSelectRow: (rowId: string) => void;
  handleAssigneeClick: (taskId: string) => void;
  onColumnUpdate: (updates: Partial<ColumnDefinition>) => void;
  onSortConfigUpdate: (sortConfig: { key: string; direction: 'asc' | 'desc' } | undefined) => void;
  currentView: string;
  filters: TableFilter[];
  onFiltersChange: (filters: TableFilter[]) => void;
  initialSortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  currentUserName?: string;
  onRowClick: (row: Record<string, any>) => void;
  handleDragEnd?: (event: DragEndEvent) => void;
}

// Inner element component for the grid
const InnerElement = forwardRef<HTMLDivElement, any>(({ children, ...rest }, ref) => (
  <div ref={ref} {...rest}>
    {children}
  </div>
));
InnerElement.displayName = "InnerElement";

export function VirtualizedWorklistTable({
  isLoading,
  selectedRows,
  toggleSelectAll,
  worklistColumns,
  tableData,
  handlePDFClick,
  handleTaskClick,
  handleRowHover,
  toggleSelectRow,
  handleAssigneeClick,
  onColumnUpdate,
  onSortConfigUpdate,
  currentView,
  filters,
  onFiltersChange,
  initialSortConfig,
  currentUserName,
  onRowClick,
  handleDragEnd,
}: VirtualizedWorklistTableProps) {

  // Drag and drop state
  const [activeColumn, setActiveColumn] = useState<ColumnDefinition | null>(null);

  // Filter visible columns and sort by order
  const visibleColumns = useMemo(() => {
    return worklistColumns
      .filter(col => col.properties?.display?.visible !== false)
      .sort((a, b) => {
        const orderA = a.properties?.display?.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.properties?.display?.order ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
  }, [worklistColumns]);

  // Apply filtering and sorting to data
  const filteredAndSortedData = useMemo(() => {
    // First apply filters
    let filteredData = tableData;
    if (filters && filters.length > 0) {
      filteredData = tableData.filter(row => {
        return filters.every(filter => {
          // Use partial matching with contains() for more user-friendly filtering
          const fhirPath = `${filter.key}.lower().contains('${filter.value.toLowerCase()}')`;
          return isMatchingFhirPathCondition(row, fhirPath);
        });
      });
    }

    // Then apply sorting
    if (!initialSortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = getNestedValue(a, initialSortConfig.key);
      const bValue = getNestedValue(b, initialSortConfig.key);

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return initialSortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return initialSortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return initialSortConfig.direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      return initialSortConfig.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [tableData, initialSortConfig, filters]);

  // Calculate base column width based on title length and custom width
  const getBaseColumnWidth = useCallback((columnIndex: number) => {
    const column = visibleColumns[columnIndex];
    if (!column) return MIN_COLUMN_WIDTH;

    const customWidth = column.properties?.display?.width;
    const calculatedWidth = calculateColumnWidthByTitle(column.name, column.type);

    return Math.max(
      MIN_COLUMN_WIDTH,
      Math.min(MAX_COLUMN_WIDTH, customWidth || calculatedWidth)
    );
  }, [visibleColumns]);

  // Calculate adjusted column widths to fill available space
  const getColumnWidthsAndTotal = useCallback((containerWidth: number) => {
    const baseWidths = visibleColumns.map((_, index) => getBaseColumnWidth(index));
    const baseTotalWidth = baseWidths.reduce((acc, width) => acc + width, 0) + SELECTION_COLUMN_WIDTH;

    // If base total is less than container width, expand columns proportionally
    if (baseTotalWidth < containerWidth) {
      const availableExtraWidth = containerWidth - baseTotalWidth;
      const totalBaseColumnsWidth = baseWidths.reduce((acc, width) => acc + width, 0);

      const adjustedWidths = baseWidths.map(baseWidth => {
        const proportion = baseWidth / totalBaseColumnsWidth;
        return baseWidth + (availableExtraWidth * proportion);
      });

      return {
        columnWidths: adjustedWidths,
        totalWidth: containerWidth
      };
    }

    // If base total is greater than or equal to container width, use base widths
    return {
      columnWidths: baseWidths,
      totalWidth: baseTotalWidth
    };
  }, [visibleColumns, getBaseColumnWidth]);

  // Calculate column width for grid (includes selection column at index 0)
  const getColumnWidth = useCallback((columnIndex: number, containerWidth?: number) => {
    // Selection column
    if (columnIndex === 0) {
      return SELECTION_COLUMN_WIDTH;
    }

    // Data columns - use container width if available for proper distribution
    if (containerWidth) {
      const { columnWidths } = getColumnWidthsAndTotal(containerWidth);
      return columnWidths[columnIndex - 1] || MIN_COLUMN_WIDTH;
    }

    // Fallback to base width calculation
    return getBaseColumnWidth(columnIndex - 1);
  }, [getBaseColumnWidth, getColumnWidthsAndTotal]);

  // Handle sorting
  const handleSort = useCallback((columnKey: string) => {
    const current = initialSortConfig;
    let newSortConfig: { key: string; direction: 'asc' | 'desc' } | undefined;

    if (current?.key === columnKey) {
      newSortConfig = { key: columnKey, direction: current.direction === 'asc' ? 'desc' : 'asc' };
    } else {
      newSortConfig = { key: columnKey, direction: 'desc' };
    }

    onSortConfigUpdate(newSortConfig);
  }, [initialSortConfig, onSortConfigUpdate]);

  // Handle filtering
  const handleFilter = useCallback((columnKey: string, value: string) => {
    const newFilters = filters.filter(f => f.key !== columnKey);
    if (value) {
      newFilters.push({ key: columnKey, value });
    }
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const column = visibleColumns.find(col => col.id === active.id);
    setActiveColumn(column || null);
  }, [visibleColumns]);

  const handleDragEndWithReset = useCallback((event: DragEndEvent) => {
    setActiveColumn(null);
    handleDragEnd?.(event);
  }, [handleDragEnd]);

  // Drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  // Get type icon for drag overlay
  const getTypeIcon = useCallback((column: ColumnDefinition) => {
    switch (column.type) {
      case "date":
        return (
          <svg className="h-3.5 w-3.5 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" role="img">
            <title>Date column</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      case "number":
        return (
          <svg className="h-3.5 w-3.5 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" role="img">
            <title>Number column</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        )
      case "boolean":
        return (
          <svg className="h-3.5 w-3.5 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" role="img">
            <title>Boolean column</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      default:
        return (
          <svg className="h-3.5 w-3.5 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" role="img">
            <title>Text column</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        )
    }
  }, []);

  // Prepare data for rows - uses filtered and sorted data
  const rowData = useMemo(() => ({
    rows: filteredAndSortedData,
    selectedRows,
    toggleSelectRow,
    onRowClick,
    onRowHover: handleRowHover,
    onPDFClick: handlePDFClick,
    onTaskClick: handleTaskClick,
    onAssigneeClick: handleAssigneeClick,
    currentView,
    currentUserName,
    // Header-specific data
    toggleSelectAll,
    tableDataLength: filteredAndSortedData.length,
  }), [
    filteredAndSortedData,
    selectedRows,
    toggleSelectRow,
    onRowClick,
    handleRowHover,
    handlePDFClick,
    handleTaskClick,
    handleAssigneeClick,
    currentView,
    currentUserName,
    toggleSelectAll,
  ]);

  // Get row height - header row is taller
  const getRowHeight = useCallback((rowIndex: number) => {
    return rowIndex === 0 ? HEADER_HEIGHT : ROW_HEIGHT;
  }, []);

  // Context value for sticky grid
  const contextValue = useMemo(() => ({
    stickyIndices: [0], // First row is header
    columns: visibleColumns,
    getColumnWidth,
    getColumnWidthsAndTotal,
    onSort: handleSort,
    sortConfig: initialSortConfig,
    onFilter: handleFilter,
    filters,
    onColumnUpdate,
  }), [
    visibleColumns,
    getColumnWidth,
    getColumnWidthsAndTotal,
    handleSort,
    initialSortConfig,
    handleFilter,
    filters,
    onColumnUpdate,
  ]);

  if (isLoading && filteredAndSortedData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 text-blue-500 animate-spin mb-2" />
          <p className="text-sm text-gray-500 font-normal">Building your worklist...</p>
        </div>
      </div>
    );
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
                return getColumnWidth(columnIndex, width);
              };

              return (
                <VariableSizeGrid
                  height={height}
                  width={width}
                  columnCount={visibleColumns.length + 1} // +1 for selection column
                  rowCount={filteredAndSortedData.length + 1} // +1 for header row
                  columnWidth={getColumnWidthWithContainer}
                  rowHeight={getRowHeight}
                  itemData={{
                    ...rowData,
                    containerWidth: width, // Pass container width to cells
                  }}
                  innerElementType={InnerElement}
                >
                  {VirtualizedCell}
                </VariableSizeGrid>
              );
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
  );
} 