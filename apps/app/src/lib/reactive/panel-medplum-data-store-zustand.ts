import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  WorklistPatient,
  WorklistTask,
  WorklistAppointment,
} from '@/lib/fhir-to-table-data'
import {
  mapPatientsToWorklistPatients,
  mapTasksToWorklistTasks,
  mapAppointmentsToWorklistAppointments,
} from '@/lib/fhir-to-table-data'
import type { Appointment, Location, Patient, Task } from '@medplum/fhirtypes'
import type { MedplumStoreClient } from '@/lib/medplum-client'

interface PaginationState {
  nextCursor?: string
  hasMore: boolean
}

interface PaginationInfo {
  panelId: string
  resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location'
  pagination: PaginationState
  lastUpdated: string
  itemCount: number
}

interface StoredItem {
  data: Patient | Task | Appointment | Location
  panelId: string
  resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location'
  itemId: string
  lastUpdated: string
}

interface PanelMedplumDataState {
  // Data storage
  patients: Map<string, StoredItem>
  tasks: Map<string, StoredItem>
  appointments: Map<string, StoredItem>
  locations: Map<string, StoredItem>
  pagination: Map<string, PaginationInfo>

  // Unsubscribe functions for MedplumStore
  unsubscribeFunctions: {
    patients?: () => void
    tasks?: () => void
    appointments?: () => void
    locations?: () => void
  }

  // Actions
  setItem: <T extends Patient | Task | Appointment | Location>(
    resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
    item: T,
  ) => void
  getItem: (
    resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
    itemId: string,
  ) => Patient | Task | Appointment | Location | null
  removeItem: (
    resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
    itemId: string,
  ) => void
  setData: (
    resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
    data: Patient[] | Task[] | Appointment[] | Location[],
  ) => void
  updateData: (
    resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
    newData: Patient[] | Task[] | Appointment[] | Location[],
  ) => void
  getData: (
    resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
  ) => { data: Patient[] | Task[] | Appointment[] | Location[] } | null
  updatePagination: (
    resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
    pagination: PaginationState,
  ) => void
  getPagination: (
    resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
  ) => PaginationState | null
  clearData: (
    resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
  ) => void
  clearAllData: () => void

  // Worklist data methods
  getWorklistData: () => {
    patients: WorklistPatient[]
    tasks: WorklistTask[]
    appointments: WorklistAppointment[]
  } | null
  getWorklistDataByResourceType: (
    resourceType: 'Patient' | 'Task' | 'Appointment',
  ) => WorklistPatient[] | WorklistTask[] | WorklistAppointment[] | null

  // MedplumStore integration
  registerAsListener: (medplumStoreClient: MedplumStoreClient) => void

  // Debug methods
  getAllData: () => {
    patients: Map<string, StoredItem>
    tasks: Map<string, StoredItem>
    appointments: Map<string, StoredItem>
    pagination: Map<string, PaginationInfo>
  }
  getDataSize: () => {
    patients: number
    tasks: number
    appointments: number
    pagination: number
  }
}

