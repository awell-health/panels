import type { WorklistTask } from '@/lib/fhir-to-table-data'
import TaskComments from './TaskComments'
import FramePanel from '../FramePanel'
import StaticContent from '../StaticContent'
import ConnectorsSection from './ConnectorsSection'
import TaskAsignment from './TaskAsignment'
import type { CodeableConcept, Coding, TaskInput } from '@medplum/fhirtypes'
import RenderValue, { type RenderableValue } from '../StaticContent/RenderValue'
import { ArrowDown } from 'lucide-react'
import { useMedplum } from '@/contexts/MedplumClientProvider'
import { useState, useEffect } from 'react'
import TaskStatusBadge from './TaskStatusBadge'

interface TaskDetailsProps {
  task: WorklistTask
}

const TaskDetails = ({ task }: TaskDetailsProps) => {
  const VIEWS = ['content', 'resolve-task', 'notes']
  const AHP_CODE = 'awell-hosted-pages'
  const { updateTaskStatus } = useMedplum()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localTask, setLocalTask] = useState<WorklistTask>(task)

  // Sync local task state when prop changes
  useEffect(() => {
    setLocalTask(task)
  }, [task])

  const handleApprove = async () => {
    if (!task.id) return

    setIsUpdating(true)
    setError(null)

    try {
      await updateTaskStatus(task.id, 'completed')
      // Update local task state immediately for better UX
      setLocalTask((prev) => ({ ...prev, status: 'completed' }))
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to approve task'
      setError(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleReject = async () => {
    if (!task.id) return

    setIsUpdating(true)
    setError(null)

    try {
      await updateTaskStatus(task.id, 'cancelled')
      // Update local task state immediately for better UX
      setLocalTask((prev) => ({ ...prev, status: 'cancelled' }))
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to reject task'
      setError(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  function getAwellHostedPagesUrl(code: string) {
    if (!localTask.input) return null

    for (const input of localTask.input) {
      if (input.type?.coding) {
        for (const coding of input.type.coding) {
          if (coding.code === code) {
            return input.valueUrl
          }
        }
      }
    }
    return null
  }

  const isNonAssignableTask = localTask.performerType?.some(
    (performerType: CodeableConcept) =>
      performerType.coding?.some(
        (coding: Coding) =>
          (coding.code === 'PT' || coding.code === 'DKC') &&
          coding.system === 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
      ),
  )

  const isAHPTask = localTask?.code.coding.find(
    (c: Coding) =>
      c.system === 'http://terminology.hl7.org/CodeSystem/task-code' &&
      c.code === 'approve',
  )

  const isDavitaApprovalRejectTask = localTask?.code.coding.find(
    (c: Coding) =>
      c.system === 'http://davita.com/fhir/task-code' &&
      (c.code === 'approval-reject' || c.code === 'approve-reject'),
  )

  const AHP_URL = getAwellHostedPagesUrl(AHP_CODE)
  const renderAHP_URL = () => {
    return (
      <FramePanel
        url={AHP_URL}
        status={localTask.status}
        taskName={localTask.description}
        isNonAssignableTask={isNonAssignableTask}
      />
    )
  }

  const renderApproveReject = () => {
    const matchedDataPayload = localTask.input?.find((input: TaskInput) =>
      input.type?.coding?.some(
        (coding: Coding) => coding.code === 'matched-patient-summary',
      ),
    )

    const incomingDataPayload = localTask.input?.find((input: TaskInput) =>
      input.type?.coding?.some(
        (coding: Coding) => coding.code === 'incoming-payload',
      ),
    )

    const matchedData = JSON.parse(matchedDataPayload?.valueString)
    const incomingData = JSON.parse(incomingDataPayload?.valueString)

    const renderData = (
      data: Record<string, unknown>,
      renderKey: (key: string) => React.ReactNode,
    ) => {
      return (
        <div className="border border-gray-200 rounded-md p-3 flex flex-col gap-2">
          {Object.keys(data).map((key) => (
            <div key={key} className="flex justify-between gap-2 text-xs">
              {renderKey(key)}
              <RenderValue value={data[key] as RenderableValue} />
            </div>
          ))}
        </div>
      )
    }

    const isRequested = task.status === 'requested'

    return (
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
          <div className="font-medium text-gray-900">{task.description}</div>
          <div className="flex items-center gap-2">
            <TaskStatusBadge status={task.status} />
          </div>
        </div>
        {isRequested && (
          <>
            <div>Incoming Data</div>
            {renderData(incomingData, (key) => (
              <span className="text-gray-600">{key}</span>
            ))}
            <div className="flex items-center justify-center">
              <ArrowDown className="h-4 w-4" />
            </div>
          </>
        )}
        <div>Matched Data</div>
        {renderData(matchedData, (key) => {
          const hasKeyMatch = Object.keys(incomingData).includes(key)
          return (
            <span
              className={`text-gray-600 ${hasKeyMatch ? 'text-green-600 font-medium' : ''}`}
            >
              {key}
            </span>
          )
        })}
        {error && (
          <div className="alert alert-error text-sm">
            <span>{error}</span>
          </div>
        )}
        {isRequested && (
          <div className="flex items-center justify-end gap-2">
            <button
              className="btn btn-sm btn-error"
              type="button"
              onClick={handleReject}
              disabled={isUpdating}
            >
              {isUpdating ? 'Rejecting...' : 'Reject'}
            </button>
            <button
              className="btn btn-sm btn-success"
              type="button"
              onClick={handleApprove}
              disabled={isUpdating}
            >
              {isUpdating ? 'Approving...' : 'Approve'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {VIEWS.map((view) => (
        <div
          key={view}
          className={`h-full p-2 border-r border-gray-200 overflow-auto ${
            view === 'content' ? 'w-[36%]' : 'w-[32%]'
          }`}
        >
          {view === 'resolve-task' && (
            <div className="flex flex-col h-full">
              <TaskAsignment
                task={localTask}
                blockAssignee={isNonAssignableTask}
              />
              <div className="flex-1 overflow-hidden">
                {isAHPTask && renderAHP_URL()}
                {isDavitaApprovalRejectTask && renderApproveReject()}
              </div>
            </div>
          )}
          {view === 'content' && (
            <>
              <StaticContent task={localTask} />
              <div className="mt-4">
                <ConnectorsSection
                  task={localTask}
                  showAhpConnector={!!AHP_URL && !isNonAssignableTask}
                />
              </div>
            </>
          )}
          {view === 'notes' && <TaskComments task={localTask} />}
        </div>
      ))}
    </>
  )
}

export default TaskDetails
