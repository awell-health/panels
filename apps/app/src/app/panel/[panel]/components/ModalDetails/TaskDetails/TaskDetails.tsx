import type { WorklistTask } from '@/lib/fhir-to-table-data'
import TaskComments from './TaskComments'
import StaticContent from '../StaticContent'
import ConnectorsSection from './ConnectorsSection'
import TaskAsignment from './TaskAsignment'
import type { CodeableConcept, Coding } from '@medplum/fhirtypes'
import AHPFrame from './AHPFrame'
import ApproveRejectTask from './ApproveRejectTask'

interface TaskDetailsProps {
  task: WorklistTask
}

const TaskDetails = ({ task }: TaskDetailsProps) => {
  const VIEWS = ['content', 'resolve-task', 'notes']
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

  const isNonAssignableTask = task.performerType?.some(
    (performerType: CodeableConcept) =>
      performerType.coding?.some(
        (coding: Coding) =>
          (coding?.code === 'PT' || coding?.code === 'DKC') &&
          coding?.system ===
            'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
      ),
  )

  const isAHPTask = task?.code?.coding.find(
    (c: Coding) =>
      c?.system === 'http://terminology.hl7.org/CodeSystem/task-code' &&
      c?.code === 'approve',
  )

  const isDavitaApprovalRejectTask = task?.code?.coding.find(
    (c: Coding) =>
      c?.system === 'http://davita.com/fhir/task-code' &&
      (c?.code === 'approval-reject' || c?.code === 'approve-reject'),
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
          {view === 'resolve-task' && (
            <div className="flex flex-col h-full">
              <TaskAsignment task={task} blockAssignee={isNonAssignableTask} />
              <div className="flex-1 overflow-hidden">
                {isAHPTask && (
                  <AHPFrame
                    task={task}
                    url={AHP_URL}
                    isNonAssignableTask={isNonAssignableTask}
                  />
                )}
                {isDavitaApprovalRejectTask && (
                  <ApproveRejectTask task={task} />
                )}
              </div>
            </div>
          )}
          {view === 'content' && (
            <>
              <StaticContent task={task} />
              <div className="mt-4">
                <ConnectorsSection
                  task={task}
                  showAhpConnector={!!AHP_URL && !isNonAssignableTask}
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
