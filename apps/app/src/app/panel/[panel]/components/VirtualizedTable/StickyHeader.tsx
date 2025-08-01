'use client'

import { cn } from '@/lib/utils'
import { useStickyGridContext } from './StickyContext'
import { SortableHeaderColumn } from './SortableHeaderColumn'
import { SELECTION_COLUMN_WIDTH, HEADER_HEIGHT } from './constants'
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { Column } from '@/types/panel'
import type { Sort } from '@/types/panel'
import type { Filter } from '@/types/panel'

interface StickyHeaderProps {
  selectedRows: string[]
  toggleSelectAll: () => void
  tableDataLength: number
  getColumnWidth: (columnIndex: number) => number
  sortConfig?: Sort | undefined
  filters?: Filter[]
}

export function StickyHeader({
  selectedRows,
  toggleSelectAll,
  tableDataLength,
  getColumnWidth,
  sortConfig,
  filters,
}: StickyHeaderProps) {
  const {
    columns,
    onSort,
    onFilter,
    onColumnUpdate,
    onColumnDelete,
    getStickyColumnStyles,
  } = useStickyGridContext()

  const getFilterValue = (column: Column) => {
    const filter = filters?.find((f) => f.columnId === column.id)
    if (filter) {
      return filter.value
    }
    const legacyFilter = filters?.find(
      (f) => f.fhirPathFilter?.[0] === column.sourceField,
    )
    if (legacyFilter?.fhirPathFilter) {
      return legacyFilter.fhirPathFilter[1]
    }
    return ''
  }

  return (
    <tr className="sticky top-0 z-40 bg-white shadow-sm text-xs">
      {/* Selection column header */}
      {/* <th
      className="border-r border-b border-gray-200 flex items-center justify-center shrink-0 p-2"
      style={{
        width: SELECTION_COLUMN_WIDTH,
        height: HEADER_HEIGHT,
        minWidth: SELECTION_COLUMN_WIDTH,
        maxWidth: SELECTION_COLUMN_WIDTH,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
      >
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300"
          checked={
            selectedRows.length > 0 && selectedRows.length === tableDataLength
          }
          onChange={toggleSelectAll}
          aria-label="Select all rows"
          title="Select all rows"
        />
      </th> */}

      {/* Column headers */}
      <SortableContext
        items={columns.map((col) => col.id)}
        strategy={horizontalListSortingStrategy}
      >
        {columns.map((column, index) => (
          <th
            key={column.id}
            style={{
              width: getColumnWidth(index),
              minWidth: getColumnWidth(index),
              height: HEADER_HEIGHT,
              ...getStickyColumnStyles(index, false, true),
            }}
            className={cn(
              'border-r border-b border-gray-200',
              column.properties?.display?.locked && 'border-r-orange-200',
            )}
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
              onSort={() => onSort?.(column.id)}
              filterValue={getFilterValue(column)}
              onFilter={(value: string) => onFilter?.(column.id, value)}
              onColumnUpdate={onColumnUpdate || (() => {})}
              onColumnDelete={onColumnDelete}
              isLocked={!!column.properties?.display?.locked}
            />
          </th>
        ))}
      </SortableContext>
    </tr>
  )
}
