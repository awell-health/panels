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
const PAGINATION_TABLE = 'pagination'

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
    // Table for pagination information
    this.store.setTable(PAGINATION_TABLE, {})
  }

  /**
   * Generate a unique key for a panel and resource type
   */
  private generatePaginationKey(resourceType: 'Patient' | 'Task'): string {
    // for now we dont yet have different data per panel
    return `default:${resourceType}`
  }

  /**
   * Get a reactive subscription to data changes for a specific panel and resource type
   * This method returns the TinyBase store and key for use with TinyBase's reactive hooks
   */
  getPaginationReactiveSubscription(resourceType: 'Patient' | 'Task'): {
    store: Store
    table: string
    key: string
  } {
    const key = this.generatePaginationKey(resourceType)
    return {
      store: this.store,
      table: PAGINATION_TABLE,
      key,
    }
  }

  getDataReactiveTableSubscription(resourceType: 'Patient' | 'Task'): {
    store: Store
    table: string
  } {
    return {
      store: this.store,
      table: resourceType === 'Patient' ? PATIENTS_TABLE : TASKS_TABLE,
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
  }

  /**
   * Handle task updates from MedplumStore
   */
  private handleTaskUpdate(updatedTask: Task): void {
    // Store the native FHIR Task resource
    this.setItem('Task', updatedTask)
  }

  /**
   * Set a single item
   */
  setItem<T extends Patient | Task>(
    resourceType: 'Patient' | 'Task',
    item: T,
  ): void {
    // Validate item has required properties
    if (!item || !item.id) {
      console.warn('Invalid item provided to setItem:', { resourceType, item })
      return
    }

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
  }

  setData(resourceType: 'Patient' | 'Task', data: Patient[] | Task[]): void {
    if (!data || !Array.isArray(data)) {
      console.warn('Invalid data provided to cache:', {
        resourceType,
        data,
      })
      return
    }

    // Clear existing items for this panel/resource type
    this.clearData(resourceType)

    // Add each item individually, but skip invalid items
    for (const item of data) {
      if (item?.id) {
        this.setItem(resourceType, item)
      }
    }
  }

  updateData(
    resourceType: 'Patient' | 'Task',
    newData: Patient[] | Task[],
  ): void {
    // Add new items individually, but skip invalid items
    for (const item of newData) {
      if (item?.id) {
        this.setItem(resourceType, item)
      }
    }
  }

  /**
   * Get data and pagination state for a panel
   */
  getData(resourceType: 'Patient' | 'Task'): {
    data: Patient[] | Task[]
  } | null {
    const tableName = resourceType === 'Patient' ? PATIENTS_TABLE : TASKS_TABLE
    try {
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
      }
    } catch (error) {
      console.warn('Failed to parse cached pagination info:', error)
      return null
    }
  }

  getPagination(resourceType: 'Patient' | 'Task'): PaginationState | null {
    const paginationKey = this.generatePaginationKey(resourceType)
    const entry = this.store.getRow(PAGINATION_TABLE, paginationKey)
    if (!entry || !entry.data) {
      return null
    }

    try {
      const parsed = JSON.parse(entry.data as string) as PaginationInfo
      return parsed.pagination
    } catch (error) {
      console.warn('Failed to parse cached pagination info:', error)
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
    const paginationKey = this.generatePaginationKey(resourceType)
    const existing = this.store.getRow(PAGINATION_TABLE, paginationKey)

    let paginationInfo: PaginationInfo
    if (existing?.data) {
      try {
        const parsed = JSON.parse(existing.data as string) as PaginationInfo
        paginationInfo = {
          ...parsed,
          pagination,
          lastUpdated: new Date().toISOString(),
        }
      } catch (error) {
        console.warn('Failed to parse existing pagination info:', error)
        paginationInfo = {
          panelId,
          resourceType,
          pagination,
          lastUpdated: new Date().toISOString(),
          itemCount: 0,
        }
      }
    } else {
      paginationInfo = {
        panelId,
        resourceType,
        pagination,
        lastUpdated: new Date().toISOString(),
        itemCount: 0,
      }
    }

    this.store.setRow(PAGINATION_TABLE, paginationKey, {
      data: JSON.stringify(paginationInfo),
      panelId,
      resourceType,
      lastUpdated: paginationInfo.lastUpdated,
    })
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

    const paginationKey = this.generatePaginationKey(resourceType)
    this.store.delRow(PAGINATION_TABLE, paginationKey)
  }

  /**
   * Clear all data
   */
  clearAllData(): void {
    this.store.setTable(PATIENTS_TABLE, {})
    this.store.setTable(TASKS_TABLE, {})
    this.store.setTable(PAGINATION_TABLE, {})
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
