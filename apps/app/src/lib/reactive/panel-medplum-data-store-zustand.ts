import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'
import {
  mapPatientsToWorklistPatients,
  mapTasksToWorklistTasks,
} from '@/lib/fhir-to-table-data'
import type { Patient, Task } from '@medplum/fhirtypes'
import type { MedplumStoreClient } from '@/lib/medplum-client'

interface PaginationState {
  nextCursor?: string
  hasMore: boolean
}

interface PaginationInfo {
  panelId: string
  resourceType: 'Patient' | 'Task'
  pagination: PaginationState
  lastUpdated: string
  itemCount: number
}

interface StoredItem {
  data: Patient | Task
  panelId: string
  resourceType: 'Patient' | 'Task'
  itemId: string
  lastUpdated: string
}

interface PanelMedplumDataState {
  // Data storage
  patients: Map<string, StoredItem>
  tasks: Map<string, StoredItem>
  pagination: Map<string, PaginationInfo>

  // Unsubscribe functions for MedplumStore
  unsubscribeFunctions: { patients?: () => void; tasks?: () => void }

  // Actions
  setItem: <T extends Patient | Task>(
    resourceType: 'Patient' | 'Task',
    item: T,
  ) => void
  getItem: (
    resourceType: 'Patient' | 'Task',
    itemId: string,
  ) => Patient | Task | null
  removeItem: (resourceType: 'Patient' | 'Task', itemId: string) => void
  setData: (resourceType: 'Patient' | 'Task', data: Patient[] | Task[]) => void
  updateData: (
    resourceType: 'Patient' | 'Task',
    newData: Patient[] | Task[],
  ) => void
  getData: (
    resourceType: 'Patient' | 'Task',
  ) => { data: Patient[] | Task[] } | null
  updatePagination: (
    resourceType: 'Patient' | 'Task',
    pagination: PaginationState,
  ) => void
  getPagination: (resourceType: 'Patient' | 'Task') => PaginationState | null
  clearData: (resourceType: 'Patient' | 'Task') => void
  clearAllData: () => void

  // Worklist data methods
  getWorklistData: () => {
    patients: WorklistPatient[]
    tasks: WorklistTask[]
  } | null
  getWorklistDataByResourceType: (
    resourceType: 'Patient' | 'Task',
  ) => WorklistPatient[] | WorklistTask[] | null

  // MedplumStore integration
  registerAsListener: (medplumStoreClient: MedplumStoreClient) => void

  // Debug methods
  getAllData: () => {
    patients: Map<string, StoredItem>
    tasks: Map<string, StoredItem>
    pagination: Map<string, PaginationInfo>
  }
  getDataSize: () => { patients: number; tasks: number; pagination: number }
}

const generatePaginationKey = (resourceType: 'Patient' | 'Task'): string => {
  return `default:${resourceType}`
}

const generateItemKey = (itemId: string): string => {
  return `default:${itemId}`
}

