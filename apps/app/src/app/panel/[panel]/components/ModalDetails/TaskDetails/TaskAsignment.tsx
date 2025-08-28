import { useOptimistic, useTransition } from 'react'
import { useAuthentication } from '../../../../../../hooks/use-authentication'
import { useMedplumStore } from '@/hooks/use-medplum-store'
import type { WorklistTask } from '@/lib/fhir-to-table-data'
import { cn } from '../../../../../../lib/utils'
import { Tooltip } from '@/components/ui/tooltip'

type AssigneeState = {
  value: unknown
  isPending: boolean
}

const TaskAsignment = ({
  task,
  blockAssignee = false,
}: { task: WorklistTask; blockAssignee: boolean }) => {
  const { user } = useAuthentication()
  const { toggleTaskOwner } = useMedplumStore()
  const [isPending, startTransition] = useTransition()

  const [optimisticState, addOptimistic] = useOptimistic<
    AssigneeState,
    'assign' | 'unassign'
  >({ value: task.owner?.display, isPending: false }, (state, action) => {
    switch (action) {
      case 'assign':
        return { value: user?.name, isPending: true }
      case 'unassign':
        return { value: null, isPending: true }
      default:
        return state
    }
  })

  const handleAssigneeClick = async () => {
    const currentValue = optimisticState.value
    const isCurrentUser =
      String(currentValue || '')
        .toLowerCase()
        .trim() === user?.name?.toLowerCase().trim()

    // Perform the actual action wrapped in transition
    startTransition(async () => {
      // Update optimistic state inside the transition
      if (optimisticState.value && isCurrentUser) {
        addOptimistic('unassign')
      } else {
        addOptimistic('assign')
      }

      // Call the actual API and await it
      await toggleTaskOwner(task.id)
    })
  }

  const currentValue = optimisticState.value
  const isCurrentUser =
    String(currentValue || '')
      .toLowerCase()
      .trim() === user?.name?.toLowerCase().trim()

  const loader = <span className="loading loading-spinner loading-xs" />
  const buttonClassNames = cn('btn btn-outline btn-sm', {
    'btn-error': isCurrentUser && !isPending,
    'btn-primary': !isCurrentUser && !isPending,
    'btn-square': isPending,
  })

  return (
    <div className="flex-shrink-0 p-2  rounded-lg border border-gray-200 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">
            {currentValue ? `Assigned to ${currentValue}` : 'Unassigned'}
          </span>
        </div>

        <Tooltip
          position="left"
          content="This task cannot be assigned through panels."
          show={blockAssignee}
        >
          {currentValue ? (
            <button
              type="button"
              className={buttonClassNames}
              onClick={handleAssigneeClick}
              title={isCurrentUser ? 'Unassign' : 'Reassign to me'}
              disabled={isPending || blockAssignee}
            >
              {isPending ? loader : isCurrentUser ? 'Unassign' : 'Assign to me'}
            </button>
          ) : (
            <button
              type="button"
              className={buttonClassNames}
              onClick={handleAssigneeClick}
              disabled={isPending || blockAssignee}
            >
              {isPending ? loader : 'Assign to me'}
            </button>
          )}
        </Tooltip>
      </div>
    </div>
  )
}

export default TaskAsignment
