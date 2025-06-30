"use client";

import { getNestedValue } from "@/lib/fhir-path";
import { cn } from "@/lib/utils";
import { CellFactory } from "./cells";
import { useStickyGridContext } from "./StickyContext";

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
    hoveredRowIndex: number | null;
    // Header-specific data
    toggleSelectAll: () => void;
    tableDataLength: number;
    containerWidth?: number;
  };
}

export function VirtualizedCell({ rowIndex, columnIndex, style, data }: VirtualizedCellProps) {
  const { columns } = useStickyGridContext();
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
    hoveredRowIndex,
  } = data;

  // Skip header row - it's rendered in the custom inner element
  if (rowIndex === 0) {
    return null;
  }

  // Selection column (columnIndex === 0)
  if (columnIndex === 0) {
    // Data row checkbox
    const dataRowIndex = rowIndex - 1;
    const row = rows[dataRowIndex];

    if (!row) return null;

    const isHovered = hoveredRowIndex === dataRowIndex;

    return (
      <div
        style={style}
        className={cn(
          "border-r border-b border-gray-200 flex items-center justify-center cursor-pointer",
          isHovered ? "bg-gray-50" : "bg-white"
        )}
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

  // Get the column for data columns (columnIndex > 0)
  const column = columns[columnIndex - 1];
  if (!column) return null;

  // Data cell (rowIndex > 0, columnIndex > 0)
  const dataRowIndex = rowIndex - 1;
  const row = rows[dataRowIndex];

  if (!row) return null;

  const isHovered = hoveredRowIndex === dataRowIndex;

  return (
    <div
      style={style}
      className={cn(
        "border-r border-b border-gray-200 cursor-pointer",
        isHovered ? "bg-gray-50" : "bg-white"
      )}
      onClick={() => onRowClick(row)}
      onMouseEnter={() => onRowHover(dataRowIndex, true, null)}
      onMouseLeave={() => onRowHover(dataRowIndex, false, null)}
    >
      <CellFactory
        value={getNestedValue(row, column.key)}
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