export const usePanelMedplumDataStore = create<PanelMedplumDataState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    patients: new Map(),
    tasks: new Map(),
    pagination: new Map(),
    unsubscribeFunctions: {},

    // Set a single item
    setItem: <T extends Patient | Task>(
      resourceType: 'Patient' | 'Task',
      item: T,
    ) => {
      if (!item || !item.id) {
        console.warn('Invalid item provided to setItem:', {
          resourceType,
          item,
        })
        return
      }

      const panelId = 'default'
      const itemKey = generateItemKey(item.id)
      const storedItem: StoredItem = {
        data: item,
        panelId,
        resourceType,
        itemId: item.id || '',
        lastUpdated: new Date().toISOString(),
      }

      set((state) => {
        const newState = { ...state }
        if (resourceType === 'Patient') {
          newState.patients = new Map(state.patients)
          newState.patients.set(itemKey, storedItem)
        } else {
          newState.tasks = new Map(state.tasks)
          newState.tasks.set(itemKey, storedItem)
        }
        return newState
      })
    },

    // Get a single item
    getItem: (resourceType: 'Patient' | 'Task', itemId: string) => {
      const state = get()
      const itemKey = generateItemKey(itemId)
      const dataMap = resourceType === 'Patient' ? state.patients : state.tasks
      const storedItem = dataMap.get(itemKey)
      return storedItem ? storedItem.data : null
    },

    // Remove a single item
    removeItem: (resourceType: 'Patient' | 'Task', itemId: string) => {
      const itemKey = generateItemKey(itemId)
      set((state) => {
        const newState = { ...state }
        if (resourceType === 'Patient') {
          newState.patients = new Map(state.patients)
          newState.patients.delete(itemKey)
        } else {
          newState.tasks = new Map(state.tasks)
          newState.tasks.delete(itemKey)
        }
        return newState
      })
    },

    // Set data (replaces existing data)
    setData: (resourceType: 'Patient' | 'Task', data: Patient[] | Task[]) => {
      if (!data || !Array.isArray(data)) {
        console.warn('Invalid data provided to setData:', {
          resourceType,
          data,
        })
        return
      }

      // Clear existing data first
      get().clearData(resourceType)

      // Add each item
      for (const item of data) {
        if (item?.id) {
          get().setItem(resourceType, item)
        }
      }
    },

    // Update data (adds to existing data)
    updateData: (
      resourceType: 'Patient' | 'Task',
      newData: Patient[] | Task[],
    ) => {
      for (const item of newData) {
        if (item?.id) {
          get().setItem(resourceType, item)
        }
      }
    },

    // Get data
    getData: (resourceType: 'Patient' | 'Task') => {
      const state = get()
      const dataMap = resourceType === 'Patient' ? state.patients : state.tasks
      const items: (Patient | Task)[] = []

      for (const [_, storedItem] of dataMap) {
        items.push(storedItem.data)
      }

      return { data: items as Patient[] | Task[] }
    },

    // Update pagination
    updatePagination: (
      resourceType: 'Patient' | 'Task',
      pagination: PaginationState,
    ) => {
      const paginationKey = generatePaginationKey(resourceType)
      const state = get()
      const existing = state.pagination.get(paginationKey)

      let paginationInfo: PaginationInfo
      if (existing) {
        paginationInfo = {
          ...existing,
          pagination,
          lastUpdated: new Date().toISOString(),
        }
      } else {
        paginationInfo = {
          panelId: 'default',
          resourceType,
          pagination,
          lastUpdated: new Date().toISOString(),
          itemCount: 0,
        }
      }

      set((state) => ({
        ...state,
        pagination: new Map(state.pagination).set(
          paginationKey,
          paginationInfo,
        ),
      }))
    },

    // Get pagination
    getPagination: (resourceType: 'Patient' | 'Task') => {
      const state = get()
      const paginationKey = generatePaginationKey(resourceType)
      const entry = state.pagination.get(paginationKey)
      return entry ? entry.pagination : null
    },

    // Clear data for a resource type
    clearData: (resourceType: 'Patient' | 'Task') => {
      set((state) => {
        const newState = { ...state }
        if (resourceType === 'Patient') {
          newState.patients = new Map()
        } else {
          newState.tasks = new Map()
        }

        // Also clear pagination for this resource type
        const paginationKey = generatePaginationKey(resourceType)
        newState.pagination = new Map(state.pagination)
        newState.pagination.delete(paginationKey)

        return newState
      })
    },

    // Clear all data
    clearAllData: () => {
      set((state) => ({
        ...state,
        patients: new Map(),
        tasks: new Map(),
        pagination: new Map(),
      }))
    },

    // Get worklist data
    getWorklistData: () => {
      const state = get()
      const patientsData = state.getData('Patient')
      const tasksData = state.getData('Task')

      if (!patientsData && !tasksData) {
        return null
      }

      const patients = (patientsData?.data as Patient[]) || []
      const tasks = (tasksData?.data as Task[]) || []

      const worklistPatients = mapPatientsToWorklistPatients(patients, tasks)
      const worklistTasks = mapTasksToWorklistTasks(patients, tasks)

      return {
        patients: worklistPatients,
        tasks: worklistTasks,
      }
    },

    // Get worklist data by resource type
    getWorklistDataByResourceType: (resourceType: 'Patient' | 'Task') => {
      const state = get()
      const patientsData = state.getData('Patient')
      const tasksData = state.getData('Task')

      const requestedData =
        resourceType === 'Patient' ? patientsData : tasksData
      if (!requestedData) {
        return null
      }

      const patients = (patientsData?.data as Patient[]) || []
      const tasks = (tasksData?.data as Task[]) || []

      return resourceType === 'Patient'
        ? mapPatientsToWorklistPatients(patients, tasks)
        : mapTasksToWorklistTasks(patients, tasks)
    },

    // Register as listener to MedplumStore
    registerAsListener: (medplumStoreClient: MedplumStoreClient) => {
      // Subscribe to patient updates
      medplumStoreClient
        .subscribeToPatients((updatedPatient: Patient) => {
          get().setItem('Patient', updatedPatient)
        })
        .then((unsubscribe) => {
          set((state) => ({
            ...state,
            unsubscribeFunctions: {
              ...state.unsubscribeFunctions,
              patients: unsubscribe,
            },
          }))
        })

      // Subscribe to task updates
      medplumStoreClient
        .subscribeToTasks((updatedTask: Task) => {
          get().setItem('Task', updatedTask)
        })
        .then((unsubscribe) => {
          set((state) => ({
            ...state,
            unsubscribeFunctions: {
              ...state.unsubscribeFunctions,
              tasks: unsubscribe,
            },
          }))
        })
    },

    // Debug methods
    getAllData: () => {
      const state = get()
      return {
        patients: new Map(state.patients),
        tasks: new Map(state.tasks),
        pagination: new Map(state.pagination),
      }
    },

    getDataSize: () => {
      const state = get()
      return {
        patients: state.patients.size,
        tasks: state.tasks.size,
        pagination: state.pagination.size,
      }
    },
  })),
)

