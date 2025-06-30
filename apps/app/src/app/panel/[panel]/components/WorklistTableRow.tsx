'use client'

import { useDateTimeFormat } from '@/hooks/use-date-time-format'
import { getNestedValue } from '@/lib/fhir-path'
import { formatTasksForPatientView, renderTaskStatus } from '@/lib/task-utils'
import type { ColumnDefinition } from '@/types/worklist'
import { File } from 'lucide-react'
import { useRef } from 'react'
import { TableCell, TableRow } from '../../../../components/ui/table'
import { cn } from '../../../../lib/utils'

interface WorklistTableRowWithHoverProps {
  rowIndex: number
  onRowHover: (
    rowIndex: number,
    isHovered: boolean,
    rect: DOMRect | null,
  ) => void
  selectedRows: string[]
  toggleSelectRow: (rowId: string) => void
  columns: ColumnDefinition[]
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  row: Record<string, any>
  handlePDFClick: (pdfUrl: string, patientName: string) => void
  handleTaskClick: (
    task: string,
    taskStatus: string,
    patientName: string,
  ) => void
  handleAssigneeClick: () => void
  currentView: string
  // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
  onRowClick: (row: Record<string, any>) => void
  currentUserName?: string
}

export default function WorklistTableRow({
  rowIndex,
  onRowHover,
  selectedRows,
  toggleSelectRow,
  columns,
  handlePDFClick,
  handleTaskClick,
  handleAssigneeClick,
  onRowClick,
  currentView,
  row,
  currentUserName,
}: WorklistTableRowWithHoverProps) {
  const rowRef = useRef<HTMLTableRowElement>(null)
  const { formatDateTime } = useDateTimeFormat()

  const handleRowClick = () => {
    onRowClick(row)
  }

  // Handle hover events
  const handleMouseEnter = () => {
    if (rowRef.current) {
      onRowHover(rowIndex, true, rowRef.current.getBoundingClientRect())
    }
  }

  const handleMouseLeave = () => {
    onRowHover(rowIndex, false, null)
  }

  const truncateText = (text: string, maxLength = 30): string => {
    if (text.length <= maxLength) return text
    return `${text.substring(0, maxLength)}...`
  }

  const getDisplayValue = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const renderColumnValue = (column: ColumnDefinition, colIndex: number) => {
    const columnValue = getNestedValue(row, column.key)
    const fullDisplayValue = getDisplayValue(columnValue)

    return (
      <TableCell
        key={`${rowIndex}-${colIndex}`}
        className={cn(
          'py-1 px-2 border-r border-gray-200 text-xs max-w-[200px]',
          'truncate',
        )}
        title={fullDisplayValue}
      >
        {column.name === 'Discharge Summary' && columnValue ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm text-xs h-6 px-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
            onClick={(e) => {
              e.stopPropagation()
              handlePDFClick(columnValue, row['Patient Name'] || 'Patient')
            }}
          >
            <File className="h-3 w-3 mr-1" />
            {columnValue}
          </button>
        ) : column.type === 'date' && columnValue ? (
          formatDateTime(columnValue)
        ) : column.name === 'Task Status' && columnValue ? (
          renderTaskStatus(
            columnValue,
            row.Task,
            row['Patient Name'],
            handleTaskClick,
          )
        ) : column.type === 'tasks' &&
          currentView === 'Patient view' &&
          row._raw?.tasks ? (
          formatTasksForPatientView(
            row._raw.tasks,
            row['Patient Name'],
            handleTaskClick,
          )
        ) : column.type === 'array' ? (
          <div className="flex flex-wrap gap-1">
            {Array.isArray(columnValue) ? (
              columnValue.map((item: unknown, index: number) => {
                const itemKey =
                  typeof item === 'object' ? JSON.stringify(item) : String(item)
                return (
                  <span
                    key={`${rowIndex}-${colIndex}-${itemKey}`}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {typeof item === 'object'
                      ? Object.values(item as Record<string, unknown>).join(
                          ', ',
                        )
                      : String(item)}
                  </span>
                )
              })
            ) : (
              <span className="text-gray-500">-</span>
            )}
          </div>
        ) : column.type === 'assignee' ? (
          <div className="flex items-center">
            {columnValue ? (
              (() => {
                // TODO: Replace with proper id
                const isCurrentUser =
                  columnValue.toLowerCase().trim() ===
                  currentUserName?.toLowerCase().trim()
                return (
                  <button
                    type="button"
                    className={`group flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                      isCurrentUser
                        ? 'text-gray-700 hover:text-red-600 hover:bg-red-50'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAssigneeClick()
                    }}
                    title={isCurrentUser ? 'Unassign' : 'Reassign to me'}
                  >
                    <span>{columnValue}</span>
                    {isCurrentUser ? (
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500">
                        ×
                      </span>
                    ) : (
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                        →
                      </span>
                    )}
                  </button>
                )
              })()
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm text-xs h-6 px-2 text-blue-500 hover:text-blue-600 border-blue-200"
                onClick={(e) => {
                  e.stopPropagation()
                  handleAssigneeClick()
                }}
              >
                Assign to me
              </button>
            )}
          </div>
        ) : (
          <div className="truncate">{truncateText(fullDisplayValue)}</div>
        )}
      </TableCell>
    )
  }

  return (
    <TableRow
      ref={rowRef}
      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleRowClick}
      data-row-id={rowIndex}
    >
      <TableCell className="w-10 p-0 pl-3">
        <div className="h-10 flex items-center justify-center">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={selectedRows.includes(row.id)}
            onClick={(e) => {
              e.stopPropagation()
            }}
            onChange={(e) => {
              e.stopPropagation()
              toggleSelectRow(row.id)
            }}
          />
        </div>
      </TableCell>
      {columns.map((column, colIndex) => renderColumnValue(column, colIndex))}
      <TableCell className="p-0" colSpan={2} />
    </TableRow>
  )
}
