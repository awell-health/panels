'use client'

import { getNestedValue, getNestedValueFromBundle } from '@/lib/fhir-path'
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
  getColumnWidth: (columnIndex: number) => number
  isFHIRBundle: boolean
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
  getColumnWidth,
  isFHIRBundle,
}: VirtualizedRowProps) {
  const { columns, getStickyColumnStyles } = useStickyGridContext()

  return (
    <>
      {/* Data columns */}
      {columns.map((column, columnIndex) => {
        const getValue = isFHIRBundle
          ? getNestedValueFromBundle(row.resource, column.sourceField ?? '')
          : getNestedValue(row, column.sourceField)
        return (
          <td
            key={column.id}
            headers={`header-${column.id}`}
            className={cn(
              'border-r border-b border-gray-200 cursor-pointer p-2 bg-white',
              // Sticky columns get their background from CSS hover effects
              column.properties?.display?.locked && 'sticky-column',
            )}
            style={{
              width: getColumnWidth(columnIndex),
              minWidth: getColumnWidth(columnIndex),
              height: ROW_HEIGHT,
              ...getStickyColumnStyles(columnIndex),
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
              value={getValue}
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
        )
      })}
    </>
  )
}