// Export the store instance for direct access (similar to the old API)
export const panelDataStoreZustand = {
  // Data methods
  setItem: <T extends Patient | Task>(
    resourceType: 'Patient' | 'Task',
    item: T,
  ) => usePanelMedplumDataStore.getState().setItem(resourceType, item),

  getItem: (resourceType: 'Patient' | 'Task', itemId: string) =>
    usePanelMedplumDataStore.getState().getItem(resourceType, itemId),

  removeItem: (resourceType: 'Patient' | 'Task', itemId: string) =>
    usePanelMedplumDataStore.getState().removeItem(resourceType, itemId),

  setData: (resourceType: 'Patient' | 'Task', data: Patient[] | Task[]) =>
    usePanelMedplumDataStore.getState().setData(resourceType, data),

  updateData: (resourceType: 'Patient' | 'Task', newData: Patient[] | Task[]) =>
    usePanelMedplumDataStore.getState().updateData(resourceType, newData),

  getData: (resourceType: 'Patient' | 'Task') =>
    usePanelMedplumDataStore.getState().getData(resourceType),

  // Pagination methods
  updatePagination: (
    resourceType: 'Patient' | 'Task',
    pagination: PaginationState,
  ) =>
    usePanelMedplumDataStore
      .getState()
      .updatePagination(resourceType, pagination),

  getPagination: (resourceType: 'Patient' | 'Task') =>
    usePanelMedplumDataStore.getState().getPagination(resourceType),

  // Utility methods
  clearData: (resourceType: 'Patient' | 'Task') =>
    usePanelMedplumDataStore.getState().clearData(resourceType),

  clearAllData: () => usePanelMedplumDataStore.getState().clearAllData(),

  // Worklist methods
  getWorklistData: () => usePanelMedplumDataStore.getState().getWorklistData(),

  getWorklistDataByResourceType: (resourceType: 'Patient' | 'Task') =>
    usePanelMedplumDataStore
      .getState()
      .getWorklistDataByResourceType(resourceType),

  // MedplumStore integration
  registerAsListener: (medplumStoreClient: MedplumStoreClient) =>
    usePanelMedplumDataStore.getState().registerAsListener(medplumStoreClient),

  // Debug methods
  getAllData: () => usePanelMedplumDataStore.getState().getAllData(),

  getDataSize: () => usePanelMedplumDataStore.getState().getDataSize(),

  // Subscription methods for reactive updates
  subscribe: (listener: (state: PanelMedplumDataState) => void) =>
    usePanelMedplumDataStore.subscribe(listener),

  subscribeToPatients: (
    listener: (patients: Map<string, StoredItem>) => void,
  ) =>
    usePanelMedplumDataStore.subscribe((state) => state.patients, listener, {
      equalityFn: (a, b) => a === b,
    }),

  subscribeToTasks: (listener: (tasks: Map<string, StoredItem>) => void) =>
    usePanelMedplumDataStore.subscribe((state) => state.tasks, listener, {
      equalityFn: (a, b) => a === b,
    }),

  subscribeToPagination: (
    listener: (pagination: Map<string, PaginationInfo>) => void,
  ) =>
    usePanelMedplumDataStore.subscribe((state) => state.pagination, listener, {
      equalityFn: (a, b) => a === b,
    }),
}
