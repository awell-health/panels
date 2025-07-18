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
  const { value } = props

  return (
    <BaseCell {...props}>
      {value !== null && value !== undefined && value !== '' ? (
        isTaskStatus(String(value)) ? (
          <TaskStatusBadge status={String(value).toLowerCase()} />
        ) : (
          <div className="badge badge-soft badge-xs text-white bg-gray-400">
            {String(value)}
          </div>
        )
      ) : (
        <span className="text-gray-500">-</span>
      )}
    </BaseCell>
  )
}
