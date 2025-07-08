import type { WorklistTask } from '@/hooks/use-medplum-store'
import TaskComments from './TaskComments'
import FramePanel from '../FramePanel'
import StaticContent from '../StaticContent'

interface TaskDetailsProps {
  task: WorklistTask
}

const TaskDetails = ({ task }: TaskDetailsProps) => {
  const VIEWS = ['content', 'ahp', 'notes']
  const AHP_URL = task.input[0]?.valueUrl

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
              <FramePanel
                url={AHP_URL}
                status={task.status}
                taskName={task.description}
              />
            )}
            {view === 'content' && <StaticContent task={task} />}
            {view === 'notes' && (
              <TaskComments
                notes={task.note}
                taskId={task.id}
                patientId={task.patientId}
              />
            )}
          </div>
        </div>
      ))}
    </>
  )
}

export default TaskDetails
