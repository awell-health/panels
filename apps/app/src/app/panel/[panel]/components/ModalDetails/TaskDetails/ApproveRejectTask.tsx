import type { WorklistTask } from '@/lib/fhir-to-table-data'
import type { TaskInput, Coding } from '@medplum/fhirtypes'
import RenderValue, { type RenderableValue } from '../StaticContent/RenderValue'
import { ArrowDown, Check } from 'lucide-react'
import { useMedplum } from '@/contexts/MedplumClientProvider'
import { useState } from 'react'
import TaskStatusBadge from './TaskStatusBadge'
import clsx from 'clsx'

interface ApproveRejectTaskProps {
  task: WorklistTask
}

const ApproveRejectTask = ({ task }: ApproveRejectTaskProps) => {
  const { updateTaskStatus } = useMedplum()
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    if (!task.id) return

    setIsUpdating(true)
    setError(null)

    try {
      await updateTaskStatus(task.id, 'completed')
      setIsSubmitted(true)
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
      setIsSubmitted(true)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to reject task'
      setError(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  const matchedDataPayload = task.input?.find((input: TaskInput) =>
    input.type?.coding?.some(
      (coding: Coding) => coding.code === 'matched-patient-summary',
    ),
  )

  const incomingDataPayload = task.input?.find((input: TaskInput) =>
    input.type?.coding?.some(
      (coding: Coding) => coding.code === 'incoming-payload',
    ),
  )

  const matchedData = JSON.parse(matchedDataPayload?.valueString || '{}')
  const incomingData = JSON.parse(incomingDataPayload?.valueString || '{}')

  const renderData = (
    title: string,
    data: Record<string, unknown>,
    keysMatch: string[],
  ) => {
    return (
      <div className="flex flex-col gap-2 border border-gray-200 rounded-md">
        <div className="p-3 border-b border-gray-200">{title}</div>
        <div className="flex flex-col gap-2 p-3">
          {Object.keys(data).map((key) => {
            const hasKeyMatch = keysMatch.includes(key)
            return (
              <div
                key={key}
                className={clsx('flex justify-between gap-2 text-xs')}
              >
                <span
                  className={clsx(
                    !hasKeyMatch && 'text-gray-600',
                    hasKeyMatch && 'text-accent font-medium',
                  )}
                >
                  {key}
                </span>
                <RenderValue value={data[key] as RenderableValue} />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const isRequested = task.status === 'requested'

  return (
    <div className="flex flex-col gap-2">
      {renderData('Incoming Data', incomingData, Object.keys(matchedData))}
      <div className="flex items-center justify-center">
        <ArrowDown className="h-4 w-4 text-accent" />
      </div>
      {renderData('Matched Data', matchedData, Object.keys(incomingData))}
      {error && (
        <div className="alert alert-error text-sm">
          <span>{error}</span>
        </div>
      )}
      {isRequested && !isSubmitted && (
        <div className="flex items-center justify-end gap-2">
          {!isUpdating && (
            <>
              <button
                className="btn btn-sm btn-error"
                type="button"
                onClick={handleReject}
                disabled={isUpdating}
              >
                {'Reject'}
              </button>
              <button
                className="btn btn-sm btn-success"
                type="button"
                onClick={handleApprove}
                disabled={isUpdating}
              >
                {isUpdating ? 'Approving...' : 'Approve'}
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-end">
        {isUpdating && <div className="loading loading-spinner loading-xs" />}
        {isSubmitted && !isUpdating && (
          <div className="text-xs flex items-center text-success gap-1">
            <Check className="h-4 w-4" />
            Submitted
          </div>
        )}
      </div>
    </div>
  )
}

export default ApproveRejectTask
