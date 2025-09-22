import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'
import PatientConnectorsSection from '../TaskDetails/PatientConnectorsSection'

import NotesTimeline, { type TimelineDatItem } from '../NotesTimeline'
import { useMedplumStore } from '@/hooks/use-medplum-store'
import { useEffect, useState } from 'react'
import StaticContent from '../StaticContent'
import PatientTasks from './PatientTasks'
import { useWorklistTasks } from '../../../../../../hooks/use-zustand-store'

interface PatientDetailsProps {
  patient: WorklistPatient
  setSelectedTask: (task: WorklistTask | null) => void
}

const PatientDetails = ({ patient, setSelectedTask }: PatientDetailsProps) => {
  const VIEWS = ['content', 'tasks', 'timeline']
  const tasks = useWorklistTasks()

  // State for patient-specific tasks
  const [patientTasks, setPatientTasks] = useState<WorklistTask[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filter tasks for the current patient when tasks change
  useEffect(() => {
    const filteredTasks = tasks.filter((task) => task.patientId === patient.id)
    setPatientTasks(filteredTasks)
    setIsLoading(false)
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
          className={`overflow-y-auto p-2 border-r border-gray-200 h-full overflow-auto ${
            view === 'content' ? 'w-[36%]' : 'w-[32%]'
          }`}
        >
          {view === 'content' && (
            <>
              <StaticContent patient={patient} />
              <div className="mt-4">
                <PatientConnectorsSection patient={patient} />
              </div>
            </>
          )}
          {view === 'timeline' && (
            <NotesTimeline
              patientId={patient.id}
              {...getTimelineItems(patientTasks)}
            />
          )}
          {view === 'tasks' && !isLoading && (
            <>
              {patientTasks.length === 0 && (
                <div className="w-full p-8 flex items-center justify-center">
                  <div className="font-medium text-gray-900">
                    No tasks found
                  </div>
                </div>
              )}
              {patientTasks.length > 0 && (
                <PatientTasks
                  patientId={patient.id}
                  tasks={patientTasks}
                  setSelectedTask={setSelectedTask}
                />
              )}
            </>
          )}
        </div>
      ))}
    </>
  )
}

export default PatientDetails