const generatePaginationKey = (
  resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
): string => {
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
    appointments: new Map(),
    locations: new Map(),
    pagination: new Map(),
    unsubscribeFunctions: {},

    // Set a single item
    setItem: <T extends Patient | Task | Appointment | Location>(
      resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
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
        } else if (resourceType === 'Task') {
          newState.tasks = new Map(state.tasks)
          newState.tasks.set(itemKey, storedItem)
        } else if (resourceType === 'Appointment') {
          newState.appointments = new Map(state.appointments)
          newState.appointments.set(itemKey, storedItem)
        } else if (resourceType === 'Location') {
          newState.locations = new Map(state.locations)
          newState.locations.set(itemKey, storedItem)
        }
        return newState
      })
    },

    // Get a single item
    getItem: (
      resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
      itemId: string,
    ) => {
      const state = get()
      const itemKey = generateItemKey(itemId)
      const dataMap =
        resourceType === 'Patient'
          ? state.patients
          : resourceType === 'Task'
            ? state.tasks
            : resourceType === 'Appointment'
              ? state.appointments
              : state.locations
      const storedItem = dataMap.get(itemKey)
      return storedItem ? storedItem.data : null
    },

    // Remove a single item
    removeItem: (
      resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
      itemId: string,
    ) => {
      const itemKey = generateItemKey(itemId)
      set((state) => {
        const newState = { ...state }
        if (resourceType === 'Patient') {
          newState.patients = new Map(state.patients)
          newState.patients.delete(itemKey)
        } else if (resourceType === 'Task') {
          newState.tasks = new Map(state.tasks)
          newState.tasks.delete(itemKey)
        } else if (resourceType === 'Appointment') {
          newState.appointments = new Map(state.appointments)
          newState.appointments.delete(itemKey)
        } else if (resourceType === 'Location') {
          newState.locations = new Map(state.locations)
          newState.locations.delete(itemKey)
        }
        return newState
      })
    },

    // Set data (replaces existing data)
    setData: (
      resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
      data: Patient[] | Task[] | Appointment[] | Location[],
    ) => {
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
      resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
      newData: Patient[] | Task[] | Appointment[] | Location[],
    ) => {
      for (const item of newData) {
        if (item?.id) {
          get().setItem(resourceType, item)
        }
      }
    },

    // Get data
    getData: (
      resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
    ) => {
      const state = get()
      const dataMap =
        resourceType === 'Patient'
          ? state.patients
          : resourceType === 'Task'
            ? state.tasks
            : resourceType === 'Appointment'
              ? state.appointments
              : state.locations
      const items: (Patient | Task | Appointment | Location)[] = []

      for (const [_, storedItem] of dataMap) {
        items.push(storedItem.data)
      }

      return { data: items as Patient[] | Task[] | Appointment[] | Location[] }
    },

    // Update pagination
    updatePagination: (
      resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
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
    getPagination: (
      resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
    ) => {
      const state = get()
      const paginationKey = generatePaginationKey(resourceType)
      const entry = state.pagination.get(paginationKey)
      return entry ? entry.pagination : null
    },

    // Clear data for a resource type
    clearData: (
      resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
    ) => {
      set((state) => {
        const newState = { ...state }
        if (resourceType === 'Patient') {
          newState.patients = new Map()
        } else if (resourceType === 'Task') {
          newState.tasks = new Map()
        } else if (resourceType === 'Appointment') {
          newState.appointments = new Map()
        } else if (resourceType === 'Location') {
          newState.locations = new Map()
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
        appointments: new Map(),
        pagination: new Map(),
      }))
    },

    // Get worklist data
    getWorklistData: () => {
      const state = get()
      const patientsData = state.getData('Patient')
      const tasksData = state.getData('Task')
      const appointmentsData = state.getData('Appointment')

      if (!patientsData && !tasksData && !appointmentsData) {
        return null
      }

      const patients = (patientsData?.data as Patient[]) || []
      const tasks = (tasksData?.data as Task[]) || []
      const appointments = (appointmentsData?.data as Appointment[]) || []
      const locations = (get().getData('Location')?.data as Location[]) || []

      const worklistPatients = mapPatientsToWorklistPatients(patients, tasks)
      const worklistTasks = mapTasksToWorklistTasks(patients, tasks)
      const worklistAppointments = mapAppointmentsToWorklistAppointments(
        patients,
        appointments,
        locations,
      )

      return {
        patients: worklistPatients,
        tasks: worklistTasks,
        appointments: worklistAppointments,
      }
    },

    // Get worklist data by resource type
    getWorklistDataByResourceType: (
      resourceType: 'Patient' | 'Task' | 'Appointment',
    ) => {
      const state = get()
      const patientsData = state.getData('Patient')
      const tasksData = state.getData('Task')
      const appointmentsData = state.getData('Appointment')

      const requestedData =
        resourceType === 'Patient'
          ? patientsData
          : resourceType === 'Task'
            ? tasksData
            : appointmentsData
      if (!requestedData) {
        return null
      }

      const patients = (patientsData?.data as Patient[]) || []
      const tasks = (tasksData?.data as Task[]) || []

      if (resourceType === 'Patient') {
        return mapPatientsToWorklistPatients(patients, tasks)
      }

      if (resourceType === 'Task') {
        return mapTasksToWorklistTasks(patients, tasks)
      }

      if (resourceType === 'Appointment') {
        const appointments = (appointmentsData?.data as Appointment[]) || []
        const locations = (get().getData('Location')?.data as Location[]) || []
        return mapAppointmentsToWorklistAppointments(
          patients,
          appointments,
          locations,
        )
      }
      return null
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

      // Subscribe to appointment updates
      medplumStoreClient
        .subscribeToAppointments((updatedAppointment: Appointment) => {
          get().setItem('Appointment', updatedAppointment)
        })
        .then((unsubscribe) => {
          set((state) => ({
            ...state,
            unsubscribeFunctions: {
              ...state.unsubscribeFunctions,
              appointments: unsubscribe,
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
        appointments: new Map(state.appointments),
        pagination: new Map(state.pagination),
      }
    },

    getDataSize: () => {
      const state = get()
      return {
        patients: state.patients.size,
        tasks: state.tasks.size,
        appointments: state.appointments.size,
        pagination: state.pagination.size,
      }
    },
  })),
)

// Export the store instance for direct access (similar to the old API)
export const panelDataStoreZustand = {
  // Data methods
  setItem: <T extends Patient | Task | Appointment | Location>(
    resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
    item: T,
  ) => usePanelMedplumDataStore.getState().setItem(resourceType, item),

  getItem: (
    resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
    itemId: string,
  ) => usePanelMedplumDataStore.getState().getItem(resourceType, itemId),

  removeItem: (
    resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
    itemId: string,
  ) => usePanelMedplumDataStore.getState().removeItem(resourceType, itemId),

  setData: (
    resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
    data: Patient[] | Task[] | Appointment[] | Location[],
  ) => usePanelMedplumDataStore.getState().setData(resourceType, data),

  updateData: (
    resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
    newData: Patient[] | Task[] | Appointment[] | Location[],
  ) => usePanelMedplumDataStore.getState().updateData(resourceType, newData),

  getData: (resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location') =>
    usePanelMedplumDataStore.getState().getData(resourceType),

  // Pagination methods
  updatePagination: (
    resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
    pagination: PaginationState,
  ) =>
    usePanelMedplumDataStore
      .getState()
      .updatePagination(resourceType, pagination),

  getPagination: (
    resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location',
  ) => usePanelMedplumDataStore.getState().getPagination(resourceType),

  // Utility methods
  clearData: (resourceType: 'Patient' | 'Task' | 'Appointment' | 'Location') =>
    usePanelMedplumDataStore.getState().clearData(resourceType),

  clearAllData: () => usePanelMedplumDataStore.getState().clearAllData(),

  // Worklist methods
  getWorklistData: () => usePanelMedplumDataStore.getState().getWorklistData(),

  getWorklistDataByResourceType: (
    resourceType: 'Patient' | 'Task' | 'Appointment',
  ) =>
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
