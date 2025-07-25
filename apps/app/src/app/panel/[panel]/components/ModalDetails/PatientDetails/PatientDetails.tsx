import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'
import { ChevronRightIcon } from 'lucide-react'
import TaskStatusBadge from '../TaskDetails/TaskStatusBadge'
import PatientConnectorsSection from '../TaskDetails/PatientConnectorsSection'
import { ManualTrackButton } from '@/components/ManualTrackButton'

import NotesTimeline, { type TimelineDatItem } from '../NotesTimeline'
import { useMedplumStore } from '@/hooks/use-medplum-store'
import { useEffect, useState } from 'react'
import StaticContent from '../StaticContent'

interface PatientDetailsProps {
  patient: WorklistPatient
  setSelectedTask: (task: WorklistTask | null) => void
}

const PatientDetails = ({ patient, setSelectedTask }: PatientDetailsProps) => {
  const VIEWS = ['content', 'tasks', 'timeline']
  const { tasks } = useMedplumStore()

  // State for patient-specific tasks
  const [patientTasks, setPatientTasks] = useState<WorklistTask[]>([])

  // Filter tasks for the current patient when tasks change
  useEffect(() => {
    const filteredTasks = tasks.filter((task) => task.patientId === patient.id)
    setPatientTasks(filteredTasks)
  }, [tasks, patient.id])

  const getTimelineItems = (taskList: WorklistTask[]) => {
    const notes: WorklistTask['note'] = []
    const timelineItems: TimelineDatItem[] = []

    // Use patientTasks instead of tasks
    for (const task of taskList) {
      if (task.note) {
        notes.push(...task.note)
      }

      timelineItems.push({
        type: 'task',
        title: `Task created: ${task.description}`,
        datetime: task.authoredOn ?? '',
      })

      if (task.status === 'completed') {
        timelineItems.push({
          type: 'task',
          title: `Task completed: ${task.description}`,
          datetime: task.lastModified ?? '',
        })
      }
    }

    return { notes, timelineItems }
  }

  return (
    <>
      {VIEWS.map((view) => (
        <div
          key={view}
          className={`flex-1 overflow-y-auto p-2 border-r border-gray-200 ${
            view === 'content' ? 'w-[36%]' : 'w-[32%]'
          }`}
        >
          <div className="h-ful p-2">
            {view === 'content' && (
              <div>
                <StaticContent patient={patient} />
                <div className="mt-4">
                  <PatientConnectorsSection patient={patient} />
                </div>
              </div>
            )}
            {view === 'timeline' && (
              <NotesTimeline
                patientId={patient.id}
                {...getTimelineItems(patientTasks)}
              />
            )}
            {view === 'tasks' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium text-gray-600">Tasks list:</div>
                  <ManualTrackButton patientId={patient.id} />
                </div>
                <div className="flex flex-col gap-2">
                  {patientTasks.map((task) => (
                    // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
                    <div
                      key={task.id}
                      onClick={() => {
                        setSelectedTask(task)
                      }}
                    >
                      <div className="flex justify-between p-2 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                        <div className="flex justify-between w-full items-center">
                          <div className="font-medium text-gray-900 flex flex-col gap-1">
                            {task.description}
                            <div className="flex items-center gap-2">
                              <TaskStatusBadge status={task.status} />
                              <span className="text-gray-600">·</span>
                              <span className="text-gray-600">
                                {task.priority}
                              </span>
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
