import type { WorklistTask } from '@/hooks/use-medplum-store'
import TaskComments from './TaskComments'
import FramePanel from '../FramePanel'
import StaticContent from '../StaticContent'
import ConnectorsSection from './ConnectorsSection'

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
              <div className="flex flex-col h-full">
                <div className="flex-1 min-h-0">
                  <FramePanel
                    url={AHP_URL}
                    status={task.status}
                    taskName={task.description}
                  />
                </div>
                <div className="mt-4 flex-shrink-0">
                  <ConnectorsSection task={task} showAhpConnector={!!AHP_URL} />
                </div>
              </div>
            )}
            {view === 'content' && (
              <div className="p-2">
                <StaticContent task={task} />
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
