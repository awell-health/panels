'use client'

import { File } from 'lucide-react'
import { ArrayCell } from './ArrayCell'
import { AssigneeCell } from './AssigneeCell'
import { BaseCell } from './BaseCell'
import { DateCell } from './DateCell'
import type { InteractiveCellProps } from './types'
import { DateTimeCell } from './DateTimeCell'

interface CellFactoryProps extends InteractiveCellProps {
  // Additional factory-specific props can be added here
}

export function CellFactory(props: CellFactoryProps) {
  const { column, value, row, onPDFClick } = props

  // Handle special case for Discharge Summary column with PDF files
  if (column.name === 'Discharge Summary' && value) {
    return (
      <BaseCell {...props}>
        <button
          type="button"
          className="btn btn-ghost btn-sm text-xs h-6 px-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
          onClick={(e) => {
            e.stopPropagation()
            onPDFClick?.(String(value), row['Patient Name'] || 'Patient')
          }}
        >
          <File className="h-3 w-3 mr-1" />
          {String(value)}
        </button>
      </BaseCell>
    )
  }

  // Route to appropriate cell type based on column type
  switch (column.type) {
    case 'date':
      return <DateCell {...props} />

    case 'datetime':
      return <DateTimeCell {...props} />

    case 'multi_select':
      return <ArrayCell {...props} />

    case 'user':
      return <AssigneeCell {...props} />

    case 'boolean':
      return (
        <BaseCell {...props}>
          {value !== null ? (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${value
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
                }`}
            >
              {value ? 'Yes' : 'No'}
            </span>
          ) : (
            <span className="text-gray-500">-</span>
          )}
        </BaseCell>
      )

    case 'number':
      return (
        <BaseCell {...props} className="justify-end">
          {value !== null ? (
            String(value)
          ) : (
            <span className="text-gray-500">-</span>
          )}
        </BaseCell>
      )

    default:
      return <BaseCell {...props} />
  }
}
