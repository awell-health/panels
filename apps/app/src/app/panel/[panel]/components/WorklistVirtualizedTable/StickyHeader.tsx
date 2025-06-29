"use client";

import { useStickyGridContext } from "./StickyContext";
import { SortableHeaderColumn } from "./SortableHeaderColumn";
import { SELECTION_COLUMN_WIDTH, HEADER_HEIGHT } from "./constants";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";

interface StickyHeaderProps {
  selectedRows: string[];
  toggleSelectAll: () => void;
  tableDataLength: number;
  containerWidth: number;
  getColumnWidth: (columnIndex: number, containerWidth?: number) => number;
}

export function StickyHeader({
  selectedRows,
  toggleSelectAll,
  tableDataLength,
  containerWidth,
  getColumnWidth
}: StickyHeaderProps) {
  const { columns, onSort, sortConfig, onFilter, filters, onColumnUpdate } = useStickyGridContext();

  return (
    <div
      className="sticky top-0 z-20 shadow-sm flex"
      style={{ height: HEADER_HEIGHT }}
    >
      {/* Selection column header */}
      <div
        className="bg-white border-r border-gray-200 flex items-center justify-center"
        style={{ width: SELECTION_COLUMN_WIDTH }}
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

      {/* Column headers */}
      <SortableContext
        items={columns.map(col => col.id)}
        strategy={horizontalListSortingStrategy}
      >
        {columns.map((column, index) => (
          <div
            key={column.id}
            style={{ width: getColumnWidth(index + 1, containerWidth) }}
            className="border-r border-b border-gray-200"
          >
            <SortableHeaderColumn
              column={column}
              index={index}
              style={{
                position: 'relative',
                width: '100%',
                height: HEADER_HEIGHT,
              }}
              sortConfig={sortConfig}
              onSort={() => onSort?.(column.key)}
              filterValue={filters?.find(f => f.key === column.key)?.value ?? ''}
              onFilter={(value: string) => onFilter?.(column.key, value)}
              onColumnUpdate={onColumnUpdate || (() => { })}
            />
          </div>
        ))}
      </SortableContext>
    </div>
  );
} 