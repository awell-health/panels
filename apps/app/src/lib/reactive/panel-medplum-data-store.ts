import { createStore, type Store } from 'tinybase'
import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'
import {
  mapPatientsToWorklistPatients,
  mapTasksToWorklistTasks,
} from '@/lib/fhir-to-table-data'
import type { Patient, Task } from '@medplum/fhirtypes'
import type { MedplumStoreClient } from '@/lib/medplum-client'

const PATIENTS_TABLE = 'patients'
const TASKS_TABLE = 'tasks'
const METADATA_TABLE = 'metadata'

interface PaginationState {
  nextCursor?: string
  hasMore: boolean
}

interface PanelMetadata {
  panelId: string
  resourceType: 'Patient' | 'Task'
  pagination: PaginationState
  lastUpdated: string
  itemCount: number
}

export interface ReactiveDataGetter<T> {
  getData: () => T[] | null
  getPagination: () => PaginationState | null
  getLastUpdated: () => string | null
  getItem: (id: string) => T | null
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
    // Separate tables for patients and tasks
    this.store.setTable(PATIENTS_TABLE, {})
    this.store.setTable(TASKS_TABLE, {})
    // Table for panel metadata
    this.store.setTable(METADATA_TABLE, {})
  }

  /**
   * Generate a unique key for a panel and resource type
   */
  private generateMetadataKey(resourceType: 'Patient' | 'Task'): string {
    // for now we dont yet have different data per panel
    return `default:${resourceType}`
  }

  /**
   * Subscribe to data changes for a specific panel and resource type
   * Returns a reactive data getter that will automatically update when data changes
   */
  subscribeToData<T extends Patient | Task>(
    resourceType: 'Patient' | 'Task',
  ): ReactiveDataGetter<T> {
    const metadataKey = this.generateMetadataKey(resourceType)
    const tableName = resourceType === 'Patient' ? PATIENTS_TABLE : TASKS_TABLE

    return {
      getData: (): T[] | null => {
        const metadata = this.store.getRow(METADATA_TABLE, metadataKey)
        if (!metadata) return null

        // Get all items for this panel/resource type
        const allRows = this.store.getTable(tableName)
        const items: T[] = []

        for (const [key, row] of Object.entries(allRows)) {
          try {
            const item = JSON.parse(row.data as string) as T
            items.push(item)
          } catch (error) {
            console.warn('Failed to parse item data:', error)
          }
        }

        return items
      },

      getPagination: (): PaginationState | null => {
        const metadata = this.store.getRow(METADATA_TABLE, metadataKey)
        if (!metadata) return null

        try {
          const parsedMetadata = JSON.parse(
            metadata.data as string,
          ) as PanelMetadata
          return parsedMetadata.pagination
        } catch (error) {
          console.warn('Failed to parse metadata:', error)
          return null
        }
      },

      getLastUpdated: (): string | null => {
        const metadata = this.store.getRow(METADATA_TABLE, metadataKey)
        if (!metadata) return null

        try {
          const parsedMetadata = JSON.parse(
            metadata.data as string,
          ) as PanelMetadata
          return parsedMetadata.lastUpdated
        } catch (error) {
          console.warn('Failed to parse metadata:', error)
          return null
        }
      },

      getItem: (id: string): T | null => {
        const itemKey = `default:${id}`
        const row = this.store.getRow(tableName, itemKey)

        if (!row || !row.data) return null

        try {
          return JSON.parse(row.data as string) as T
        } catch (error) {
          console.warn('Failed to parse item data:', error)
          return null
        }
      },
    }
  }

  /**
   * Get a reactive subscription to data changes for a specific panel and resource type
   * This method returns the TinyBase store and key for use with TinyBase's reactive hooks
   */
  getReactiveSubscription(resourceType: 'Patient' | 'Task'): {
    store: Store
    table: string
    key: string
  } {
    const key = this.generateMetadataKey(resourceType)
    return {
      store: this.store,
      table: METADATA_TABLE,
      key,
    }
  }

  /**
   * Get a reactive subscription to a specific item
   */
  getItemReactiveSubscription(
    resourceType: 'Patient' | 'Task',
    itemId: string,
  ): { store: Store; table: string; key: string } {
    const tableName = resourceType === 'Patient' ? PATIENTS_TABLE : TASKS_TABLE
    const key = `default:${itemId}`
    return {
      store: this.store,
      table: tableName,
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
    // Store the native FHIR Patient resource
    this.setItem('Patient', updatedPatient)

    // Update metadata
    this.updateMetadata('Patient')
  }

  /**
   * Handle task updates from MedplumStore
   */
  private handleTaskUpdate(updatedTask: Task): void {
    // Store the native FHIR Task resource
    this.setItem('Task', updatedTask)

    // Update metadata
    this.updateMetadata('Task')
  }

  /**
   * Set a single item
   */
  setItem<T extends Patient | Task>(
    resourceType: 'Patient' | 'Task',
    item: T,
  ): void {
    const panelId = 'default'
    const tableName = resourceType === 'Patient' ? PATIENTS_TABLE : TASKS_TABLE
    const itemKey = `${panelId}:${item.id}`

    this.store.setRow(tableName, itemKey, {
      data: JSON.stringify(item),
      panelId,
      resourceType,
      itemId: item.id || '',
      lastUpdated: new Date().toISOString(),
    })
  }

  /**
   * Remove a single item
   */
  removeItem(resourceType: 'Patient' | 'Task', itemId: string): void {
    const panelId = 'default'
    const tableName = resourceType === 'Patient' ? PATIENTS_TABLE : TASKS_TABLE
    const itemKey = `${panelId}:${itemId}`
    this.store.delRow(tableName, itemKey)
    this.updateMetadata(resourceType)
  }

  /**
   * Update metadata for a panel/resource type combination
   */
  private updateMetadata(resourceType: 'Patient' | 'Task'): void {
    const metadataKey = this.generateMetadataKey(resourceType)
    const tableName = resourceType === 'Patient' ? PATIENTS_TABLE : TASKS_TABLE
    const panelId = 'default'

    // Count items for this panel/resource type
    const allRows = this.store.getTable(tableName)
    let itemCount = 0

    for (const key of Object.keys(allRows)) {
      if (key.startsWith(`${panelId}:`)) {
        itemCount++
      }
    }

    // Get existing metadata or create new
    const existingMetadata = this.store.getRow(METADATA_TABLE, metadataKey)
    let pagination: PaginationState = { hasMore: false }

    if (existingMetadata) {
      try {
        const parsed = JSON.parse(
          existingMetadata.data as string,
        ) as PanelMetadata
        pagination = parsed.pagination
      } catch (error) {
        console.warn('Failed to parse existing metadata:', error)
      }
    }

    const metadata: PanelMetadata = {
      panelId,
      resourceType,
      pagination,
      lastUpdated: new Date().toISOString(),
      itemCount,
    }

    this.store.setRow(METADATA_TABLE, metadataKey, {
      data: JSON.stringify(metadata),
      panelId,
      resourceType,
      lastUpdated: metadata.lastUpdated,
    })
  }

  /**
   * Set data and pagination state for a panel
   */
  setData(
    resourceType: 'Patient' | 'Task',
    data: Patient[] | Task[],
    pagination?: PaginationState,
  ): void {
    if (!data || !Array.isArray(data)) {
      console.warn('Invalid data provided to cache:', {
        resourceType,
        data,
      })
      return
    }

    // Clear existing items for this panel/resource type
    this.clearData(resourceType)

    // Add each item individually
    for (const item of data) {
      this.setItem(resourceType, item)
    }

    // Update metadata
    const metadataKey = this.generateMetadataKey(resourceType)
    const metadata: PanelMetadata = {
      panelId: 'default',
      resourceType,
      pagination: pagination || { hasMore: true },
      lastUpdated: new Date().toISOString(),
      itemCount: data.length,
    }

    this.store.setRow(METADATA_TABLE, metadataKey, {
      data: JSON.stringify(metadata),
      panelId: 'default',
      resourceType,
      lastUpdated: metadata.lastUpdated,
    })
  }

  /**
   * Update existing data (append new data) and pagination state
   */
  updateData(
    resourceType: 'Patient' | 'Task',
    newData: Patient[] | Task[],
    pagination?: PaginationState,
  ): void {
    // Add new items individually
    for (const item of newData) {
      this.setItem(resourceType, item)
    }

    // Update metadata with new pagination
    if (pagination) {
      const metadataKey = this.generateMetadataKey(resourceType)
      const existingMetadata = this.store.getRow(METADATA_TABLE, metadataKey)

      let metadata: PanelMetadata
      if (existingMetadata) {
        try {
          const parsed = JSON.parse(
            existingMetadata.data as string,
          ) as PanelMetadata
          metadata = {
            ...parsed,
            pagination,
            lastUpdated: new Date().toISOString(),
          }
        } catch (error) {
          console.warn('Failed to parse existing metadata:', error)
          metadata = {
            panelId: 'default',
            resourceType,
            pagination,
            lastUpdated: new Date().toISOString(),
            itemCount: 0,
          }
        }
      } else {
        metadata = {
          panelId: 'default',
          resourceType,
          pagination,
          lastUpdated: new Date().toISOString(),
          itemCount: 0,
        }
      }

      this.store.setRow(METADATA_TABLE, metadataKey, {
        data: JSON.stringify(metadata),
        panelId: 'default',
        resourceType,
        lastUpdated: metadata.lastUpdated,
      })
    }
  }

  /**
   * Get data and pagination state for a panel
   */
  getData(resourceType: 'Patient' | 'Task'): {
    data: Patient[] | Task[]
    pagination: PaginationState
  } | null {
    const metadataKey = this.generateMetadataKey(resourceType)
    const tableName = resourceType === 'Patient' ? PATIENTS_TABLE : TASKS_TABLE
    const entry = this.store.getRow(METADATA_TABLE, metadataKey)

    if (!entry || !entry.data) {
      return null
    }

    try {
      const cachedData = JSON.parse(entry.data as string) as PanelMetadata

      // Get all items for this panel/resource type
      const allRows = this.store.getTable(tableName)
      const items: (Patient | Task)[] = []

      for (const [_, row] of Object.entries(allRows)) {
        try {
          const item = JSON.parse(row.data as string) as Patient | Task
          items.push(item)
        } catch (error) {
          console.warn('Failed to parse item data:', error)
        }
      }

      return {
        data: items as Patient[] | Task[],
        pagination: cachedData.pagination,
      }
    } catch (error) {
      console.warn('Failed to parse cached data:', error)
      return null
    }
  }

  /**
   * Update only the pagination state for a panel
   */
  updatePagination(
    resourceType: 'Patient' | 'Task',
    pagination: PaginationState,
  ): void {
    const panelId = 'default'
    const existing = this.getData(resourceType)

    if (existing) {
      const metadataKey = this.generateMetadataKey(resourceType)
      const existingMetadata = this.store.getRow(METADATA_TABLE, metadataKey)

      let metadata: PanelMetadata
      if (existingMetadata) {
        try {
          const parsed = JSON.parse(
            existingMetadata.data as string,
          ) as PanelMetadata
          metadata = {
            ...parsed,
            pagination,
            lastUpdated: new Date().toISOString(),
          }
        } catch (error) {
          console.warn('Failed to parse existing metadata:', error)
          metadata = {
            panelId,
            resourceType,
            pagination,
            lastUpdated: new Date().toISOString(),
            itemCount: existing.data.length,
          }
        }
      } else {
        metadata = {
          panelId,
          resourceType,
          pagination,
          lastUpdated: new Date().toISOString(),
          itemCount: existing.data.length,
        }
      }

      this.store.setRow(METADATA_TABLE, metadataKey, {
        data: JSON.stringify(metadata),
        panelId,
        resourceType,
        lastUpdated: metadata.lastUpdated,
      })
    }
  }

  /**
   * Clear data for a panel
   */
  clearData(resourceType: 'Patient' | 'Task'): void {
    const tableName = resourceType === 'Patient' ? PATIENTS_TABLE : TASKS_TABLE
    const panelId = 'default'
    const allRows = this.store.getTable(tableName)
    const keysToDelete: string[] = []

    for (const key of Object.keys(allRows)) {
      if (key.startsWith(`${panelId}:`)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.store.delRow(tableName, key)
    }

    const metadataKey = this.generateMetadataKey(resourceType)
    this.store.delRow(METADATA_TABLE, metadataKey)
  }

  /**
   * Clear all data
   */
  clearAllData(): void {
    this.store.setTable(PATIENTS_TABLE, {})
    this.store.setTable(TASKS_TABLE, {})
    this.store.setTable(METADATA_TABLE, {})
  }

  /**
   * Get the underlying TinyBase store for reactive hooks
   */
  getStore(): Store {
    return this.store
  }

  /**
   * Get transformed worklist data for a panel
   * This method transforms the stored FHIR resources to worklist format on-demand
   */
  getWorklistData(): {
    patients: WorklistPatient[]
    tasks: WorklistTask[]
  } | null {
    const patientsData = this.getData('Patient')
    const tasksData = this.getData('Task')

    if (!patientsData && !tasksData) {
      return null
    }

    const patients = (patientsData?.data as Patient[]) || []
    const tasks = (tasksData?.data as Task[]) || []

    // Transform to worklist format
    const worklistPatients = mapPatientsToWorklistPatients(patients, tasks)
    const worklistTasks = mapTasksToWorklistTasks(patients, tasks)

    return {
      patients: worklistPatients,
      tasks: worklistTasks,
    }
  }

  getWorklistDataByResourceType(
    resourceType: 'Patient' | 'Task',
  ): WorklistPatient[] | WorklistTask[] | null {
    const patientsData = this.getData('Patient')
    const tasksData = this.getData('Task')

    // Get the data for the requested resource type
    const requestedData = resourceType === 'Patient' ? patientsData : tasksData

    // If the requested resource type has no data, return null
    if (!requestedData) {
      return null
    }

    const patients = (patientsData?.data as Patient[]) || []
    const tasks = (tasksData?.data as Task[]) || []

    return resourceType === 'Patient'
      ? mapPatientsToWorklistPatients(patients, tasks)
      : mapTasksToWorklistTasks(patients, tasks)
  }
}

export const panelDataStore = new PanelMedplumDataStore()
