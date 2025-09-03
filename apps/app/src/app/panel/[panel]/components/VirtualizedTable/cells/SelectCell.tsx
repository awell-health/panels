'use client'

import { BaseCell } from './BaseCell'
import type { InteractiveCellProps } from './types'
import TaskStatusBadge, {
  isTaskStatus,
} from '../../ModalDetails/TaskDetails/TaskStatusBadge'

interface SelectCellProps extends InteractiveCellProps {
  // Additional props specific to SelectCell can be added here
}

export function SelectCell(props: SelectCellProps) {
  const { value, columnWidth } = props

  return (
    <BaseCell {...props} columnWidth={columnWidth}>
      {value !== null && value !== undefined && value !== '' ? (
        isTaskStatus(String(value)) ? (
          <TaskStatusBadge status={String(value).toLowerCase()} />
        ) : (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-400 text-white">
            {String(value)}
          </span>
        )
      ) : (
        <span className="text-gray-500">-</span>
      )}
    </BaseCell>
  )
}
