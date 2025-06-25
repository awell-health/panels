import type {
  PanelDefinition,
  ViewDefinition,
  ColumnDefinition,
} from '@/types/worklist'
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
        createdAt:
          panel.createdAt instanceof Date
            ? panel.createdAt.toISOString()
            : typeof panel.createdAt === 'string'
              ? panel.createdAt
              : new Date().toISOString(),
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

  async updateColumn(
    panelId: string,
    columnId: string,
    updates: Partial<ColumnDefinition>,
  ): Promise<void> {
    console.log('LocalStorageAdapter.updateColumn: starting update', {
      panelId,
      columnId,
      updates,
      hasTypeUpdate: !!updates.type,
      newType: updates.type,
    })

    try {
      const panels = await this.getPanels()
      const panel = panels.find((p) => p.id === panelId)
      if (!panel) {
        throw new Error(`Panel ${panelId} not found`)
      }

      // Find and update the column in patientViewColumns
      const patientColumnIndex = panel.patientViewColumns.findIndex(
        (col) => col.id === columnId,
      )
      if (patientColumnIndex !== -1) {
        const oldType = panel.patientViewColumns[patientColumnIndex].type
        panel.patientViewColumns[patientColumnIndex] = {
          ...panel.patientViewColumns[patientColumnIndex],
          ...updates,
        }
        console.log(
          'LocalStorageAdapter.updateColumn: updated patient column',
          {
            columnId,
            oldType,
            newType: panel.patientViewColumns[patientColumnIndex].type,
          },
        )
      }

      // Find and update the column in taskViewColumns
      const taskColumnIndex = panel.taskViewColumns.findIndex(
        (col) => col.id === columnId,
      )
      if (taskColumnIndex !== -1) {
        const oldType = panel.taskViewColumns[taskColumnIndex].type
        panel.taskViewColumns[taskColumnIndex] = {
          ...panel.taskViewColumns[taskColumnIndex],
          ...updates,
        }
        console.log('LocalStorageAdapter.updateColumn: updated task column', {
          columnId,
          oldType,
          newType: panel.taskViewColumns[taskColumnIndex].type,
        })
      }

      // Update views that reference this column
      if (panel.views) {
        for (const view of panel.views) {
          const viewColumnIndex = view.columns.findIndex(
            (col) => col.id === columnId,
          )
          if (viewColumnIndex !== -1) {
            const oldType = view.columns[viewColumnIndex].type
            view.columns[viewColumnIndex] = {
              ...view.columns[viewColumnIndex],
              ...updates,
            }
            console.log(
              'LocalStorageAdapter.updateColumn: updated view column',
              {
                viewId: view.id,
                columnId,
                oldType,
                newType: view.columns[viewColumnIndex].type,
              },
            )
          }
        }
      }

      // Save the updated panel
      await this.savePanelsToStorage(panels)
    } catch (error) {
      console.error(
        `Failed to update column ${columnId} in panel ${panelId}:`,
        error,
      )
      throw new Error(
        `Failed to update column: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
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
