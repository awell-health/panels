'use client'

import { getNestedValue } from '@/lib/fhir-path'
import { cn } from '@/lib/utils'
import { CellFactory } from './cells'
import { useStickyGridContext } from './StickyContext'
import { SELECTION_COLUMN_WIDTH, ROW_HEIGHT } from './constants'

interface VirtualizedRowProps {
  index: number
  // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
  row: Record<string, any>
  selectedRows: string[]
  toggleSelectRow: (rowId: string) => void
  // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
  onRowClick: (row: Record<string, any>) => void
  onRowHover: (
    rowIndex: number,
    isHovered: boolean,
    rect: DOMRect | null,
  ) => void
  onPDFClick: (pdfUrl: string, patientName: string) => void
  onTaskClick: (task: string, taskStatus: string, patientName: string) => void
  onAssigneeClick: (taskId: string) => Promise<void>
  currentView: string
  currentUserName?: string
  hoveredRowIndex: number | null
  getColumnWidth: (columnIndex: number) => number
}

export function VirtualizedRow({
  index,
  row,
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
  getColumnWidth,
}: VirtualizedRowProps) {
  const { columns, getStickyColumnStyles } = useStickyGridContext()

  const isHovered = hoveredRowIndex === index

  return (
    <>
      {/* Data columns */}
      {columns.map((column, columnIndex) => (
        <td
          key={column.id}
          className={cn(
            'border-r border-b border-gray-200 cursor-pointer p-2',
            // Only apply background colors to unlocked columns (locked columns handle bg in sticky styles)
            !column.properties?.display?.locked &&
              (isHovered ? 'bg-gray-50' : 'bg-white'),
            column.properties?.display?.locked && 'sticky-column',
          )}
          style={{
            width: getColumnWidth(columnIndex),
            minWidth: getColumnWidth(columnIndex),
            height: ROW_HEIGHT,
            ...getStickyColumnStyles(columnIndex, isHovered),
          }}
          onClick={() => onRowClick(row)}
          onMouseEnter={() => onRowHover(index, true, null)}
          onMouseLeave={() => onRowHover(index, false, null)}
          onKeyDown={(e) => {
            if (e.key === ' ') {
              e.stopPropagation()
              onRowClick(row)
            }
          }}
        >
          <CellFactory
            value={getNestedValue(row, column.sourceField)}
            column={column}
            row={row}
            rowIndex={index}
            columnIndex={columnIndex}
            onPDFClick={onPDFClick}
            onTaskClick={onTaskClick}
            onAssigneeClick={() => onAssigneeClick(row.id)}
            currentView={currentView}
            currentUserName={currentUserName}
          />
        </td>
      ))}
    </>
  )
}
