'use client'

import type {
  ColumnDefinition,
  PanelDefinition,
  ViewDefinition,
} from '@/types/worklist'
import { createContext, useContext, useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { getRuntimeConfig } from '@/lib/config'
import { ReactiveStore } from '@/lib/reactive/reactive-store'
import { getStorageAdapter } from '@/lib/storage/storage-factory'
import type { StorageAdapter, StorageMode } from '@/lib/storage/types'
import { useAuthentication } from './use-authentication'

export class ReactivePanelStore {
  private storage: StorageAdapter | null = null
  private reactiveStore: ReactiveStore | null = null
  private saveStates: Map<string, 'saving' | 'saved' | 'error'> = new Map()
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

      const panels = await this.storage.getPanels()

      this.reactiveStore.setPanels(panels)
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
    return this.saveStates.get(operationId)
  }

  // Set save state for an operation
  private setSaveState(
    operationId: string,
    state: 'saving' | 'saved' | 'error',
  ) {
    this.saveStates.set(operationId, state)
  }

  async createPanel(
    panel: Omit<PanelDefinition, 'id'>,
  ): Promise<PanelDefinition> {
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

  async updatePanel(
    id: string,
    updates: Partial<PanelDefinition>,
  ): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const operationId = `panel-${id}`
    this.setSaveState(operationId, 'saving')

    try {
      await this.storage.updatePanel(id, updates)

      // Update reactive store
      this.reactiveStore?.updatePanel(id, updates)

      this.setSaveState(operationId, 'saved')
    } catch (error) {
      this.setSaveState(operationId, 'error')
      console.error('Failed to update panel:', error)
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

      // Update reactive store
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

  // View operations
  async addView(
    panelId: string,
    view: Omit<ViewDefinition, 'id'>,
  ): Promise<ViewDefinition> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const operationId = `view-${panelId}-${view.title}`
    this.setSaveState(operationId, 'saving')

    try {
      const newView = await this.storage.addView(panelId, view)

      // Update reactive store
      this.reactiveStore?.setView(panelId, newView)

      // Also update the panel data to include the new view
      const currentPanel = this.reactiveStore?.getPanel(panelId)
      if (currentPanel) {
        const updatedPanel = {
          ...currentPanel,
          views: [...(currentPanel.views || []), newView],
        }
        this.reactiveStore?.setPanel(updatedPanel)
      }

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
    updates: Partial<ViewDefinition>,
  ): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const operationId = `view-${panelId}-${viewId}`
    this.setSaveState(operationId, 'saving')

    try {
      await this.storage.updateView(panelId, viewId, updates)

      // Update reactive store
      this.reactiveStore?.updateView(panelId, viewId, updates)

      // Also update the panel data to reflect view changes
      const currentPanel = this.reactiveStore?.getPanel(panelId)
      if (currentPanel) {
        const updatedViews = (currentPanel.views || []).map((view) =>
          view.id === viewId ? { ...view, ...updates } : view,
        )
        const updatedPanel = {
          ...currentPanel,
          views: updatedViews,
        }
        this.reactiveStore?.setPanel(updatedPanel)
      }

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
      this.reactiveStore?.deleteView(panelId, viewId)

      // Also update the panel data to remove the deleted view
      const currentPanel = this.reactiveStore?.getPanel(panelId)
      if (currentPanel) {
        const updatedPanel = {
          ...currentPanel,
          views: (currentPanel.views || []).filter(
            (view) => view.id !== viewId,
          ),
        }
        this.reactiveStore?.setPanel(updatedPanel)
      }

      this.setSaveState(operationId, 'saved')
    } catch (error) {
      this.setSaveState(operationId, 'error')
      console.error('Failed to delete view:', error)
      throw new Error(
        `Failed to delete view: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  // Column operations
  async updateColumn(
    panelId: string,
    columnId: string,
    updates: Partial<ColumnDefinition>,
  ): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const operationId = `column-${panelId}-${columnId}`
    this.setSaveState(operationId, 'saving')

    // Store original state for rollback
    const originalPanel = this.reactiveStore?.getPanel(panelId)

    try {
      // ✅ OPTIMISTIC UPDATE: Update reactive store first for immediate UI feedback
      this.reactiveStore?.updateColumn(panelId, columnId, updates)

      // Then sync with backend API
      await this.storage.updateColumn(panelId, columnId, updates)

      this.setSaveState(operationId, 'saved')
    } catch (error) {
      // Rollback optimistic update on API failure
      if (originalPanel) {
        this.reactiveStore?.setPanel(originalPanel)
      }

      this.setSaveState(operationId, 'error')
      console.error('Failed to update column:', error)
      throw new Error(
        `Failed to update column: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
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
    getSaveState: store.getSaveState.bind(store),
    createPanel: store.createPanel.bind(store),
    updatePanel: store.updatePanel.bind(store),
    deletePanel: store.deletePanel.bind(store),
    addView: store.addView.bind(store),
    updateView: store.updateView.bind(store),
    deleteView: store.deleteView.bind(store),
    getStorage: store.getStorage.bind(store),
    getReactiveStore: store.getReactiveStore.bind(store),
    updateColumn: store.updateColumn.bind(store),
  }
}
