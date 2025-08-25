import type { WorklistTask } from '@/lib/fhir-to-table-data'
import TaskComments from './TaskComments'
import FramePanel from '../FramePanel'
import StaticContent from '../StaticContent'
import ConnectorsSection from './ConnectorsSection'
import TaskAsignment from './TaskAsignment'
import type { CodeableConcept, Coding } from '@medplum/fhirtypes'

interface TaskDetailsProps {
  task: WorklistTask
}

const TaskDetails = ({ task }: TaskDetailsProps) => {
  const VIEWS = ['content', 'ahp', 'notes']
  const AHP_CODE = 'awell-hosted-pages'

  function getAwellHostedPagesUrl(code: string) {
    if (!task.input) return null

    for (const input of task.input) {
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

  // Check if task has performer type PT (Physical Therapist/Patient)
  const isPatientTask = task.performerType?.some(
    (performerType: CodeableConcept) =>
      performerType.coding?.some(
        (coding: Coding) =>
          coding.code === 'PT' &&
          coding.system === 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
      ),
  )

  const AHP_URL = getAwellHostedPagesUrl(AHP_CODE)

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
              <TaskAsignment task={task} blockAssignee={isPatientTask} />
              <div className="flex-1 overflow-hidden">
                <FramePanel
                  url={AHP_URL}
                  status={task.status}
                  taskName={task.description}
                  isPatientTask={isPatientTask}
                />
              </div>
            </div>
          )}
          {view === 'content' && (
            <>
              <StaticContent task={task} />
              <div className="mt-4">
                <ConnectorsSection
                  task={task}
                  showAhpConnector={!!AHP_URL && !isPatientTask}
                />
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
