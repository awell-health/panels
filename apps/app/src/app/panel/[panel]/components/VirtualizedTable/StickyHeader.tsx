'use client'

import { cn } from '@/lib/utils'
import { useStickyGridContext } from './StickyContext'
import { SortableHeaderColumn } from './SortableHeaderColumn'
import { SELECTION_COLUMN_WIDTH, HEADER_HEIGHT } from './constants'
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { Column, ColumnVisibilityContext } from '@/types/panel'
import type { Sort } from '@/types/panel'
import type { Filter } from '@/types/panel'

interface StickyHeaderProps {
  selectedRows: string[]
  toggleSelectAll: () => void
  tableDataLength: number
  getColumnWidth: (columnIndex: number) => number
  sortConfig?: Sort | undefined
  filters?: Filter[]
  columnVisibilityContext: ColumnVisibilityContext
}

export function StickyHeader({
  selectedRows,
  toggleSelectAll,
  tableDataLength,
  getColumnWidth,
  sortConfig,
  filters,
  columnVisibilityContext,
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
              ...getStickyColumnStyles(index, true),
            }}
            className={cn(
              'border-r border-b border-gray-200',
              column.properties?.display?.locked && 'sticky-column',
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
              columnVisibilityContext={columnVisibilityContext}
            />
          </th>
        ))}
      </SortableContext>
    </tr>
  )
}
