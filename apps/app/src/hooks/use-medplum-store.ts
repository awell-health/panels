import { useMedplum } from '@/contexts/MedplumClientProvider'
import {
  mapPatientsToWorklistPatients,
  mapTasksToWorklistTasks,
} from '@/lib/fhir-to-table-data'
import { useMemo } from 'react'

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
    getPatientCompositions,
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
    getPatientCompositions,
  }
}
