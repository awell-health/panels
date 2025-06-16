"use client"

import type { PanelDefinition, ViewDefinition } from '@/types/worklist'
import { type ReactNode, createContext, useContext, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { getStorageAdapter } from '@/lib/storage/storage-factory'
import type { StorageAdapter } from '@/lib/storage/types'

export class PanelStore {
  private listeners: Array<() => void> = []
  private panels: PanelDefinition[] = []
  private storage: StorageAdapter | null = null
  private _isLoading = false
  private saveStates: Map<string, 'saving' | 'saved' | 'error'> = new Map()

  constructor() {
    this.initializeStorage()
  }

  private async initializeStorage() {
    try {
      this.storage = await getStorageAdapter()
      await this.loadPanels()
    } catch (error) {
      console.error('Failed to initialize storage adapter:', error)
      throw error
    }
  }

  // Subscribe to store updates
  subscribe(listener: () => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  // Notify all listeners of changes
  private notifyListeners() {
    for (const listener of this.listeners) {
      listener()
    }
  }

  // Get current save state for an operation
  getSaveState(operationId: string): 'saving' | 'saved' | 'error' | undefined {
    return this.saveStates.get(operationId)
  }

  // Set save state for an operation
  private setSaveState(operationId: string, state: 'saving' | 'saved' | 'error') {
    this.saveStates.set(operationId, state)
    this.notifyListeners()
  }

  // Get all panels
  getPanels(): PanelDefinition[] {
    return this.panels
  }

  // Get a specific panel
  getPanel(id: string): PanelDefinition | undefined {
    return this.panels.find((panel) => panel.id === id)
  }

  // Get a specific view from a panel
  getView(panelId: string, viewId: string): ViewDefinition | undefined {
    const panel = this.getPanel(panelId)
    return panel?.views?.find(view => view.id === viewId)
  }

  // Get loading state
  isLoading(): boolean {
    return this._isLoading
  }

  async loadPanels() {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    try {
      this._isLoading = true
      this.notifyListeners()

      const loadedPanels = await this.storage.getPanels()
      this.panels = loadedPanels
    } catch (error) {
      console.error('Failed to load panels from storage:', error)
      throw error
    } finally {
      this._isLoading = false
      this.notifyListeners()
    }
  }

  async createPanel(panel: Omit<PanelDefinition, 'id'>): Promise<PanelDefinition> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const newPanel: PanelDefinition = {
      ...panel,
      id: uuidv4(),
    }

    const operationId = `panel-${newPanel.id}`
    this.setSaveState(operationId, 'saving')

    try {
      // Update local state optimistically
      this.panels.push(newPanel)
      this.notifyListeners()

      // Sync with storage adapter
      await this.storage.createPanel(panel)

      this.setSaveState(operationId, 'saved')
      return newPanel
    } catch (error) {
      // Rollback local changes on failure
      this.panels = this.panels.filter(p => p.id !== newPanel.id)
      this.notifyListeners()

      this.setSaveState(operationId, 'error')
      console.error('Failed to create panel:', error)
      throw new Error(`Failed to create panel: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async updatePanel(id: string, updates: Partial<PanelDefinition>): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const operationId = `panel-${id}`
    this.setSaveState(operationId, 'saving')

    // Store original state for rollback
    const originalPanels = JSON.parse(JSON.stringify(this.panels))

    try {
      // Update local state optimistically
      this.panels = this.panels.map((panel) =>
        panel.id === id ? { ...panel, ...updates } : panel,
      )
      this.notifyListeners()

      // Sync with storage adapter
      await this.storage.updatePanel(id, updates)

      this.setSaveState(operationId, 'saved')
    } catch (error) {
      // Rollback to original state on failure
      this.panels = originalPanels
      this.notifyListeners()

      this.setSaveState(operationId, 'error')
      console.error('Failed to update panel:', error)
      throw new Error(`Failed to update panel: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deletePanel(id: string): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const operationId = `panel-${id}`
    this.setSaveState(operationId, 'saving')

    // Store original state for rollback
    const originalPanels = JSON.parse(JSON.stringify(this.panels))

    try {
      // Update local state optimistically
      this.panels = this.panels.filter((panel) => panel.id !== id)
      this.notifyListeners()

      // Sync with storage adapter
      await this.storage.deletePanel(id)

      this.setSaveState(operationId, 'saved')
    } catch (error) {
      // Rollback to original state on failure
      this.panels = originalPanels
      this.notifyListeners()

      this.setSaveState(operationId, 'error')
      console.error('Failed to delete panel:', error)
      throw new Error(`Failed to delete panel: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

      // Update local state
      this.panels = this.panels.map((panel) =>
        panel.id === panelId
          ? {
            ...panel,
            views: [...(panel.views || []), newView],
          }
          : panel,
      )
      this.notifyListeners()

      this.setSaveState(operationId, 'saved')
      return newView
    } catch (error) {
      this.setSaveState(operationId, 'error')
      console.error('Failed to add view:', error)
      throw new Error(`Failed to add view: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

      // Update local state
      this.panels = this.panels.map((panel) =>
        panel.id === panelId
          ? {
            ...panel,
            views: panel.views?.map((view) =>
              view.id === viewId ? { ...view, ...updates } : view,
            ),
          }
          : panel,
      )
      this.notifyListeners()

      this.setSaveState(operationId, 'saved')
    } catch (error) {
      this.setSaveState(operationId, 'error')
      console.error('Failed to update view:', error)
      throw new Error(`Failed to update view: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deleteView(panelId: string, viewId: string): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage adapter not initialized')
    }

    const operationId = `view-${panelId}-${viewId}`
    this.setSaveState(operationId, 'saving')

    try {
      await this.storage.deleteView(panelId, viewId)

      // Update local state
      this.panels = this.panels.map((panel) =>
        panel.id === panelId
          ? {
            ...panel,
            views: panel.views?.filter((view) => view.id !== viewId),
          }
          : panel,
      )
      this.notifyListeners()

      this.setSaveState(operationId, 'saved')
    } catch (error) {
      this.setSaveState(operationId, 'error')
      console.error('Failed to delete view:', error)
      throw new Error(`Failed to delete view: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Create context
const PanelStoreContext = createContext<PanelStore | null>(null)

// Provider component
export function PanelStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new PanelStore())

  return (
    <PanelStoreContext.Provider value={store}>
      {children}
    </PanelStoreContext.Provider>
  )
}

// Hook to use the store
export function usePanelStore() {
  const store = useContext(PanelStoreContext)
  if (!store) {
    throw new Error('usePanelStore must be used within a PanelStoreProvider')
  }

  // Return a proxy object that provides access to the store's public methods
  return {
    panels: store.getPanels(),
    isLoading: store.isLoading(),
    getSaveState: store.getSaveState.bind(store),
    getPanel: store.getPanel.bind(store),
    getView: store.getView.bind(store),
    createPanel: store.createPanel.bind(store),
    updatePanel: store.updatePanel.bind(store),
    deletePanel: store.deletePanel.bind(store),
    addView: store.addView.bind(store),
    updateView: store.updateView.bind(store),
    deleteView: store.deleteView.bind(store),
  }
} 