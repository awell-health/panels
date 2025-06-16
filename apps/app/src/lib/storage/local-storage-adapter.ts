import type { PanelDefinition, ViewDefinition } from '@/types/worklist'
import { v4 as uuidv4 } from 'uuid'
import type { StorageAdapter } from './types'

/**
 * LocalStorageAdapter provides panel storage using browser localStorage
 * This maintains the existing behavior and data structure from usePanelStore
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly STORAGE_KEY = 'panel-definitions'
  private loading = false

  /**
   * Load panels from localStorage
   */
  private async loadPanelsFromStorage(): Promise<PanelDefinition[]> {
    try {
      // Check if localStorage is available (not available during SSR)
      if (
        typeof window === 'undefined' ||
        typeof localStorage === 'undefined'
      ) {
        console.log('localStorage not available (SSR), returning empty array')
        return []
      }

      const storedPanels = localStorage.getItem(this.STORAGE_KEY)
      if (storedPanels) {
        const parsedPanels = JSON.parse(storedPanels) as (Omit<
          PanelDefinition,
          'createdAt'
        > & { createdAt: string })[]
        // Convert string dates back to Date objects
        return parsedPanels.map((panel) => ({
          ...panel,
          createdAt: new Date(panel.createdAt),
        }))
      }
      return []
    } catch (error) {
      console.error('Error loading panels from localStorage:', error)
      return []
    }
  }

  /**
   * Save panels to localStorage
   */
  private async savePanelsToStorage(panels: PanelDefinition[]): Promise<void> {
    try {
      // Check if localStorage is available (not available during SSR)
      if (
        typeof window === 'undefined' ||
        typeof localStorage === 'undefined'
      ) {
        console.log('localStorage not available (SSR), skipping save')
        return
      }

      // Convert Date objects to ISO strings for storage
      const panelsToStore = panels.map((panel) => ({
        ...panel,
        createdAt: panel.createdAt.toISOString(),
      }))
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(panelsToStore))
    } catch (error) {
      console.error('Error saving panels to localStorage:', error)
      throw new Error('Failed to save panels to localStorage')
    }
  }

  // Panel operations
  async getPanels(): Promise<PanelDefinition[]> {
    return this.loadPanelsFromStorage()
  }

  async getPanel(id: string): Promise<PanelDefinition | null> {
    const panels = await this.loadPanelsFromStorage()
    return panels.find((panel) => panel.id === id) || null
  }

  async createPanel(
    panel: Omit<PanelDefinition, 'id'>,
  ): Promise<PanelDefinition> {
    const panels = await this.loadPanelsFromStorage()

    const newPanel: PanelDefinition = {
      ...panel,
      id: uuidv4(),
      createdAt: new Date(),
    }

    const updatedPanels = [...panels, newPanel]
    await this.savePanelsToStorage(updatedPanels)

    return newPanel
  }

  async updatePanel(
    id: string,
    updates: Partial<PanelDefinition>,
  ): Promise<void> {
    const panels = await this.loadPanelsFromStorage()
    const index = panels.findIndex((panel) => panel.id === id)

    if (index === -1) {
      throw new Error(`Panel ${id} not found`)
    }

    panels[index] = { ...panels[index], ...updates }
    await this.savePanelsToStorage(panels)
  }

  async deletePanel(id: string): Promise<void> {
    const panels = await this.loadPanelsFromStorage()
    const filteredPanels = panels.filter((panel) => panel.id !== id)
    await this.savePanelsToStorage(filteredPanels)
  }

  // View operations
  async addView(
    panelId: string,
    view: Omit<ViewDefinition, 'id'>,
  ): Promise<ViewDefinition> {
    const panels = await this.loadPanelsFromStorage()
    const panel = panels.find((p) => p.id === panelId)

    if (!panel) {
      throw new Error(`Panel ${panelId} not found`)
    }

    const newView: ViewDefinition = {
      ...view,
      id: uuidv4(),
      createdAt: new Date(),
    }

    panel.views = [...(panel.views || []), newView]
    await this.savePanelsToStorage(panels)

    return newView
  }

  async updateView(
    panelId: string,
    viewId: string,
    updates: Partial<ViewDefinition>,
  ): Promise<void> {
    const panels = await this.loadPanelsFromStorage()
    const panel = panels.find((p) => p.id === panelId)

    if (!panel) {
      throw new Error(`Panel ${panelId} not found`)
    }

    const viewIndex = panel.views?.findIndex((v) => v.id === viewId) ?? -1
    if (viewIndex === -1) {
      throw new Error(`View ${viewId} not found in panel ${panelId}`)
    }

    if (!panel.views) {
      throw new Error(`Panel ${panelId} has no views`)
    }

    panel.views[viewIndex] = { ...panel.views[viewIndex], ...updates }
    await this.savePanelsToStorage(panels)
  }

  async deleteView(panelId: string, viewId: string): Promise<void> {
    const panels = await this.loadPanelsFromStorage()
    const panel = panels.find((p) => p.id === panelId)

    if (!panel) {
      throw new Error(`Panel ${panelId} not found`)
    }

    panel.views = panel.views?.filter((v) => v.id !== viewId)
    await this.savePanelsToStorage(panels)
  }

  async getView(
    panelId: string,
    viewId: string,
  ): Promise<ViewDefinition | null> {
    const panels = await this.loadPanelsFromStorage()
    const panel = panels.find((p) => p.id === panelId)

    if (!panel) {
      return null
    }

    return panel.views?.find((v) => v.id === viewId) || null
  }

  // Loading state
  isLoading(): boolean {
    return this.loading
  }
}
