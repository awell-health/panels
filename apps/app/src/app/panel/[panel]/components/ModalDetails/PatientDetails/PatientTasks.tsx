import { ManualTrackButton } from '@/components/ManualTrackButton'
import type { WorklistTask } from '@/lib/fhir-to-table-data'
import TaskStatusBadge, { taskStatuses } from '../TaskDetails/TaskStatusBadge'
import {
  ArrowDownUp,
  ArrowRight,
  Calendar,
  Check,
  ChevronRightIcon,
  FilterIcon,
  User,
} from 'lucide-react'
import { formatDateTime } from '../../../../../../hooks/use-date-time-format'
import { orderBy, sortBy, startCase } from 'lodash'
import { useState } from 'react'
import type { Task } from '@medplum/fhirtypes'

interface PatientTasksProps {
  patientId: string
  tasks: WorklistTask[]
  setSelectedTask: (task: WorklistTask) => void
}

const PatientTasks: React.FC<PatientTasksProps> = ({
  patientId,
  tasks,
  setSelectedTask,
}) => {
  const ALL_STATUS_FILTER = 'all-status'
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [filter, setFilter] = useState<string>(ALL_STATUS_FILTER)

  const getTaskPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'badge-error'
      case 'medium':
        return 'badge-warning'
      case 'low':
        return 'badge-success'
      default:
        return 'badge-neutral'
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === ALL_STATUS_FILTER) return true
    return task.status === filter
  })

  const sortedTasks = orderBy(filteredTasks, 'authoredOn', order)

  const ascLabel = (
    <span className="flex items-center gap-1">
      Old <ArrowRight className="w-3 h-3" /> New
    </span>
  )
  const descLabel = (
    <span className="flex items-center gap-1">
      New <ArrowRight className="w-3 h-3" /> Old
    </span>
  )

  const getItemLabel = (isSelected: boolean) => {
    return isSelected ? <Check className="w-3 h-3" /> : <span className="w-3" />
  }

  if (tasks.length === 0) {
    return (
      <div className="w-full p-8 flex items-center justify-center">
        <div className="font-medium text-gray-900">No tasks found</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <div className="font-medium text-gray-900">Tasks list</div>
        <ManualTrackButton patientId={patientId} />
      </div>
      <div className="border rounded-md p-2  border-gray-200 flex gap-2">
        <div className="dropdown">
          <button
            type="button"
            tabIndex={0}
            className="btn btn-xs btn-outline btn-default"
          >
            <ArrowDownUp className="w-3 h-3" />{' '}
            {order === 'asc' ? ascLabel : descLabel}
          </button>
          <ul
            // tabIndex={0}
            className="dropdown-content menu bg-base-100 rounded-box z-1 w-30 shadow p-1 text-xs"
          >
            <li>
              <button
                type="button"
                onClick={() => {
                  setOrder('asc')
                  ;(document.activeElement as HTMLElement)?.blur()
                }}
              >
                {getItemLabel(order === 'asc')} {ascLabel}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setOrder('desc')
                  ;(document.activeElement as HTMLElement)?.blur()
                }}
              >
                {getItemLabel(order === 'desc')} {descLabel}
              </button>
            </li>
          </ul>
        </div>
        <div className="dropdown">
          <button type="button" tabIndex={0} className="btn btn-xs btn-outline">
            <FilterIcon className="w-3 h-3" /> {startCase(filter)}
          </button>
          <ul
            // tabIndex={0}
            className="dropdown-content menu bg-base-100 rounded-box z-1 w-36 shadow p-1 text-xs"
          >
            <li>
              <button
                type="button"
                onClick={() => {
                  setFilter(ALL_STATUS_FILTER)
                  ;(document.activeElement as HTMLElement)?.blur()
                }}
              >
                {getItemLabel(filter === ALL_STATUS_FILTER)}
                All Status
              </button>
            </li>
            {taskStatuses.map((status) => (
              <li key={status}>
                <button
                  type="button"
                  onClick={() => {
                    setFilter(status)
                    ;(document.activeElement as HTMLElement)?.blur()
                  }}
                >
                  {getItemLabel(filter === status)}
                  {startCase(status)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {sortedTasks.map((task) => {
          const isCompleted = task.status === 'completed'

          return (
            // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
            <div
              key={task.id}
              onClick={() => {
                setSelectedTask(task)
              }}
            >
              <div className="flex justify-between p-2 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                <div className="flex justify-between w-full items-center">
                  <div className="font-medium text-gray-900 flex flex-col gap-1">
                    {task.description}
                    <div className="flex items-center gap-2">
                      <TaskStatusBadge status={task.status} />
                      <span
                        className={`badge badge-outline badge-xs ${getTaskPriorityBadge(
                          task.priority ?? '',
                        )}`}
                      >
                        {startCase(task.priority)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600 font-normal">
                      <Calendar className="w-3 h-3" /> Created:{' '}
                      {formatDateTime(task.authoredOn)}
                    </div>
                    {isCompleted && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 font-normal">
                        <Calendar className="w-3 h-3" /> Completed:{' '}
                        {formatDateTime(task.lastModified)}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-600 font-normal">
                      <User className="w-3 h-3" />
                      {task.owner
                        ? `Assigned to: ${task.owner?.display}`
                        : 'Unassigned'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRightIcon className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PatientTasks
