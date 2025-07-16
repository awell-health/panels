import { createStore, type Store } from 'tinybase'
import type { WorklistPatient, WorklistTask } from '@/hooks/use-medplum-store'

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

class PanelMedplumDataStore {
  private store: Store

  constructor() {
    this.store = createStore()
    this.initializeStore()
  }

  /**
   * Initialize the TinyBase store structure
   */
  private initializeStore() {
    // Table for panel data - key is "panelId:resourceType"
    this.store.setTable('panelData', {})
  }

  /**
   * Generate a unique key for a panel and resource type
   */
  private generateKey(
    panelId: string,
    resourceType: 'Patient' | 'Task',
  ): string {
    return `${panelId}:${resourceType}`
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
