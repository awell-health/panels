import { createStore, type Store } from 'tinybase'
import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'
import {
  mapPatientsToWorklistPatients,
  mapTasksToWorklistTasks,
} from '@/lib/fhir-to-table-data'
import type { Patient, Task } from '@medplum/fhirtypes'
import type { MedplumStoreClient } from '@/lib/medplum-client'

const TABLE_NAME = 'panelData'
interface PaginationState {
  nextCursor?: string
  hasMore: boolean
}

interface CachedData {
  data: WorklistPatient[] | WorklistTask[]
  pagination: PaginationState
  lastUpdated: string
  panelId: string
  resourceType: 'Patient' | 'Task'
}

export interface ReactiveDataGetter<T> {
  getData: () => T[] | null
  getPagination: () => PaginationState | null
  getLastUpdated: () => string | null
}

class PanelMedplumDataStore {
  private store: Store
  private unsubscribeFunctions: { patients?: () => void; tasks?: () => void } =
    {}

  constructor() {
    this.store = createStore()
    this.initializeStore()
  }

  /**
   * Initialize the TinyBase store structure
   */
  private initializeStore() {
    // Table for panel data - key is "panelId:resourceType"
    this.store.setTable(TABLE_NAME, {})
  }

  /**
   * Generate a unique key for a panel and resource type
   */
  private generateKey(
    panelId: string,
    resourceType: 'Patient' | 'Task',
  ): string {
    // for now we dont yet have different data per panel
    return `${resourceType}`
  }

  /**
   * Subscribe to data changes for a specific panel and resource type
   * Returns a reactive data getter that will automatically update when data changes
   */
  subscribeToData<T extends WorklistPatient | WorklistTask>(
    panelId: string,
    resourceType: 'Patient' | 'Task',
  ): ReactiveDataGetter<T> {
    const key = this.generateKey(panelId, resourceType)

    return {
      getData: (): T[] | null => {
        const entry = this.store.getRow('panelData', key)
        if (!entry || !entry.data) {
          return null
        }

        try {
          const cachedData = JSON.parse(entry.data as string) as CachedData
          return cachedData.data as T[]
        } catch (error) {
          console.warn('Failed to parse cached data:', error)
          return null
        }
      },

      getPagination: (): PaginationState | null => {
        const entry = this.store.getRow('panelData', key)
        if (!entry || !entry.data) {
          return null
        }

        try {
          const cachedData = JSON.parse(entry.data as string) as CachedData
          return cachedData.pagination
        } catch (error) {
          console.warn('Failed to parse cached data:', error)
          return null
        }
      },

      getLastUpdated: (): string | null => {
        const entry = this.store.getRow('panelData', key)
        if (!entry || !entry.data) {
          return null
        }

        try {
          const cachedData = JSON.parse(entry.data as string) as CachedData
          return cachedData.lastUpdated
        } catch (error) {
          console.warn('Failed to parse cached data:', error)
          return null
        }
      },
    }
  }

  /**
   * Get a reactive subscription to data changes for a specific panel and resource type
   * This method returns the TinyBase store and key for use with TinyBase's reactive hooks
   */
  getReactiveSubscription(
    panelId: string,
    resourceType: 'Patient' | 'Task',
  ): { store: Store; table: string; key: string } {
    const key = this.generateKey(panelId, resourceType)
    return {
      store: this.store,
      table: TABLE_NAME,
      key,
    }
  }

  /**
   * Register this store as a listener to MedplumStore
   */
  registerAsListener(medplumStoreClient: MedplumStoreClient): void {
    // Subscribe to patient updates
    medplumStoreClient
      .subscribeToPatients((updatedPatient: Patient) => {
        this.handlePatientUpdate(updatedPatient)
      })
      .then((unsubscribe) => {
        this.unsubscribeFunctions.patients = unsubscribe
      })

    // Subscribe to task updates
    medplumStoreClient
      .subscribeToTasks((updatedTask: Task) => {
        this.handleTaskUpdate(updatedTask)
      })
      .then((unsubscribe) => {
        this.unsubscribeFunctions.tasks = unsubscribe
      })
  }

  /**
   * Handle patient updates from MedplumStore
   */
  private handlePatientUpdate(updatedPatient: Patient): void {
    // Get current patients data
    const currentData = this.getData('default', 'Patient')
    if (!currentData) return

    const currentPatients = currentData.data as WorklistPatient[]

    // Find and update the patient
    const patientIndex = currentPatients.findIndex(
      (p) => p.id === updatedPatient.id,
    )
    if (patientIndex !== -1) {
      // Update existing patient
      const updatedWorklistPatient = mapPatientsToWorklistPatients(
        [updatedPatient],
        [],
      )
      if (updatedWorklistPatient.length > 0) {
        const newPatients = [...currentPatients]
        newPatients[patientIndex] = updatedWorklistPatient[0]
        this.setData('default', 'Patient', newPatients, currentData.pagination)
      }
    } else {
      // Add new patient
      const newWorklistPatient = mapPatientsToWorklistPatients(
        [updatedPatient],
        [],
      )
      if (newWorklistPatient.length > 0) {
        const newPatients = [...currentPatients, newWorklistPatient[0]]
        this.setData('default', 'Patient', newPatients, currentData.pagination)
      }
    }
  }

