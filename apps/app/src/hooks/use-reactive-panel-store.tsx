'use client'

import type { Column, Panel, View, ColumnChangesResponse } from '@/types/panel'
import { createContext, useContext, useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { getRuntimeConfig } from '@/lib/config'
import { ReactiveStore } from '@/lib/reactive/reactive-store'
import {
  getStorageAdapter,
  type StorageMode,
} from '@/lib/storage/storage-factory'
import type { StorageAdapter } from '@/lib/storage/types'
import { useAuthentication } from './use-authentication'
import { logger } from '../lib/logger'
import { Loader2 } from 'lucide-react'

export class ReactivePanelStore {
  private storage: StorageAdapter | null = null
  private reactiveStore: ReactiveStore | null = null
  private initializationPromise: Promise<void> | null = null

  constructor(userId?: string, organizationSlug?: string, mode?: StorageMode) {
    console.log(
      'Initializing ReactivePanelStore with',
      userId,
      organizationSlug,
      mode,
    )
    this.initializationPromise = this.initializeStorage(
      userId,
      organizationSlug,
      mode,
    )
  }

  private async initializeStorage(
    userId?: string,
    organizationSlug?: string,
    mode?: StorageMode,
  ) {
    try {
      this.storage = await getStorageAdapter(userId, mode, organizationSlug)

      // Get the reactive store from the storage adapter if it's a ReactiveStorageAdapter
      if (this.storage && 'getReactiveStore' in this.storage) {
        const reactiveAdapter = this.storage as {
          getReactiveStore(): ReactiveStore
        }
        this.reactiveStore = reactiveAdapter.getReactiveStore()
      } else {
        // Fallback: create our own reactive store
        this.reactiveStore = new ReactiveStore()
      }

      // Load initial data into reactive store
      await this.loadInitialData()
    } catch (error) {
      console.error('Failed to initialize storage adapter:', error)
      throw error
    }
  }

  private async loadInitialData() {
    if (!this.storage || !this.reactiveStore) {
      console.log(
        'ReactivePanelStore: storage or reactive store not ready, skipping initial data load',
      )
      return
    }

    try {
      this.reactiveStore.setLoading(true)

      const [panels, views, columns] = await Promise.all([
        this.storage.getPanels(),
        this.storage.getViews(),
        this.storage.getColumns(),
      ])
      this.reactiveStore.setPanels(panels)
      this.reactiveStore.setViews(views)
      this.reactiveStore.setColumns(columns)
      this.reactiveStore.setLoading(false)
      this.reactiveStore.setLastSync(Date.now())
    } catch (error) {
      if (this.reactiveStore) {
        this.reactiveStore.setError(
          error instanceof Error ? error.message : 'Failed to load data',
        )
        this.reactiveStore.setLoading(false)
      }
    }
  }

  // Wait for initialization to complete
  async waitForInitialization(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise
    }
  }

  // Get the storage adapter
  getStorage(): StorageAdapter | null {
    return this.storage
  }

  // Get the reactive store
  getReactiveStore(): ReactiveStore | null {
    return this.reactiveStore
  }

  // Get current save state for an operation
  getSaveState(operationId: string): 'saving' | 'saved' | 'error' | undefined {
    const store = this.reactiveStore?.getStore()
    if (!store) return undefined

    const value = store.getValue(`saveState_${operationId}`)
    return value as 'saving' | 'saved' | 'error' | undefined
  }

  // Set save state for an operation
  private setSaveState(
    operationId: string,
    state: 'saving' | 'saved' | 'error',
  ) {
    const store = this.reactiveStore?.getStore()
    if (store) {
      store.setValue(`saveState_${operationId}`, state)
    }
  }

  // Panel operations - simplified since panels are now independent
  async createPanel(panel: Omit<Panel, 'id'>): Promise<Panel> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const operationId = `panel-${uuidv4()}`
    this.setSaveState(operationId, 'saving')

    try {
      const createdPanel = await this.storage.createPanel(panel)

      // Update reactive store
      this.reactiveStore?.setPanel(createdPanel)

      this.setSaveState(operationId, 'saved')
      return createdPanel
    } catch (error) {
      this.setSaveState(operationId, 'error')
      console.error('Failed to create panel:', error)
      throw new Error(
        `Failed to create panel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async updatePanel(id: string, updates: Partial<Panel>): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const operationId = `panel-${id}`
    this.setSaveState(operationId, 'saving')

    try {
      // Update panel via storage adapter
      const updatedPanel = await this.storage.updatePanel(id, updates)

      // Update reactive store with the updated panel
      this.reactiveStore?.setPanel(updatedPanel)

      this.setSaveState(operationId, 'saved')
    } catch (error) {
      this.setSaveState(operationId, 'error')
      logger.error({ error, id, updates }, 'Failed to update panel')
      throw new Error(
        `Failed to update panel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async deletePanel(id: string): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const operationId = `panel-${id}`
    this.setSaveState(operationId, 'saving')

    try {
      // Delete from backend first
      await this.storage.deletePanel(id)

      // Update reactive store (this will also remove associated views and columns)
      this.reactiveStore?.deletePanel(id)

      this.setSaveState(operationId, 'saved')
    } catch (error) {
      this.setSaveState(operationId, 'error')
      console.error('Failed to delete panel:', error)
      throw new Error(
        `Failed to delete panel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  // View operations - now independent of panels
  async addView(panelId: string, view: Omit<View, 'id'>): Promise<View> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const operationId = `view-${panelId}-${view.name}`
    this.setSaveState(operationId, 'saving')

    try {
      const newView = await this.storage.addView(panelId, view)

      // Update reactive store
      this.reactiveStore?.setView(newView)

      this.setSaveState(operationId, 'saved')
      return newView
    } catch (error) {
      this.setSaveState(operationId, 'error')
      console.error('Failed to add view:', error)
      throw new Error(
        `Failed to add view: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async updateView(
    panelId: string,
    viewId: string,
    updates: Partial<View>,
  ): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const operationId = `view-${panelId}-${viewId}`
    this.setSaveState(operationId, 'saving')

    try {
      // Optimistically update the view in the reactive store
      const currentView = this.reactiveStore?.getView(panelId, viewId)
      if (currentView) {
        const optimisticView = { ...currentView, ...updates }
        this.reactiveStore?.setView(optimisticView)
      }
      const updatedView = await this.storage.updateView(
        panelId,
        viewId,
        updates,
      )
      // Update reactive store
      this.reactiveStore?.setView(updatedView)

      this.setSaveState(operationId, 'saved')
    } catch (error) {
      this.setSaveState(operationId, 'error')
      console.error('Failed to update view:', error)
      throw new Error(
        `Failed to update view: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async deleteView(panelId: string, viewId: string): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const operationId = `view-${panelId}-${viewId}`
    this.setSaveState(operationId, 'saving')

    try {
      // Delete from backend first
      await this.storage.deleteView(panelId, viewId)

      // Update reactive store
      this.reactiveStore?.deleteView(viewId)

      this.setSaveState(operationId, 'saved')
    } catch (error) {
      this.setSaveState(operationId, 'error')
      console.error('Failed to delete view:', error)
      throw new Error(
        `Failed to delete view: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  // Column operations - now independent of panels
  async addColumn(
    panelId: string,
    column: Omit<Column, 'id'>,
  ): Promise<Column> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const operationId = `column-${panelId}-${uuidv4()}`
    this.setSaveState(operationId, 'saving')

    try {
      const createdColumn = await this.storage.addColumn(panelId, column)

      // Update reactive store
      this.reactiveStore?.setColumn(createdColumn)

      this.setSaveState(operationId, 'saved')
      return createdColumn
    } catch (error) {
      this.setSaveState(operationId, 'error')
      console.error('Failed to add column:', error)
      throw new Error(
        `Failed to add column: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async updateColumn(
    panelId: string,
    columnId: string,
    updates: Partial<Column>,
  ): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const operationId = `column-${panelId}-${columnId}`
    this.setSaveState(operationId, 'saving')

    // Store original state for rollback
    const originalColumn = this.reactiveStore?.getColumn(columnId)

    try {
      // ✅ OPTIMISTIC UPDATE: Update reactive store first for immediate UI feedback
      if (originalColumn) {
        // Deep merge properties to preserve existing nested values
        const optimisticColumn = {
          ...originalColumn,
          ...updates,
          properties: {
            ...originalColumn.properties,
            ...updates.properties,
            display: {
              ...originalColumn.properties?.display,
              ...updates.properties?.display,
            },
          },
        }
        this.reactiveStore?.setColumn(optimisticColumn)
      }

      // Then sync with backend API
      const updatedColumn = await this.storage.updateColumn(
        panelId,
        columnId,
        updates,
      )

      this.reactiveStore?.setColumn(updatedColumn)

      this.setSaveState(operationId, 'saved')
    } catch (error) {
      // Rollback optimistic update on API failure
      if (originalColumn) {
        this.reactiveStore?.setColumn(originalColumn)
      }

      this.setSaveState(operationId, 'error')
      console.error('Failed to update column:', error)
      throw new Error(
        `Failed to update column: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async deleteColumn(panelId: string, columnId: string): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const operationId = `column-${panelId}-${columnId}`
    this.setSaveState(operationId, 'saving')

    // Store original state for rollback
    const originalColumn = this.reactiveStore?.getColumn(columnId)

    try {
      // Optimistically remove from reactive store first
      this.reactiveStore?.deleteColumn(columnId)

      // Then sync with backend API
      await this.storage.deleteColumn(panelId, columnId)

      this.setSaveState(operationId, 'saved')
    } catch (error) {
      // Rollback optimistic update on API failure
      if (originalColumn) {
        this.reactiveStore?.setColumn(originalColumn)
      }

      this.setSaveState(operationId, 'error')
      console.error('Failed to delete column:', error)
      throw new Error(
        `Failed to delete column: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async applyColumnChanges(
    panelId: string,
    columnChanges: ColumnChangesResponse,
    viewId?: string,
  ): Promise<void> {
    if (!columnChanges.changes || columnChanges.changes.length === 0) {
      return
    }

    // Process all changes in parallel for better UI responsiveness
    const changePromises = columnChanges.changes.map(async (change) => {
      try {
        switch (change.operation) {
          case 'create':
            if (change.column) {
              const newColumn: Omit<Column, 'id'> = {
                panelId,
                name: change.column.name || 'New Column',
                type: change.column.type || 'text',
                sourceField:
                  change.column.sourceField ||
                  change.column.name ||
                  'New Column',
                tags:
                  change.viewType === 'patient'
                    ? ['panels:patients']
                    : ['panels:tasks'],
                properties: {
                  display: {
                    visible: true,
                    order: change.order,
                  },
                },
                metadata: {},
              }
              const createdColumn = await this.addColumn(panelId, newColumn)
              if (viewId) {
                await this.updateView(panelId, viewId, {
                  visibleColumns: [
                    ...(this.reactiveStore?.getView(panelId, viewId)
                      ?.visibleColumns || []),
                    createdColumn.id,
                  ],
                })
              }
              return { operation: `create-${change.id}`, success: true }
            }
            return {
              operation: `create-${change.id}`,
              success: false,
              error: 'Missing column data for create operation',
            }

          case 'update':
            if (change.column) {
              const updates: Partial<Column> = {
                id: change.id,
                ...change.column,
              }
              await this.updateColumn(panelId, change.id, updates)
              return { operation: `update-${change.id}`, success: true }
            }
            return {
              operation: `update-${change.id}`,
              success: false,
              error: 'Missing column data for update operation',
            }

          case 'delete':
            await this.deleteColumn(panelId, change.id)
            return { operation: `delete-${change.id}`, success: true }

          default:
            logger.warn(
              { operation: change.operation },
              'Unknown column change operation',
            )
            return {
              operation: `unknown-${change.id}`,
              success: false,
              error: 'Unknown operation',
            }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        logger.error(
          { error, change },
          `Failed to apply column change: ${change.operation} for column ${change.id}`,
        )
        return {
          operation: `${change.operation}-${change.id}`,
          success: false,
          error: errorMessage,
        }
      }
    })

    // Wait for all operations to complete in parallel
    const results = await Promise.allSettled(changePromises)

    // Process results and extract actual values
    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        return result.value
      }

      const change = columnChanges.changes[index]
      return {
        operation: `${change.operation}-${change.id}`,
        success: false,
        error:
          result.status === 'rejected'
            ? result.reason?.message || 'Unknown error'
            : 'No result returned',
      }
    })

    // Log summary of results
    const successful = processedResults.filter((r) => r.success).length
    const failed = processedResults.filter((r) => !r.success).length

    logger.info(
      { successful, failed, total: processedResults.length, panelId },
      `Column changes applied in parallel: ${successful} successful, ${failed} failed`,
    )

    if (failed > 0) {
      const failedOperations = processedResults.filter((r) => !r.success)
      throw new Error(
        `Failed to apply ${failed} of ${processedResults.length} column changes: ${failedOperations.map((r) => r.error).join(', ')}`,
      )
    }
  }

  // Helper methods for fetching columns and views
  async getColumnsForPanel(panelId: string): Promise<Column[]> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    // Check if this method exists on the storage adapter
    if ('getColumnsForPanel' in this.storage) {
      const adapter = this.storage as StorageAdapter & {
        getColumnsForPanel: (panelId: string) => Promise<Column[]>
      }
      return await adapter.getColumnsForPanel(panelId)
    }

    // Fallback: get from reactive store
    return this.reactiveStore?.getColumnsForPanel(panelId) || []
  }

  async getViewsForPanel(panelId: string): Promise<View[]> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    // Check if this method exists on the storage adapter
    if ('getViewsForPanel' in this.storage) {
      const adapter = this.storage as StorageAdapter & {
        getViewsForPanel: (panelId: string) => Promise<View[]>
      }
      return await adapter.getViewsForPanel(panelId)
    }

    // Fallback: get from reactive store
    return this.reactiveStore?.getViewsForPanel(panelId) || []
  }
}

// Create context
export const ReactivePanelStoreContext =
  createContext<ReactivePanelStore | null>(null)

// Provider component
export function ReactivePanelStoreProvider({
  children,
}: { children: React.ReactNode }) {
  const { userId, organizationSlug } = useAuthentication()
  const [store, setStore] = useState<ReactivePanelStore | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!userId || !organizationSlug) {
      return
    }

    const initializeStore = async () => {
      try {
        const { storageMode } = await getRuntimeConfig()
        const reactiveStore = new ReactivePanelStore(
          userId,
          organizationSlug,
          storageMode as StorageMode,
        )

        // Wait for initialization to complete
        await reactiveStore.waitForInitialization()

        setStore(reactiveStore)
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize store:', error)
      }
    }

    initializeStore()
  }, [userId, organizationSlug])

  if (!store || !isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2
          className="h-8 w-8 text-blue-500 animate-spin mb-2"
          aria-label="Setting up connections for Panels..."
        />
      </div>
    )
  }

  return (
    <ReactivePanelStoreContext.Provider value={store}>
      {children}
    </ReactivePanelStoreContext.Provider>
  )
}

// Hook to use the reactive store
export function useReactivePanelStore() {
  const store = useContext(ReactivePanelStoreContext)

  if (!store) {
    throw new Error(
      'useReactivePanelStore must be used within a ReactivePanelStoreProvider',
    )
  }

  // Return a proxy object that provides access to the store's public methods
  return {
    store: store.getReactiveStore()?.getStore(),
    getSaveState: store.getSaveState.bind(store),
    createPanel: store.createPanel.bind(store),
    updatePanel: store.updatePanel.bind(store),
    deletePanel: store.deletePanel.bind(store),
    addView: store.addView.bind(store),
    updateView: store.updateView.bind(store),
    deleteView: store.deleteView.bind(store),
    getStorage: store.getStorage.bind(store),
    getReactiveStore: store.getReactiveStore.bind(store),
    addColumn: store.addColumn.bind(store),
    updateColumn: store.updateColumn.bind(store),
    deleteColumn: store.deleteColumn.bind(store),
    applyColumnChanges: store.applyColumnChanges.bind(store),
    getColumnsForPanel: store.getColumnsForPanel.bind(store),
    getViewsForPanel: store.getViewsForPanel.bind(store),
  }
}
