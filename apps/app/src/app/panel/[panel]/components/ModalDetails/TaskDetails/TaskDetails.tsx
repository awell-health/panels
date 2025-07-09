import type { WorklistTask } from '@/hooks/use-medplum-store'
import { useAuthentication } from '@/hooks/use-authentication'
import { useMedplumStore } from '@/hooks/use-medplum-store'
import { useOptimistic, useTransition } from 'react'
import TaskComments from './TaskComments'
import FramePanel from '../FramePanel'
import StaticContent from '../StaticContent'
import ConnectorsSection from './ConnectorsSection'

interface TaskDetailsProps {
  task: WorklistTask
}

type AssigneeState = {
  value: unknown
  isPending: boolean
}

const TaskDetails = ({ task }: TaskDetailsProps) => {
  const VIEWS = ['content', 'ahp', 'notes']
  const AHP_URL = task.input[0]?.valueUrl
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

  return (
    <>
      {VIEWS.map((view) => (
        <div
          key={view}
          className={`overflow-y-auto p-2 border-r border-gray-200 ${
            view === 'content' ? 'w-[40%]' : 'w-[30%]'
          }`}
        >
          <div className="h-full">
            {view === 'ahp' && (
              <div className="flex flex-col h-full">
                {/* Task Assignee Section - Always visible at top */}
                <div className="flex-shrink-0 p-3 bg-gray-50 rounded-lg border mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        {currentValue
                          ? `Assigned to ${currentValue}`
                          : 'Unassigned'}
                      </span>
                    </div>

                    {currentValue ? (
                      <button
                        type="button"
                        className={`group flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors cursor-pointer ${
                          isCurrentUser
                            ? 'text-gray-700 hover:text-red-600 hover:bg-red-50'
                            : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                        onClick={handleAssigneeClick}
                        title={isCurrentUser ? 'Unassign' : 'Reassign to me'}
                        disabled={isPending}
                      >
                        {isPending ? (
                          <div className="h-4 w-4 animate-spin rounded-full border border-gray-300 border-t-gray-600" />
                        ) : isCurrentUser ? (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500">
                            Unassign
                          </span>
                        ) : (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
                            Assign to me
                          </span>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded border border-blue-200"
                        onClick={handleAssigneeClick}
                        disabled={isPending}
                      >
                        {isPending ? (
                          <div className="h-4 w-4 animate-spin rounded-full border border-blue-300 border-t-blue-600" />
                        ) : null}
                        Assign to me
                      </button>
                    )}
                  </div>
                </div>

                {/* FramePanel - Takes remaining space */}
                <div className="flex-1 overflow-hidden">
                  <FramePanel
                    url={AHP_URL}
                    status={task.status}
                    taskName={task.description}
                  />
                </div>
              </div>
            )}
            {view === 'content' && (
              <div className="p-2">
                <StaticContent task={task} />
                <div className="mt-4">
                  <ConnectorsSection task={task} showAhpConnector={!!AHP_URL} />
                </div>
              </div>
            )}
            {view === 'notes' && <TaskComments task={task} />}
          </div>
        </div>
      ))}
    </>
  )
}

export default TaskDetails
