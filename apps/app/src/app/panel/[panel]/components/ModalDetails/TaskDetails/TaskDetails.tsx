import type { WorklistTask } from '@/lib/fhir-to-table-data'
import TaskComments from './TaskComments'
import FramePanel from '../FramePanel'
import StaticContent from '../StaticContent'
import ConnectorsSection from './ConnectorsSection'
import TaskAsignment from './TaskAsignment'

interface TaskDetailsProps {
  task: WorklistTask
}

const TaskDetails = ({ task }: TaskDetailsProps) => {
  const VIEWS = ['content', 'ahp', 'notes']
  const AHP_URL = task.input?.[0]?.valueUrl

  return (
    <>
      {VIEWS.map((view) => (
        <div
          key={view}
          className={`h-full p-2 border-r border-gray-200 overflow-auto ${
            view === 'content' ? 'w-[36%]' : 'w-[32%]'
          }`}
        >
          {view === 'ahp' && (
            <div className="flex flex-col h-full">
              <TaskAsignment task={task} />
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
            <>
              <StaticContent task={task} />
              <div className="mt-4">
                <ConnectorsSection task={task} showAhpConnector={!!AHP_URL} />
              </div>
            </>
          )}
          {view === 'notes' && <TaskComments task={task} />}
        </div>
      ))}
    </>
  )
}

export default TaskDetails
