import { useMedplum } from '@/contexts/MedplumClientProvider'
import type { Patient, Task } from '@medplum/fhirtypes'
import { useMemo } from 'react'

// REFACTOR NEEDED:
// This was a quick hack to get something working, it needs a lot of work to create a proper data store for frontend
// 1. this is mega messy for now, we should move this to a small database for frontend and use medplum just to populate that database
// This will give us a lot more speed on frontend
// 2. Also the medplum store currently is storing everything, we should likely have different stores for different types of data
// This will make it easier to manage and extend
// 3. We should not be using any as WorklistPatient, WorklistTask etc. We should be using proper types
// 4. Likely we only need a data set that can be flattened by a single table, and then on view time we do grouping and filtering
// meaning that the patients view is tasks grouped by patient, this might be able to happens UI layer, or not, needs more thought

// Types for our worklist data
export type WorklistPatient = {
  id: string
  name: string
  tasks: WorklistTask[]
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  [key: string]: any // For dynamic columns
}

export type WorklistTask = {
  id: string
  description: string
  status: string
  priority?: string
  dueDate?: string
  patientId: string
  patientName: string
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  [key: string]: any // For dynamic columns
  // we shouldnt pass the worklist tasks inside the patient
  patient?: WorklistPatient
}

// Helper methods
function getPatientName(patient: Patient): string {
  if (!patient.name || patient.name.length === 0) return 'Unknown'
  const name = patient.name[0]
  return `${name.given?.join(' ') || ''} ${name.family || ''}`.trim()
}

const mapPatientsToWorklistPatients = (
  patients: Patient[],
  tasks: Task[],
): WorklistPatient[] => {
  return patients.map((patient) => {
    const patientTasks = tasks.filter(
      (task) => task.for?.reference === `${patient.resourceType}/${patient.id}`,
    )
    const taskDescriptions = patientTasks
      .map((task) => task.description)
      .join('; ')
    const rawPatient = patient as Patient

    return {
      ...rawPatient,
      id: patient.id || '',
      name: getPatientName(patient),
      taskDescriptionsSummary: taskDescriptions,
      tasks: patientTasks.map((task) => taskToWorklistData(patient, task)),
    }
  })
}

const taskToWorklistData = (
  patient: Patient | undefined,
  task: Task,
): WorklistTask => {
  return {
    ...task,
    id: task.id || '',
    status: task.status || 'unknown',
    priority: task.priority,
    description: task.description || '',
    patientId: patient?.id || '',
    patientName: patient ? getPatientName(patient) : '',
    patient: patient
      ? {
          ...patient,
          id: patient.id || '',
          name: getPatientName(patient),
          tasks: [],
        }
      : undefined,
  }
}

const mapTasksToWorklistTasks = (
  patients: Patient[],
  tasks: Task[],
): WorklistTask[] => {
  return tasks.map((task) => {
    const patient = patients.find(
      (p) => `${p.resourceType}/${p.id}` === task.for?.reference,
    )
    return taskToWorklistData(patient, task)
  })
}

export function useMedplumStore() {
  const {
    patients,
    tasks,
    isLoading,
    error,
    addNotesToTask,
    toggleTaskOwner,
    getPatientObservations,
    getPatientEncounters,
    getPatientDetectedIssues,
    deletePatient,
  } = useMedplum()

  // Map the raw FHIR resources to our worklist format
  const mappedPatients = useMemo(
    () => mapPatientsToWorklistPatients(patients, tasks),
    [patients, tasks],
  )

  const mappedTasks = useMemo(
    () => mapTasksToWorklistTasks(patients, tasks),
    [patients, tasks],
  )

  return {
    patients: mappedPatients,
    tasks: mappedTasks,
    isLoading,
    error,
    addNotesToTask,
    toggleTaskOwner,
    getPatientObservations,
    getPatientEncounters,
    getPatientDetectedIssues,
    deletePatient,
  }
}
