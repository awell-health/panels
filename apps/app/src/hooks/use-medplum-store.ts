import { useMedplum } from '@/contexts/MedplumClientProvider'
import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'
import { panelDataStore } from '@/lib/reactive/panel-medplum-data-store'
import { useMemo, useCallback } from 'react'
import { useRow } from 'tinybase/ui-react'

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
  const {
    store: patientStore,
    table: patientTable,
    key: patientKey,
  } = useMemo(() => {
    return panelDataStore.getReactiveSubscription('Patient')
  }, [])

  const {
    store: taskStore,
    table: taskTable,
    key: taskKey,
  } = useMemo(() => {
    return panelDataStore.getReactiveSubscription('Task')
  }, [])

  // Use TinyBase's reactive hook to subscribe to changes
  const patientListener = useRow(patientTable, patientKey, patientStore)
  const taskListener = useRow(taskTable, taskKey, taskStore)

  // Get worklist data from the store
  const worklistData = useMemo(() => {
    return panelDataStore.getWorklistData()
  }, [])

  const patients = useMemo(() => {
    return worklistData?.patients || []
  }, [worklistData])

  const tasks = useMemo(() => {
    return worklistData?.tasks || []
  }, [worklistData])

  // Memoize the load functions to prevent unnecessary re-renders
  const loadPaginatedPatients = useCallback(
    (options?: {
      pageSize?: number
      lastUpdated?: string
    }) => {
      return panelDataStore.getData('Patient')
    },
    [],
  )

  const loadPaginatedTasks = useCallback(
    (options?: {
      pageSize?: number
      lastUpdated?: string
    }) => {
      return panelDataStore.getData('Task')
    },
    [],
  )

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
    loadPaginatedPatients,
    loadPaginatedTasks,
  }
}
