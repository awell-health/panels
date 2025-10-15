import type { WorklistTask } from '@/lib/fhir-to-table-data'
import TaskComments from './TaskComments'
import StaticContent from '../StaticContent'
import ConnectorsSection from './ConnectorsSection'
import TaskAsignment from './TaskAsignment'
import DraftTaskEditor from './DraftTaskEditor'
import NonCareFlowTaskView from './NonCareFlowTaskView'
import type { CodeableConcept, Coding } from '@medplum/fhirtypes'
import ApproveRejectTask from './ApproveRejectTask'
import TaskStatusBadge from './TaskStatusBadge'
import FramePanel from '../FramePanel'

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

  const isAHPTask = task?.code?.coding?.find(
    (c: Coding) =>
      c?.system === 'http://terminology.hl7.org/CodeSystem/task-code' &&
      c?.code === 'approve',
  )

  const isDavitaApprovalRejectTask = task?.code?.coding?.find(
    (c: Coding) =>
      c?.system === 'http://davita.com/fhir/task-code' &&
      (c?.code === 'approval-reject' || c?.code === 'approve-reject'),
  )

  const isNonCareFlowTask = !isAHPTask && !isDavitaApprovalRejectTask

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
              {task.status === 'draft' ? (
                <DraftTaskEditor task={task} />
              ) : (
                <>
                  <TaskAsignment
                    task={task}
                    blockAssignee={isNonAssignableTask}
                  />
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-2">
                    <div className="font-medium text-gray-900">
                      {task.code?.text || task.description}
                    </div>
                    <div className="flex items-center gap-2">
                      <TaskStatusBadge status={task.status} />
                    </div>
                  </div>
                  {!isNonAssignableTask && (
                    <>
                      {isAHPTask && (
                        <div className="flex-1 overflow-hidden">
                          <FramePanel url={AHP_URL} status={task.status} />
                        </div>
                      )}
                      {isDavitaApprovalRejectTask && (
                        <div className="flex-1">
                          <ApproveRejectTask task={task} />
                        </div>
                      )}
                      {isNonCareFlowTask && (
                        <div className="flex-1">
                          <NonCareFlowTaskView task={task} />
                        </div>
                      )}
                    </>
                  )}

                  {isNonAssignableTask && (
                    <div className="flex flex-1 items-center justify-center h-full gap-2">
                      <span className=" text-gray-500">
                        This task cannot be completed through panels.
                      </span>
                    </div>
                  )}
                </>
              )}
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
