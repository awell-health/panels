import type { Panel, View, Column } from '@/types/panel'
import type { ACL, ACLCreate, ACLUpdate } from '@panels/types/acls'
import type { StorageAdapter } from './types'
import { ReactiveStore } from '../reactive/reactive-store'
import { APIStorageAdapter } from './api-storage-adapter'

/**
 * Reactive Storage Adapter - Integrates TinyBase with existing storage system
 * Provides reactive updates while maintaining compatibility with existing APIs
 * Now handles panels, views, and columns as separate entities
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

  async getPanels(): Promise<Panel[]> {
    if (!this.isInitialized) {
      await this.waitForInitialization()
    }
    const panels = this.reactiveStore.getPanels()
    return panels
  }

  async getPanel(id: string): Promise<Panel | null> {
    if (!this.isInitialized) {
      await this.waitForInitialization()
    }
    const panel = this.reactiveStore.getPanel(id) || null
    return panel
  }

  async createPanel(panel: Omit<Panel, 'id'>): Promise<Panel> {
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

  async updatePanel(id: string, updates: Partial<Panel>): Promise<Panel> {
    if (!this.underlyingAdapter) {
      throw new Error('Storage adapter not initialized')
    }

    try {
      // Update in underlying adapter
      const updatedPanel = await this.underlyingAdapter.updatePanel(id, updates)

      // Update in reactive store
      this.reactiveStore.setPanel(updatedPanel)

      return updatedPanel
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

      // Delete from reactive store (this will also remove associated views and columns)
      this.reactiveStore.deletePanel(id)
    } catch (error) {
      console.error('Failed to delete panel:', error)
      throw error
    }
  }

  // Get all views across all panels
  async getViews(): Promise<View[]> {
    if (!this.underlyingAdapter) {
      throw new Error('Storage adapter not initialized')
    }

    try {
      // Delegate to underlying adapter
      const views = await this.underlyingAdapter.getViews()

      // Update reactive store with the views
      this.reactiveStore.setViews(views)

      return views
    } catch (error) {
      console.error('Failed to get all views:', error)
      throw error
    }
  }

  // Get all columns across all panels
  async getColumns(): Promise<Column[]> {
    if (!this.underlyingAdapter) {
      throw new Error('Storage adapter not initialized')
    }

    try {
      // Delegate to underlying adapter
      const columns = await this.underlyingAdapter.getColumns()

      // Update reactive store with the columns
      this.reactiveStore.setColumns(columns)

      return columns
    } catch (error) {
      console.error('Failed to get all columns:', error)
      throw error
    }
  }

  // Column operations - now separate from panels
  async getColumnsForPanel(panelId: string): Promise<Column[]> {
    if (!this.isInitialized) {
      await this.waitForInitialization()
    }

    // First check reactive store
    let columns = this.reactiveStore.getColumnsForPanel(panelId)

    // If no columns in reactive store, fetch from underlying adapter
    if (columns.length === 0 && this.underlyingAdapter) {
      try {
        // Note: We'll need to add this method to the underlying adapter
        // For now, we'll return empty array and the underlying adapter should populate this
        const panel = await this.underlyingAdapter.getPanel(panelId)
        if (panel) {
          // The underlying adapter should load columns separately if they exist
          columns = this.reactiveStore.getColumnsForPanel(panelId)
        }
      } catch (error) {
        console.error('Failed to fetch columns for panel:', error)
      }
    }

    return columns
  }

  async addColumn(
    panelId: string,
    column: Omit<Column, 'id'>,
  ): Promise<Column> {
    if (!this.underlyingAdapter) {
      throw new Error('Storage adapter not initialized')
    }

    try {
      // Add column in underlying adapter
      const createdColumn = await this.underlyingAdapter.addColumn(
        panelId,
        column,
      )

      // Add to reactive store
      this.reactiveStore.setColumn(createdColumn)

      return createdColumn
    } catch (error) {
      console.error('Failed to add column:', error)
      throw error
    }
  }

  async updateColumn(
    panelId: string,
    columnId: string,
    updates: Partial<Column>,
  ): Promise<Column> {
    if (!this.underlyingAdapter) {
      throw new Error('Storage adapter not initialized')
    }

    try {
      // Update in underlying adapter
      const updatedColumn = await this.underlyingAdapter.updateColumn(
        panelId,
        columnId,
        updates,
      )

      // Update in reactive store
      this.reactiveStore.setColumn(updatedColumn)

      return updatedColumn
    } catch (error) {
      console.error('Failed to update column:', error)
      throw error
    }
  }

  async deleteColumn(panelId: string, columnId: string): Promise<void> {
    if (!this.underlyingAdapter) {
      throw new Error('Storage adapter not initialized')
    }

    try {
      // Delete from underlying adapter
      await this.underlyingAdapter.deleteColumn(panelId, columnId)

      // Remove from reactive store
      this.reactiveStore.deleteColumn(columnId)
    } catch (error) {
      console.error('Failed to delete column:', error)
      throw error
    }
  }

  // View operations - now separate from panels
  async getViewsForPanel(panelId: string): Promise<View[]> {
    if (!this.isInitialized) {
      await this.waitForInitialization()
    }
    return this.reactiveStore.getViewsForPanel(panelId)
  }

  async addView(panelId: string, view: Omit<View, 'id'>): Promise<View> {
    if (!this.underlyingAdapter) {
      throw new Error('Storage adapter not initialized')
    }

    try {
      // Ensure panelId is set
      const viewWithPanelId = { ...view, panelId }

      // Add view in underlying adapter
      const createdView = await this.underlyingAdapter.addView(
        panelId,
        viewWithPanelId,
      )

      // Add to reactive store
      this.reactiveStore.setView(createdView)

      return createdView
    } catch (error) {
      console.error('Failed to add view:', error)
      throw error
    }
  }

  async updateView(
    panelId: string,
    viewId: string,
    updates: Partial<View>,
  ): Promise<View> {
    if (!this.underlyingAdapter) {
      throw new Error('Storage adapter not initialized')
    }

    try {
      // Update in underlying adapter
      const updatedView = await this.underlyingAdapter.updateView(
        panelId,
        viewId,
        updates,
      )

      // Update in reactive store
      this.reactiveStore.setView(updatedView)

      return updatedView
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
      this.reactiveStore.deleteView(viewId)
    } catch (error) {
      console.error('Failed to delete view:', error)
      throw error
    }
  }

  async getView(panelId: string, viewId: string): Promise<View | null> {
    if (!this.isInitialized) {
      await this.waitForInitialization()
    }
    return this.reactiveStore.getView(panelId, viewId) || null
  }

  isLoading(): boolean {
    return this.reactiveStore.getLoading()
  }

  // ACL operations
  async getACLs(
    resourceType: 'panel' | 'view',
    resourceId: number,
  ): Promise<ACL[]> {
    await this.waitForInitialization()
    if (!this.underlyingAdapter) {
      throw new Error('Underlying storage adapter not initialized')
    }

    try {
      const acls = await this.underlyingAdapter.getACLs(
        resourceType,
        resourceId,
      )
      // Update reactive store with fetched ACLs
      this.reactiveStore.setACLs(acls)
      return acls
    } catch (error) {
      console.error('Failed to fetch ACLs:', error)
      throw error
    }
  }

  async getACLsByUser(
    userEmail: string,
    resourceType?: 'panel' | 'view',
  ): Promise<ACL[]> {
    await this.waitForInitialization()
    if (!this.underlyingAdapter) {
      throw new Error('Underlying storage adapter not initialized')
    }

    try {
      const acls = await (
        this.underlyingAdapter as StorageAdapter & {
          getACLsByUser: (
            userEmail: string,
            resourceType?: 'panel' | 'view',
          ) => Promise<ACL[]>
        }
      ).getACLsByUser(userEmail, resourceType)
      // Update reactive store with fetched ACLs
      this.reactiveStore.setACLs(acls)
      return acls
    } catch (error) {
      console.error('Failed to fetch ACLs by user:', error)
      throw error
    }
  }

  async createACL(
    resourceType: 'panel' | 'view',
    resourceId: number,
    acl: ACLCreate,
  ): Promise<ACL> {
    await this.waitForInitialization()
    if (!this.underlyingAdapter) {
      throw new Error('Underlying storage adapter not initialized')
    }

    try {
      const createdACL = await this.underlyingAdapter.createACL(
        resourceType,
        resourceId,
        acl,
      )
      // Update reactive store
      this.reactiveStore.setACL(createdACL)
      return createdACL
    } catch (error) {
      console.error('Failed to create ACL:', error)
      throw error
    }
  }

  async updateACL(
    resourceType: 'panel' | 'view',
    resourceId: number,
    userEmail: string,
    acl: ACLUpdate,
  ): Promise<ACL> {
    await this.waitForInitialization()
    if (!this.underlyingAdapter) {
      throw new Error('Underlying storage adapter not initialized')
    }

    try {
      const updatedACL = await this.underlyingAdapter.updateACL(
        resourceType,
        resourceId,
        userEmail,
        acl,
      )
      // Update reactive store
      this.reactiveStore.setACL(updatedACL)
      return updatedACL
    } catch (error) {
      console.error('Failed to update ACL:', error)
      throw error
    }
  }

  async deleteACL(
    resourceType: 'panel' | 'view',
    resourceId: number,
    userEmail: string,
  ): Promise<void> {
    await this.waitForInitialization()
    if (!this.underlyingAdapter) {
      throw new Error('Underlying storage adapter not initialized')
    }

    try {
      // Find the ACL to delete from reactive store
      const acls = this.reactiveStore.getACLs(resourceType, resourceId)
      const aclToDelete = acls.find((acl) => acl.userEmail === userEmail)

      await this.underlyingAdapter.deleteACL(
        resourceType,
        resourceId,
        userEmail,
      )

      // Remove from reactive store
      if (aclToDelete) {
        this.reactiveStore.deleteACL(aclToDelete.id)
      }
    } catch (error) {
      console.error('Failed to delete ACL:', error)
      throw error
    }
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
