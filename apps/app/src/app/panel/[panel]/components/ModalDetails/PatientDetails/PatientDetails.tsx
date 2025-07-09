import type { WorklistPatient, WorklistTask } from '@/hooks/use-medplum-store'
import { ChevronRightIcon } from 'lucide-react'
import TaskStatusBadge from '../TaskDetails/TaskStatusBadge'
import PatientData from './PatientData'

import NotesTimeline, { type TimelineDatItem } from '../NotesTimeline'
import { useMedplumStore } from '@/hooks/use-medplum-store'
import { useEffect, useState } from 'react'

interface PatientDetailsProps {
  patient: WorklistPatient
  setSelectedTask: (task: WorklistTask | null) => void
}

const PatientDetails = ({ patient, setSelectedTask }: PatientDetailsProps) => {
  const VIEWS = ['data', 'content', 'timeline']
  const { tasks } = useMedplumStore()

  // State for patient-specific tasks
  const [patientTasks, setPatientTasks] = useState<WorklistTask[]>([])

  // Filter tasks for the current patient when tasks change
  useEffect(() => {
    const filteredTasks = tasks.filter((task) => task.patientId === patient.id)
    setPatientTasks(filteredTasks)
  }, [tasks, patient.id])

  const notes: WorklistTask['note'] = []
  const timelineItems: TimelineDatItem[] = []

  // Use patientTasks instead of tasks
  for (const task of patientTasks) {
    if (task.note) {
      notes.push(...task.note)
    }

    if (task.authoredOn) {
      timelineItems.push({
        type: 'task',
        title: `Task created: ${task.description}`,
        datetime: task.authoredOn,
      })
    }

    if (task.lastModified) {
      timelineItems.push({
        type: 'task',
        title: `Task completed: ${task.description}`,
        datetime: task.lastModified,
      })
    }
  }

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
            {view === 'data' && <PatientData patient={patient} />}
            {view === 'timeline' && (
              <NotesTimeline
                patientId={patient.id}
                notes={notes}
                timelineItems={timelineItems}
              />
            )}
            {view === 'content' && (
              <div>
                <div className="text-lg font-medium text-gray-500 mb-4">
                  Tasks list:
                </div>
                <div className="flex flex-col gap-3">
                  {patientTasks.map((task) => (
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
