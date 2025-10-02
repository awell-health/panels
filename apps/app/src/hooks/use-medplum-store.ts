import { useMedplum } from '@/contexts/MedplumClientProvider'
import { useWorklistPatients, useWorklistTasks } from './use-zustand-store'

export function useMedplumStore() {
  const {
    isLoading,
    error,
    addNotesToTask,
    toggleTaskOwner,
    getPatientObservations,
    getPatientEncounters,
    getPatientDetectedIssues,
    getPatientCompositions,
    getPatientAppointments,
    deletePatient,
    getLocations,
    getLocationsFromReferences,
  } = useMedplum()

  // Use Zustand hooks for reactive data
  const patients = useWorklistPatients()
  const tasks = useWorklistTasks()

  return {
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
    getPatientAppointments,
    deletePatient,
    getLocations,
    getLocationsFromReferences,
  }
}
