"use client";

import { getNestedValue, isMatchingFhirPathCondition } from "@/lib/fhir-path";
import type { ColumnDefinition, SortConfig } from "@/types/worklist";
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { Loader2 } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { SortableColumnHeader } from "./WorklistSortableColumnHeader";
import WorklistTableRow from "./WorklistTableRow";

interface TableFilter {
  key: string;
  value: string;
}

interface WorklistTableProps {
  isLoading: boolean;
  tableContainerRef?: React.RefObject<HTMLDivElement>;
  selectedRows: number[];
  toggleSelectAll: () => void;
  worklistColumns: ColumnDefinition[];
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  tableData: Record<string, any>[];
  handlePDFClick: () => void;
  handleTaskClick: () => void;
  handleDragEnd?: (event: DragEndEvent) => void;
  handleRowHover: () => void;
  toggleSelectRow: (row: number) => void;
  setIsAddingIngestionSource: (open: boolean) => void;
  handleAssigneeClick: (taskId: string) => void;
  onColumnUpdate: (updates: Partial<ColumnDefinition>) => void;
  onSortConfigUpdate: (sortConfig: SortConfig | undefined) => void;
  currentView: string;
  filters: TableFilter[];
  onFiltersChange: (filters: TableFilter[]) => void;
  initialSortConfig: SortConfig | null;
}


export default function WorklistTable({
  isLoading,
  tableContainerRef,
  selectedRows,
  toggleSelectAll,
  worklistColumns,
  tableData,
  handlePDFClick,
  handleTaskClick,
  handleRowHover,
  toggleSelectRow,
  setIsAddingIngestionSource,
  handleAssigneeClick,
  onColumnUpdate,
  onSortConfigUpdate,
  currentView,
  handleDragEnd,
  filters,
  onFiltersChange,
  initialSortConfig
}: WorklistTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(initialSortConfig);
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

  const filteredAndSortedData = useMemo(() => {
    // First apply filters
    let filteredData = tableData;
    if (filters && filters.length > 0) {
      filteredData = tableData.filter(row => {
        return filters.every(filter => {
          // TODO this is very basic, we need to support more complex FHIRPath expressions
          const fhirPath = `${filter.key}.lower() = '${filter.value.toLowerCase()}'`;
          return isMatchingFhirPathCondition(row, fhirPath);
        });
      });
    }

    // Then apply sorting
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {

      const aValue = getNestedValue(a, sortConfig.key);
      const bValue = getNestedValue(b, sortConfig.key);

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      return sortConfig.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [tableData, sortConfig, filters]);

  const handleSort = (columnKey: string) => {

    const getSortConfig = (current: SortConfig | null): SortConfig | undefined => {
      if (current?.key === columnKey) {
        return { key: columnKey, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      if (!current || current.key !== columnKey) {
        return { key: columnKey, direction: 'desc' };
      }
      if (current.direction === 'asc') {
        return { key: columnKey, direction: 'desc' };
      }
      return undefined;
    }
    const newSortConfig = getSortConfig(sortConfig);
    if (newSortConfig) {
      setSortConfig(newSortConfig);

    }
    onSortConfigUpdate(newSortConfig);
  };

  const handleFilter = (columnKey: string, value: string) => {
    const newFilters = filters ? filters.filter(f => f.key !== columnKey) : [];
    if (value) {
      newFilters.push({ key: columnKey, value });
    }
    onFiltersChange(newFilters);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const column = visibleColumns.find(col => col.id === active.id);
    setActiveColumn(column || null);
  };

  const handleDragEndWithStart = (event: DragEndEvent) => {
    setActiveColumn(null);
    handleDragEnd?.(event);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  )

  // Get type icon for drag overlay
  const getTypeIcon = (column: ColumnDefinition) => {
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
  }

  return (
    <div className="h-full w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEndWithStart}
        modifiers={[restrictToHorizontalAxis]}
      >
        <div className="h-full" ref={tableContainerRef}>
          <Table className="worklist-table border-collapse">
            <TableHeader className="shadow-sm">
              <TableRow className="border-b border-gray-200">
                <TableHead className="w-10 p-0 pl-3 bg-white sticky top-0 shadow-sm">
                  <div className="h-10 flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={selectedRows.length > 0 && selectedRows.length === tableData.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all rows"
                      title="Select all rows"
                    />
                  </div>
                </TableHead>
                {visibleColumns.map((column) => (
                  <SortableColumnHeader
                    key={column.id}
                    column={column}
                    index={visibleColumns.indexOf(column)}
                    sortConfig={sortConfig}
                    onSort={() => handleSort(column.key)}
                    filterValue={filters?.find(f => f.key === column.key)?.value ?? ''}
                    onFilter={(value) => handleFilter(column.key, value)}
                    onColumnUpdate={onColumnUpdate}
                  />
                ))}
                <TableHead className="p-0 w-full bg-white sticky top-0 shadow-sm" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && filteredAndSortedData.length === 0 ? (
                <TableRow className="border-b border-gray-200">
                  <TableCell colSpan={visibleColumns.length + 3} className="h-32">
                    <div className="h-full flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" aria-label="Loading" />
                        <p className="text-sm text-gray-500 font-normal">Building your worklist...</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedData.length > 0 ? (
                filteredAndSortedData.map((row, rowIndex) => (
                  <WorklistTableRow
                    key={String(row.id ?? rowIndex)}
                    row={row}
                    rowIndex={rowIndex}
                    handleAssigneeClick={() => handleAssigneeClick(row["id"])}
                    columns={visibleColumns}
                    selectedRows={selectedRows}
                    toggleSelectRow={toggleSelectRow}
                    handlePDFClick={handlePDFClick}
                    handleTaskClick={handleTaskClick}
                    currentView={currentView}
                    onRowHover={handleRowHover}
                  />
                ))
              ) : (
                <TableRow className="border-b border-gray-200 hover:bg-gray-50">
                  <TableCell className="w-10 p-0 pl-3">
                    <div className="h-10 flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={false}
                        onChange={() => { }}
                        disabled
                        aria-label="No rows to select"
                      />
                    </div>
                  </TableCell>
                  {visibleColumns.map((column) => (
                    <TableCell
                      key={`empty-${column.id}`}
                      className="py-1 px-2 border-r border-gray-200 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]"
                    />
                  ))}
                  <TableCell className="p-2" colSpan={2} />
                </TableRow>
              )}
              {/* Always add the "Add data" row at the bottom */}
              <TableRow className="border-b border-gray-200 hover:bg-gray-50">
                <TableCell className="w-10 p-0 pl-3">
                  <div className="h-10 flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={false}
                      onChange={() => { }}
                      disabled
                      aria-label="Add data row"
                    />
                  </div>
                </TableCell>
                {visibleColumns.map((column) => (
                  <TableCell
                    key={`add-data-${column.id}`}
                    className="py-1 px-2 border-r border-gray-200 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]"
                  >
                    {column === visibleColumns[0] && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-xs font-normal h-6 px-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => setIsAddingIngestionSource(true)}
                      >
                        + Add data
                      </button>
                    )}
                  </TableCell>
                ))}
                <TableCell className="p-2" colSpan={2} />
              </TableRow>
            </TableBody>
          </Table>
        </div>

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
    </div>
  )
}