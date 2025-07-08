import type { WorklistPatient, WorklistTask } from '@/hooks/use-medplum-store'
import PatientData from './PatientData'
import TaskStatusBadge from '../TaskDetails/TaskStatusBadge'
import { ChevronRightIcon, Trash2Icon } from 'lucide-react'

import NotesTimeline from '../NotesTimeline'
import { sortBy } from 'lodash'

interface PatientDetailsProps {
  patient: WorklistPatient
  setSelectedTask: (task: WorklistTask | null) => void
  onDeleteRequest: () => void
}

const PatientDetails = ({
  patient,
  setSelectedTask,
  onDeleteRequest,
}: PatientDetailsProps) => {
  const VIEWS = ['data', 'content', 'timeline']
  const { tasks } = patient
  let notes: WorklistTask['note'] = []

  notes = sortBy(notes, 'time')

  const thread = tasks
    .filter((task) => task.note && task.note.length > 0)
    .map((task) => ({
      text: task.description,
      time: task.created,
      notes: task.note,
    }))

  return (
    <>
      {VIEWS.map((view) => (
        <div
          key={view}
          className={`flex-1  overflow-y-auto p-2 border-r border-gray-200 ${
            view === 'content' ? 'w-[40%]' : 'w-[30%]'
          }`}
        >
          <div className="h-full p-2">
            {view === 'data' && (
              <div>
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <button
                    type="button"
                    onClick={onDeleteRequest}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-md transition-colors"
                  >
                    <Trash2Icon className="w-4 h-4" />
                    Delete Patient & Tasks
                  </button>
                </div>
                <PatientData patient={patient} />
              </div>
            )}
            {view === 'timeline' && (
              <NotesTimeline thread={thread} patientId={patient.id} />
            )}
            {view === 'content' && (
              <div>
                <div className="text-lg font-medium text-gray-500 mb-4">
                  Tasks list:
                </div>
                <div className="flex flex-col gap-3">
                  {tasks.map((task) => (
                    // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
                    <div
                      key={task.id}
                      onClick={() => {
                        setSelectedTask(task)
                      }}
                    >
                      <div className="flex justify-between py-2 px-4 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                        <div className="flex justify-between w-full items-center">
                          <div className="text-base font-medium text-gray-500">
                            {task.description}
                            <div className="text-sm text-gray-400 flex items-center gap-1">
                              <TaskStatusBadge status={task.status} />
                              <span className="text-gray-400">·</span>
                              {task.priority}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ChevronRightIcon className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  )
}

export default PatientDetails
