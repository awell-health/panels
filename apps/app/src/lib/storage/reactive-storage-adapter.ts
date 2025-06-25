import type {
  PanelDefinition,
  ViewDefinition,
  ColumnDefinition,
} from '@/types/worklist'
import type { StorageAdapter } from './types'
import { ReactiveStore } from '../reactive/reactive-store'
import { APIStorageAdapter } from './api-storage-adapter'

/**
 * Reactive Storage Adapter - Integrates TinyBase with existing storage system
 * Provides reactive updates while maintaining compatibility with existing APIs
 */
export class ReactiveStorageAdapter implements StorageAdapter {
  private reactiveStore: ReactiveStore
  private underlyingAdapter: StorageAdapter | null = null
  private isInitialized = false

  constructor(userId?: string, organizationSlug?: string) {
    this.reactiveStore = new ReactiveStore()
    this.initializeUnderlyingAdapter(userId, organizationSlug)
  }

  private async initializeUnderlyingAdapter(
    userId?: string,
    organizationSlug?: string,
  ) {
    try {
      // Use API adapter directly to avoid circular dependency
      this.underlyingAdapter = new APIStorageAdapter(userId, organizationSlug)
      this.isInitialized = true

      // Load initial data from underlying adapter
      await this.loadInitialData()
    } catch (error) {
      console.error(
        'ReactiveStorageAdapter: Failed to initialize underlying storage adapter:',
        error,
      )
      throw error
    }
  }

  private async loadInitialData() {
    if (!this.underlyingAdapter) {
      return
    }

    try {
      this.reactiveStore.setLoading(true)

      // Load panels from underlying adapter
      const panels = await this.underlyingAdapter.getPanels()
      this.reactiveStore.setPanels(panels)

      // Views will be loaded when needed via getView calls
      this.reactiveStore.setLastSync(Date.now())
    } catch (error) {
      console.error(
        'ReactiveStorageAdapter: Failed to load initial data:',
        error,
      )
      this.reactiveStore.setError(
        error instanceof Error ? error.message : 'Unknown error',
      )
    } finally {
      this.reactiveStore.setLoading(false)
    }
  }

  async getPanels(): Promise<PanelDefinition[]> {
    if (!this.isInitialized) {
      await this.waitForInitialization()
    }
    const panels = this.reactiveStore.getPanels()
    return panels
  }

  async getPanel(id: string): Promise<PanelDefinition | null> {
    if (!this.isInitialized) {
      await this.waitForInitialization()
    }
    const panel = this.reactiveStore.getPanel(id) || null
    return panel
  }

  async createPanel(
    panel: Omit<PanelDefinition, 'id'>,
  ): Promise<PanelDefinition> {
    if (!this.underlyingAdapter) {
      throw new Error('Storage adapter not initialized')
    }

    try {
      // Create panel in underlying adapter
      const createdPanel = await this.underlyingAdapter.createPanel(panel)

      // Add to reactive store
      this.reactiveStore.setPanel(createdPanel)

      return createdPanel
    } catch (error) {
      console.error('Failed to create panel:', error)
      throw error
    }
  }

  async updatePanel(
    id: string,
    updates: Partial<PanelDefinition>,
  ): Promise<void> {
    if (!this.underlyingAdapter) {
      throw new Error('Storage adapter not initialized')
    }

    try {
      // Update in underlying adapter
      await this.underlyingAdapter.updatePanel(id, updates)

      // Update in reactive store
      this.reactiveStore.updatePanel(id, updates)
    } catch (error) {
      console.error('Failed to update panel:', error)
      throw error
    }
  }

  async deletePanel(id: string): Promise<void> {
    if (!this.underlyingAdapter) {
      throw new Error('Storage adapter not initialized')
    }

    try {
      // Delete from underlying adapter
      await this.underlyingAdapter.deletePanel(id)

      // Delete from reactive store
      this.reactiveStore.deletePanel(id)
    } catch (error) {
      console.error('Failed to delete panel:', error)
      throw error
    }
  }

  async addView(
    panelId: string,
    view: Omit<ViewDefinition, 'id'>,
  ): Promise<ViewDefinition> {
    if (!this.underlyingAdapter) {
      throw new Error('Storage adapter not initialized')
    }

    try {
      // Add view in underlying adapter
      const createdView = await this.underlyingAdapter.addView(panelId, view)

      // Add to reactive store
      this.reactiveStore.setView(panelId, createdView)

      return createdView
    } catch (error) {
      console.error('Failed to add view:', error)
      throw error
    }
  }

  async updateView(
    panelId: string,
    viewId: string,
    updates: Partial<ViewDefinition>,
  ): Promise<void> {
    if (!this.underlyingAdapter) {
      throw new Error('Storage adapter not initialized')
    }

    try {
      // Update in underlying adapter
      await this.underlyingAdapter.updateView(panelId, viewId, updates)

      // Update in reactive store
      this.reactiveStore.updateView(panelId, viewId, updates)
    } catch (error) {
      console.error('Failed to update view:', error)
      throw error
    }
  }

  async deleteView(panelId: string, viewId: string): Promise<void> {
    if (!this.underlyingAdapter) {
      throw new Error('Storage adapter not initialized')
    }

    try {
      // Delete from underlying adapter
      await this.underlyingAdapter.deleteView(panelId, viewId)

      // Delete from reactive store
      this.reactiveStore.deleteView(panelId, viewId)
    } catch (error) {
      console.error('Failed to delete view:', error)
      throw error
    }
  }

  async updateColumn(
    panelId: string,
    columnId: string,
    updates: Partial<ColumnDefinition>,
  ): Promise<void> {
    if (!this.underlyingAdapter) {
      throw new Error('Storage adapter not initialized')
    }

    try {
      // Update in underlying adapter
      await this.underlyingAdapter.updateColumn(panelId, columnId, updates)

      // Update in reactive store
      this.reactiveStore.updateColumn(panelId, columnId, updates)
    } catch (error) {
      console.error('Failed to update column:', error)
      throw error
    }
  }

  async getView(
    panelId: string,
    viewId: string,
  ): Promise<ViewDefinition | null> {
    if (!this.isInitialized) {
      await this.waitForInitialization()
    }
    return this.reactiveStore.getView(panelId, viewId) || null
  }

  async getViewsForPanel(panelId: string): Promise<ViewDefinition[]> {
    if (!this.isInitialized) {
      await this.waitForInitialization()
    }
    return this.reactiveStore.getViewsForPanel(panelId)
  }

  isLoading(): boolean {
    return this.reactiveStore.getLoading()
  }

  // Helper methods for reactive store access
  getReactiveStore(): ReactiveStore {
    return this.reactiveStore
  }

  // Wait for initialization to complete
  private async waitForInitialization(): Promise<void> {
    return new Promise((resolve) => {
      const checkInitialized = () => {
        if (this.isInitialized) {
          resolve()
        } else {
          setTimeout(checkInitialized, 10)
        }
      }
      checkInitialized()
    })
  }
}
