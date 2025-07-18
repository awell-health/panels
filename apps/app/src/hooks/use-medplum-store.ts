import { useMedplum } from '@/contexts/MedplumClientProvider'
import { panelDataStore } from '@/lib/reactive/panel-medplum-data-store'
import { useMemo } from 'react'
import { useTable } from 'tinybase/ui-react'

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
    deletePatient,
  } = useMedplum()

  // Get the reactive subscription from the store
  const { store: patientStore, table: patientTable } = useMemo(() => {
    return panelDataStore.getDataReactiveTableSubscription('Patient')
  }, [])

  const { store: taskStore, table: taskTable } = useMemo(() => {
    return panelDataStore.getDataReactiveTableSubscription('Task')
  }, [])

  // Use TinyBase's reactive hook to subscribe to changes
  const patientData = useTable(patientTable, patientStore)
  const taskData = useTable(taskTable, taskStore)

  // Get worklist data from the store
  const worklistData = useMemo(() => {
    if (!patientData && !taskData) {
      return {
        patients: [],
        tasks: [],
      }
    }
    return panelDataStore.getWorklistData()
  }, [patientData, taskData])

  const patients = useMemo(() => {
    return worklistData?.patients || []
  }, [worklistData])

  const tasks = useMemo(() => {
    return worklistData?.tasks || []
  }, [worklistData])

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
    deletePatient,
    getPatientCompositions,
  }
}
