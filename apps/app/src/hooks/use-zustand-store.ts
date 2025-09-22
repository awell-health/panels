import { useCallback, useMemo } from 'react'
import { usePanelMedplumDataStore } from '@/lib/reactive/panel-medplum-data-store-zustand'
import type { Patient, Task } from '@medplum/fhirtypes'
import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'

/**
 * Hook to get patients data with reactive updates
 */
export function usePatients() {
  return usePanelMedplumDataStore((state) => state.patients)
}

/**
 * Hook to get tasks data with reactive updates
 */
export function useTasks() {
  return usePanelMedplumDataStore((state) => state.tasks)
}

/**
 * Hook to get pagination data with reactive updates
 */
export function usePagination() {
  return usePanelMedplumDataStore((state) => state.pagination)
}

/**
 * Hook to get patients as array with reactive updates
 */
export function usePatientsArray(): Patient[] {
  const patients = usePatients()
  return Array.from(patients.values()).map((item) => item.data as Patient)
}

/**
 * Hook to get tasks as array with reactive updates
 */
export function useTasksArray(): Task[] {
  const tasks = useTasks()
  return Array.from(tasks.values()).map((item) => item.data as Task)
}

/**
 * Hook to get worklist data with reactive updates
 */
export function useWorklistData(): {
  patients: WorklistPatient[]
  tasks: WorklistTask[]
} | null {
  const patients = usePatientsArray()
  const tasks = useTasksArray()

  return useMemo(() => {
    if (patients.length === 0 && tasks.length === 0) {
      return null
    }
    return usePanelMedplumDataStore.getState().getWorklistData()
  }, [patients.length, tasks.length])
}

/**
 * Hook to get worklist patients with reactive updates
 */
export function useWorklistPatients(): WorklistPatient[] {
  const worklistData = useWorklistData()
  return worklistData?.patients || []
}

/**
 * Hook to get worklist tasks with reactive updates
 */
export function useWorklistTasks(): WorklistTask[] {
  const worklistData = useWorklistData()
  return worklistData?.tasks || []
}

/**
 * Hook to get a specific patient by ID with reactive updates
 */
export function usePatient(patientId: string): Patient | null {
  return usePanelMedplumDataStore(
    (state) => state.getItem('Patient', patientId) as Patient | null,
  )
}

/**
 * Hook to get a specific task by ID with reactive updates
 */
export function useTask(taskId: string): Task | null {
  return usePanelMedplumDataStore(
    (state) => state.getItem('Task', taskId) as Task | null,
  )
}

/**
 * Hook to get a specific worklist patient by ID with reactive updates
 */
export function useWorklistPatient(patientId: string): WorklistPatient | null {
  const patients = usePanelMedplumDataStore
    .getState()
    .getWorklistData()?.patients

  return useMemo(() => {
    return patients?.find((p) => p.id === patientId) || null
  }, [patients, patientId])
}

/**
 * Hook to get a specific worklist task by ID with reactive updates
 */
export function useWorklistTask(taskId: string): WorklistTask | null {
  const tasks = usePanelMedplumDataStore.getState().getWorklistData()?.tasks

  // console.log('useWorklistTask tasks', tasks)
  return useMemo(() => {
    return tasks?.find((t) => t.id === taskId) || null
  }, [tasks, taskId])
}

/**
 * Hook to get pagination state for a specific resource type
 */
export function usePaginationState(resourceType: 'Patient' | 'Task') {
  return usePanelMedplumDataStore((state) => state.getPagination(resourceType))
}

/**
 * Hook to get store actions
 */
export function useStoreActions() {
  const setItem = useCallback(
    <T extends Patient | Task>(resourceType: 'Patient' | 'Task', item: T) => {
      usePanelMedplumDataStore.getState().setItem(resourceType, item)
    },
    [],
  )

  const removeItem = useCallback(
    (resourceType: 'Patient' | 'Task', itemId: string) => {
      usePanelMedplumDataStore.getState().removeItem(resourceType, itemId)
    },
    [],
  )

  const setData = useCallback(
    (resourceType: 'Patient' | 'Task', data: Patient[] | Task[]) => {
      usePanelMedplumDataStore.getState().setData(resourceType, data)
    },
    [],
  )

  const updateData = useCallback(
    (resourceType: 'Patient' | 'Task', newData: Patient[] | Task[]) => {
      usePanelMedplumDataStore.getState().updateData(resourceType, newData)
    },
    [],
  )

  const updatePagination = useCallback(
    (
      resourceType: 'Patient' | 'Task',
      pagination: { nextCursor?: string; hasMore: boolean },
    ) => {
      usePanelMedplumDataStore
        .getState()
        .updatePagination(resourceType, pagination)
    },
    [],
  )

  const clearData = useCallback((resourceType: 'Patient' | 'Task') => {
    usePanelMedplumDataStore.getState().clearData(resourceType)
  }, [])

  const clearAllData = useCallback(() => {
    usePanelMedplumDataStore.getState().clearAllData()
  }, [])

  return {
    setItem,
    removeItem,
    setData,
    updateData,
    updatePagination,
    clearData,
    clearAllData,
  }
}

/**
 * Hook to get debug information
 */
export function useStoreDebug() {
  const patientsSize = usePanelMedplumDataStore((state) => state.patients.size)
  const tasksSize = usePanelMedplumDataStore((state) => state.tasks.size)
  const paginationSize = usePanelMedplumDataStore(
    (state) => state.pagination.size,
  )

  const dataSize = useMemo(
    () => ({
      patients: patientsSize,
      tasks: tasksSize,
      pagination: paginationSize,
    }),
    [patientsSize, tasksSize, paginationSize],
  )

  return {
    dataSize,
    getAllData: () => usePanelMedplumDataStore.getState().getAllData(),
  }
}

/**
 * Hook for legacy compatibility - mimics the old useMedplumStore interface
 */
export function useMedplumStoreZustand() {
  const patients = useWorklistPatients()
  const tasks = useWorklistTasks()
  const actions = useStoreActions()

  // These would need to be passed from the MedplumClientProvider
  // For now, returning empty functions as placeholders
  return {
    patients,
    tasks,
    isLoading: false,
    error: null,
    addNotesToTask: () => {},
    toggleTaskOwner: () => {},
    getPatientObservations: () => {},
    getPatientEncounters: () => {},
    getPatientDetectedIssues: () => {},
    deletePatient: () => {},
    getPatientCompositions: () => {},
    ...actions,
  }
}
