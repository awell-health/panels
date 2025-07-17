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
    return panelDataStore.getReactiveSubscription('default', 'Patient')
  }, [])

  const {
    store: taskStore,
    table: taskTable,
    key: taskKey,
  } = useMemo(() => {
    return panelDataStore.getReactiveSubscription('default', 'Task')
  }, [])

  // Use TinyBase's reactive hook to subscribe to changes
  const patientListener = useRow(patientTable, patientKey, patientStore)
  const taskListener = useRow(taskTable, taskKey, taskStore)

  // Parse the cached data from the store
  const patients = useMemo(() => {
    if (!patientListener?.data) {
      return []
    }

    try {
      const parsed = JSON.parse(patientListener.data as string) as {
        data: WorklistPatient[] | WorklistTask[]
        pagination: { nextCursor?: string; hasMore: boolean }
        lastUpdated: string
        panelId: string
        resourceType: 'Patient' | 'Task'
      }
      return parsed.data as WorklistPatient[]
    } catch (error) {
      console.warn('Failed to parse cached patient data:', error)
      return []
    }
  }, [patientListener?.data])

  const tasks = useMemo(() => {
    if (!taskListener?.data) {
      return []
    }

    try {
      const parsed = JSON.parse(taskListener.data as string) as {
        data: WorklistPatient[] | WorklistTask[]
        pagination: { nextCursor?: string; hasMore: boolean }
        lastUpdated: string
        panelId: string
        resourceType: 'Patient' | 'Task'
      }
      return parsed.data as WorklistTask[]
    } catch (error) {
      console.warn('Failed to parse cached task data:', error)
      return []
    }
  }, [taskListener?.data])

  // Memoize the load functions to prevent unnecessary re-renders
  const loadPaginatedPatients = useCallback(
    (options?: {
      pageSize?: number
      lastUpdated?: string
    }) => {
      return panelDataStore.getData('default', 'Patient')
    },
    [],
  )

  const loadPaginatedTasks = useCallback(
    (options?: {
      pageSize?: number
      lastUpdated?: string
    }) => {
      return panelDataStore.getData('default', 'Task')
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
