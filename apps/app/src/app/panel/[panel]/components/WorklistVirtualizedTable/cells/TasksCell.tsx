'use client'

import { formatTasksForPatientView, renderTaskStatus } from '@/lib/task-utils'
import { BaseCell } from './BaseCell'
import type { InteractiveCellProps } from './types'

export function TasksCell(props: InteractiveCellProps) {
  const { value, column, row, onTaskClick, currentView } = props

  return (
    <BaseCell {...props}>
      {column.name === 'Task Status' && value ? (
        renderTaskStatus(
          String(value),
          row.Task,
          row['Patient Name'],
          onTaskClick || (() => {}),
        )
      ) : column.type === 'tasks' &&
        currentView === 'Patient view' &&
        row._raw?.tasks ? (
        formatTasksForPatientView(
          row._raw.tasks,
          row['Patient Name'],
          onTaskClick || (() => {}),
        )
      ) : (
        <div className="truncate">
          {value ? String(value) : <span className="text-gray-500">-</span>}
        </div>
      )}
    </BaseCell>
  )
}
