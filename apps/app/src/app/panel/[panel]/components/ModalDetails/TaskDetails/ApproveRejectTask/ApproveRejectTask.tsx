import type { WorklistTask } from '@/lib/fhir-to-table-data'
import type { TaskInput, Coding, HumanName, Quantity } from '@medplum/fhirtypes'
import RenderValue, {
  type RenderableValue,
} from '../../StaticContent/RenderValue'
import {
  ArrowDown,
  Check,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLink,
} from 'lucide-react'
import { useMedplum } from '@/contexts/MedplumClientProvider'
import { useState } from 'react'
import clsx from 'clsx'
import Link from 'next/link'
import MatchData from './MatchData'
import GenericData from './GenericData'

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

  const isRequested = task.status === 'requested'

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-auto">
      <GenericData task={task} />
      <MatchData task={task} />
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
