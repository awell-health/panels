import { useOptimistic, useTransition } from 'react'
import { useAuthentication } from '../../../../../../hooks/use-authentication'
import {
  useMedplumStore,
  type WorklistTask,
} from '../../../../../../hooks/use-medplum-store'
import { LoaderCircle } from 'lucide-react'
import { cn } from '../../../../../../lib/utils'

type AssigneeState = {
  value: unknown
  isPending: boolean
}

const TaskAsignment = ({ task }: { task: WorklistTask }) => {
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

  const loader = <LoaderCircle className="w-4 h-4 animate-spin" />
  const buttonClassNames = cn(
    'group flex items-center gap-1 px-3 py-1 rounded text-xs transition-colors cursor-pointer border',
    {
      'text-red-600 border-red-200 hover:bg-red-50':
        isCurrentUser && !isPending,
      'text-blue-600 border-blue-200 hover:bg-blue-50':
        !isCurrentUser && !isPending,
      'text-gray-600 border-0': isPending,
    },
  )

  return (
    <div className="flex-shrink-0 p-2  rounded-lg border border-gray-200 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">
            {currentValue ? `Assigned to ${currentValue}` : 'Unassigned'}
          </span>
        </div>

        {currentValue ? (
          <button
            type="button"
            className={buttonClassNames}
            onClick={handleAssigneeClick}
            title={isCurrentUser ? 'Unassign' : 'Reassign to me'}
            disabled={isPending}
          >
            {isPending ? loader : isCurrentUser ? 'Unassign' : 'Assign to me'}
          </button>
        ) : (
          <button
            type="button"
            className={buttonClassNames}
            onClick={handleAssigneeClick}
            disabled={isPending}
          >
            {isPending ? loader : 'Assign to me'}
          </button>
        )}
      </div>
    </div>
  )
}

export default TaskAsignment
