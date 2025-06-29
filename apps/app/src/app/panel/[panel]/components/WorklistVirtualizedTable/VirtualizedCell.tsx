"use client";

import { cn } from "@/lib/utils";
import { CellFactory } from "./cells";
import { useStickyGridContext } from "./StickyContext";
import { SELECTION_COLUMN_WIDTH, HEADER_HEIGHT } from "./constants";
import { SortableHeaderColumn } from "./SortableHeaderColumn";

interface VirtualizedCellProps {
  rowIndex: number;
  columnIndex: number;
  style: React.CSSProperties;
  data: {
    rows: Record<string, any>[];
    selectedRows: string[];
    toggleSelectRow: (rowId: string) => void;
    onRowClick: (row: Record<string, any>) => void;
    onRowHover: (rowIndex: number, isHovered: boolean, rect: DOMRect | null) => void;
    onPDFClick: (pdfUrl: string, patientName: string) => void;
    onTaskClick: (task: string, taskStatus: string, patientName: string) => void;
    onAssigneeClick: (taskId: string) => void;
    currentView: string;
    currentUserName?: string;
    // Header-specific data
    toggleSelectAll: () => void;
    tableDataLength: number;
    containerWidth?: number;
  };
}

export function VirtualizedCell({ rowIndex, columnIndex, style, data }: VirtualizedCellProps) {
  const { columns, onSort, sortConfig, onFilter, filters, onColumnUpdate } = useStickyGridContext();
  const {
    rows,
    selectedRows,
    toggleSelectRow,
    onRowClick,
    onRowHover,
    onPDFClick,
    onTaskClick,
    onAssigneeClick,
    currentView,
    currentUserName,
    toggleSelectAll,
    tableDataLength,
  } = data;

  // Selection column (columnIndex === 0)
  if (columnIndex === 0) {
    if (rowIndex === 0) {
      // Header select all checkbox
      return (
        <div
          style={style}
          className="bg-white border-r border-b border-gray-200 flex items-center justify-center sticky top-0 z-10"
        >
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={selectedRows.length > 0 && selectedRows.length === tableDataLength}
            onChange={toggleSelectAll}
            aria-label="Select all rows"
            title="Select all rows"
          />
        </div>
      );
    } else {
      // Data row checkbox
      const dataRowIndex = rowIndex - 1;
      const row = rows[dataRowIndex];

      if (!row) return null;

      return (
        <div
          style={style}
          className="bg-white border-r border-b border-gray-200 flex items-center justify-center hover:bg-gray-50"
          onClick={(e) => {
            e.stopPropagation();
            onRowClick(row);
          }}
          onMouseEnter={() => onRowHover(dataRowIndex, true, null)}
          onMouseLeave={() => onRowHover(dataRowIndex, false, null)}
        >
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={selectedRows.includes(row.id)}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onChange={(e) => {
              e.stopPropagation();
              toggleSelectRow(row.id);
            }}
          />
        </div>
      );
    }
  }

  // Get the column for data columns (columnIndex > 0)
  const column = columns[columnIndex - 1];
  if (!column) return null;

  // Header row (rowIndex === 0)
  if (rowIndex === 0) {
    return (
      <div style={style} className="relative border-r border-b border-gray-200">
        <SortableHeaderColumn
          column={column}
          index={columnIndex - 1}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          sortConfig={sortConfig}
          onSort={() => onSort?.(column.key)}
          filterValue={filters?.find(f => f.key === column.key)?.value ?? ''}
          onFilter={(value: string) => onFilter?.(column.key, value)}
          onColumnUpdate={onColumnUpdate || (() => { })}
        />
      </div>
    );
  }

  // Data cell (rowIndex > 0, columnIndex > 0)
  const dataRowIndex = rowIndex - 1;
  const row = rows[dataRowIndex];

  if (!row) return null;

  return (
    <div
      style={style}
      className={cn(
        "bg-white border-r border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
      )}
      onClick={() => onRowClick(row)}
      onMouseEnter={() => onRowHover(dataRowIndex, true, null)}
      onMouseLeave={() => onRowHover(dataRowIndex, false, null)}
    >
      <CellFactory
        value={row[column.key] || row[column.name]}
        column={column}
        row={row}
        rowIndex={dataRowIndex}
        columnIndex={columnIndex - 1}
        onPDFClick={onPDFClick}
        onTaskClick={onTaskClick}
        onAssigneeClick={() => onAssigneeClick(row.id)}
        currentView={currentView}
        currentUserName={currentUserName}
      />
    </div>
  );
} 