  /**
   * Handle task updates from MedplumStore
   */
  private handleTaskUpdate(updatedTask: Task): void {
    // Get current tasks data
    const currentData = this.getData('default', 'Task')
    if (!currentData) return

    const currentTasks = currentData.data as WorklistTask[]

    // Find and update the task
    const taskIndex = currentTasks.findIndex((t) => t.id === updatedTask.id)
    if (taskIndex !== -1) {
      // Update existing task
      const updatedWorklistTask = mapTasksToWorklistTasks([], [updatedTask])
      if (updatedWorklistTask.length > 0) {
        const newTasks = [...currentTasks]
        newTasks[taskIndex] = updatedWorklistTask[0]
        this.setData('default', 'Task', newTasks, currentData.pagination)
      }
    } else {
      // Add new task
      const newWorklistTask = mapTasksToWorklistTasks([], [updatedTask])
      if (newWorklistTask.length > 0) {
        const newTasks = [...currentTasks, newWorklistTask[0]]
        this.setData('default', 'Task', newTasks, currentData.pagination)
      }
    }
  }

  /**
   * Get data and pagination state for a panel
   */
  getData(
    panelId: string,
    resourceType: 'Patient' | 'Task',
  ): {
    data: WorklistPatient[] | WorklistTask[]
    pagination: PaginationState
  } | null {
    const key = this.generateKey(panelId, resourceType)
    const entry = this.store.getRow('panelData', key)

    if (!entry || !entry.data) {
      return null
    }

    try {
      const cachedData = JSON.parse(entry.data as string) as CachedData
      return {
        data: cachedData.data,
        pagination: cachedData.pagination,
      }
    } catch (error) {
      console.warn('Failed to parse cached data:', error)
      return null
    }
  }

  /**
   * Set data and pagination state for a panel
   */
  setData(
    panelId: string,
    resourceType: 'Patient' | 'Task',
    data: WorklistPatient[] | WorklistTask[],
    pagination?: PaginationState,
  ): void {
    if (!data || !Array.isArray(data)) {
      console.warn('Invalid data provided to cache:', {
        panelId,
        resourceType,
        data,
      })
      return
    }

    const key = this.generateKey(panelId, resourceType)

    try {
      const cachedData: CachedData = {
        data,
        pagination: pagination || {
          hasMore: false,
        },
        lastUpdated: new Date().toISOString(),
        panelId,
        resourceType,
      }

      this.store.setRow('panelData', key, {
        data: JSON.stringify(cachedData),
        lastUpdated: cachedData.lastUpdated,
        panelId,
        resourceType,
      })
    } catch (error) {
      console.error('Failed to cache data:', error)
    }
  }

  /**
   * Update existing data (append new data) and pagination state
   */
  updateData(
    panelId: string,
    resourceType: 'Patient' | 'Task',
    newData: WorklistPatient[] | WorklistTask[],
    pagination?: PaginationState,
  ): void {
    const existing = this.getData(panelId, resourceType)

    if (existing) {
      // Merge new data with existing data
      const mergedData = [...existing.data, ...newData] as
        | WorklistPatient[]
        | WorklistTask[]

      // Use new pagination state if provided, otherwise keep existing
      const mergedPagination = pagination || existing.pagination

      this.setData(panelId, resourceType, mergedData, mergedPagination)
    } else {
      // Create new entry
      this.setData(panelId, resourceType, newData, pagination)
    }
  }

  /**
   * Update only the pagination state for a panel
   */
  updatePagination(
    panelId: string,
    resourceType: 'Patient' | 'Task',
    pagination: PaginationState,
  ): void {
    const existing = this.getData(panelId, resourceType)

    if (existing) {
      this.setData(panelId, resourceType, existing.data, pagination)
    }
  }

  /**
   * Remove data for a panel
   */
  removeData(panelId: string, resourceType: 'Patient' | 'Task'): void {
    const key = this.generateKey(panelId, resourceType)
    this.store.delRow('panelData', key)
  }

  /**
   * Clear all data
   */
  clearAllData(): void {
    this.store.setTable('panelData', {})
  }

  /**
   * Get the underlying TinyBase store for reactive hooks
   */
  getStore(): Store {
    return this.store
  }

  /**
   * Get all cached data (for debugging)
   */
  getAllData(): Record<string, CachedData> {
    const entries = this.store.getTable('panelData')
    const result: Record<string, CachedData> = {}

    for (const [key, entry] of Object.entries(entries)) {
      try {
        const cachedData = JSON.parse(entry.data as string) as CachedData
        result[key] = cachedData
      } catch (error) {
        console.warn('Failed to parse cached data for key:', key, error)
      }
    }

    return result
  }
}

export const panelDataStore = new PanelMedplumDataStore()
