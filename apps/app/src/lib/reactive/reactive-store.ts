import { createStore, type Store } from 'tinybase'
import type {
  PanelDefinition,
  ViewDefinition,
  ColumnDefinition,
} from '@/types/worklist'

/**
 * Reactive Store using TinyBase for managing panels and views
 * Provides real-time synchronization and reactive updates
 */
export class ReactiveStore {
  private store: Store
  private listeners: Array<() => void> = []

  constructor() {
    this.store = createStore()
    this.initializeStore()
  }

  private initializeStore() {
    // Initialize tables for panels, views, and columns
    this.store.setTable('panels', {})
    this.store.setTable('views', {})
    this.store.setTable('columns', {})

    // Initialize values for metadata
    this.store.setValues({
      isLoading: false,
      lastSync: 0,
      error: '',
    })
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

  // Panel operations
  getPanels(): PanelDefinition[] {
    const panels = this.store.getTable('panels')
    return Object.values(panels).map((panel) => {
      const panelData = panel as Record<string, string | number | boolean>
      return this.deserializePanel(panelData)
    })
  }

  getPanel(id: string): PanelDefinition | undefined {
    const panel = this.store.getRow('panels', id)
    if (!panel) return undefined

    const panelData = panel as Record<string, string | number | boolean>
    return this.deserializePanel(panelData)
  }

  setPanel(panel: PanelDefinition) {
    const serialized = this.serializePanel(panel)
    this.store.setRow('panels', panel.id, serialized)

    // Also store individual columns
    if (panel.patientViewColumns) {
      for (const column of panel.patientViewColumns) {
        this.setColumn(panel.id, column)
      }
    }
    if (panel.taskViewColumns) {
      for (const column of panel.taskViewColumns) {
        this.setColumn(panel.id, column)
      }
    }

    // Also store individual views
    if (panel.views) {
      for (const view of panel.views) {
        this.setView(panel.id, view)
      }
    }

    this.notifyListeners()
  }

  setPanels(panels: PanelDefinition[]) {
    const serializedPanels: Record<
      string,
      Record<string, string | number | boolean>
    > = {}

    for (const panel of panels) {
      serializedPanels[panel.id] = this.serializePanel(panel)

      // Also store individual columns for each panel
      if (panel.patientViewColumns) {
        for (const column of panel.patientViewColumns) {
          this.setColumn(panel.id, column)
        }
      }
      if (panel.taskViewColumns) {
        for (const column of panel.taskViewColumns) {
          this.setColumn(panel.id, column)
        }
      }

      // Also store individual views for each panel
      if (panel.views) {
        for (const view of panel.views) {
          this.setView(panel.id, view)
        }
      }
    }

    this.store.setTable('panels', serializedPanels)
    this.notifyListeners()
  }

  updatePanel(id: string, updates: Partial<PanelDefinition>) {
    const currentPanel = this.getPanel(id)
    if (!currentPanel) return

    const updatedPanel = { ...currentPanel, ...updates }
    this.setPanel(updatedPanel)

    // Also update individual columns if panel columns have changed
    if (updates.patientViewColumns) {
      for (const column of updates.patientViewColumns) {
        this.setColumn(id, column)
      }
    }
    if (updates.taskViewColumns) {
      for (const column of updates.taskViewColumns) {
        this.setColumn(id, column)
      }
    }

    // Also update individual views if panel views have changed
    if (updates.views) {
      for (const view of updates.views) {
        this.setView(id, view)
      }
    }
  }

  deletePanel(id: string) {
    // Delete the panel
    this.store.delRow('panels', id)

    // Delete all views for this panel
    const views = this.store.getTable('views')
    const viewsToDelete = Object.entries(views)
      .filter(([key]) => key.startsWith(`${id}:`))
      .map(([key]) => key)

    for (const viewKey of viewsToDelete) {
      this.store.delRow('views', viewKey)
    }

    // Delete all columns for this panel
    const columns = this.store.getTable('columns')
    const columnsToDelete = Object.entries(columns)
      .filter(([key]) => key.startsWith(`${id}:`))
      .map(([key]) => key)

    for (const columnKey of columnsToDelete) {
      this.store.delRow('columns', columnKey)
    }

    this.notifyListeners()
  }

  // View operations
  getView(panelId: string, viewId: string): ViewDefinition | undefined {
    const view = this.store.getRow('views', `${panelId}:${viewId}`)
    if (!view) return undefined

    const viewData = view as Record<string, string | number | boolean>
    return this.deserializeView(viewData)
  }

  getViewsForPanel(panelId: string): ViewDefinition[] {
    const views = this.store.getTable('views')
    return Object.entries(views)
      .filter(([key]) => key.startsWith(`${panelId}:`))
      .map(([, view]) => {
        const viewData = view as Record<string, string | number | boolean>
        return this.deserializeView(viewData)
      })
  }

  setView(panelId: string, view: ViewDefinition) {
    const serialized = this.serializeView(view)
    this.store.setRow('views', `${panelId}:${view.id}`, serialized)
    this.notifyListeners()
  }

  updateView(
    panelId: string,
    viewId: string,
    updates: Partial<ViewDefinition>,
  ) {
    const currentView = this.getView(panelId, viewId)
    if (!currentView) return

    const updatedView = { ...currentView, ...updates }
    this.setView(panelId, updatedView)
  }

  deleteView(panelId: string, viewId: string) {
    this.store.delRow('views', `${panelId}:${viewId}`)
    this.notifyListeners()
  }

  // Column operations
  getColumnsForPanel(panelId: string): ColumnDefinition[] {
    const columns = this.store.getTable('columns')
    return Object.entries(columns)
      .filter(([key]) => key.startsWith(`${panelId}:`))
      .map(([, column]) => {
        const columnData = column as Record<string, string | number | boolean>
        return this.deserializeColumn(columnData)
      })
  }

  setColumn(panelId: string, column: ColumnDefinition) {
    const serialized = this.serializeColumn(column)
    this.store.setRow('columns', `${panelId}:${column.id}`, serialized)
    this.notifyListeners()
  }

  updateColumn(
    panelId: string,
    columnId: string,
    updates: Partial<ColumnDefinition>,
  ) {
    const columns = this.store.getTable('columns')
    const columnKey = `${panelId}:${columnId}`
    const currentColumn = columns[columnKey]

    if (!currentColumn) {
      return
    }

    const columnData = currentColumn as Record<
      string,
      string | number | boolean
    >
    const updatedColumn = { ...this.deserializeColumn(columnData), ...updates }
    this.setColumn(panelId, updatedColumn)

    // Also update the panel data to keep column arrays in sync
    const currentPanel = this.getPanel(panelId)
    if (currentPanel) {
      // Update patient view columns
      const updatedPatientColumns = currentPanel.patientViewColumns.map(
        (col) => (col.id === columnId ? { ...col, ...updates } : col),
      )

      // Update task view columns
      const updatedTaskColumns = currentPanel.taskViewColumns.map((col) =>
        col.id === columnId ? { ...col, ...updates } : col,
      )

      // Update the panel without triggering view serialization
      const updatedPanel = {
        ...currentPanel,
        patientViewColumns: updatedPatientColumns,
        taskViewColumns: updatedTaskColumns,
      }

      // Update panel data directly without calling setPanel to avoid view serialization issues
      const serialized = this.serializePanel(updatedPanel)
      this.store.setRow('panels', panelId, serialized)

      // Also update any views that reference this column
      if (currentPanel.views) {
        let updatedViewsCount = 0

        for (const view of currentPanel.views) {
          const viewColumns = view.columns || []
          const columnIndex = viewColumns.findIndex(
            (col) => col.id === columnId,
          )

          if (columnIndex !== -1) {
            // Update the column in the view
            const updatedViewColumns = [...viewColumns]
            updatedViewColumns[columnIndex] = {
              ...updatedViewColumns[columnIndex],
              ...updates,
            }

            const updatedView = {
              ...view,
              columns: updatedViewColumns,
            }

            // Update the view in the reactive store
            this.setView(panelId, updatedView)
            updatedViewsCount++
          }
        }
      }

      this.notifyListeners()
    }
  }

  // Metadata operations
  setLoading(isLoading: boolean) {
    this.store.setValue('isLoading', isLoading)
    this.notifyListeners()
  }

  setError(error: string | null) {
    this.store.setValue('error', error || '')
    this.notifyListeners()
  }

  setLastSync(timestamp: number) {
    this.store.setValue('lastSync', timestamp)
    this.notifyListeners()
  }

  getLoading(): boolean {
    const loading = this.store.getValue('isLoading')
    return typeof loading === 'boolean' ? loading : false
  }

  getError(): string | null {
    const error = this.store.getValue('error')
    return typeof error === 'string' ? error : null
  }

  getLastSync(): number | null {
    const lastSync = this.store.getValue('lastSync')
    return typeof lastSync === 'number' ? lastSync : null
  }

  // Serialization helpers - use JSON for complex objects
  private serializePanel(
    panel: PanelDefinition,
  ): Record<string, string | number | boolean> {
    return {
      id: panel.id,
      title: panel.title,
      filters: JSON.stringify(panel.filters),
      patientViewColumns: JSON.stringify(panel.patientViewColumns),
      taskViewColumns: JSON.stringify(panel.taskViewColumns),
      views: JSON.stringify(panel.views || []),
      createdAt:
        panel.createdAt instanceof Date
          ? panel.createdAt.toISOString()
          : typeof panel.createdAt === 'string'
            ? panel.createdAt
            : new Date().toISOString(),
    }
  }

  private deserializePanel(
    data: Record<string, string | number | boolean>,
  ): PanelDefinition {
    return {
      id: data.id as string,
      title: data.title as string,
      filters: data.filters ? JSON.parse(data.filters as string) : [],
      patientViewColumns: data.patientViewColumns
        ? JSON.parse(data.patientViewColumns as string)
        : [],
      taskViewColumns: data.taskViewColumns
        ? JSON.parse(data.taskViewColumns as string)
        : [],
      views: data.views ? JSON.parse(data.views as string) : [],
      createdAt: data.createdAt
        ? new Date(data.createdAt as string)
        : new Date(),
    }
  }

  private serializeView(
    view: ViewDefinition,
  ): Record<string, string | number | boolean> {
    return {
      id: view.id,
      title: view.title,
      filters: JSON.stringify(view.filters),
      columns: JSON.stringify(view.columns),
      viewType: view.viewType,
      sortConfig: JSON.stringify(view.sortConfig || []),
      createdAt:
        view.createdAt instanceof Date
          ? view.createdAt.toISOString()
          : typeof view.createdAt === 'string'
            ? view.createdAt
            : new Date().toISOString(),
    }
  }

  private deserializeView(
    data: Record<string, string | number | boolean>,
  ): ViewDefinition {
    return {
      id: data.id as string,
      title: data.title as string,
      filters: data.filters ? JSON.parse(data.filters as string) : [],
      columns: data.columns ? JSON.parse(data.columns as string) : [],
      viewType: data.viewType as 'patient' | 'task',
      sortConfig: data.sortConfig ? JSON.parse(data.sortConfig as string) : [],
      createdAt: data.createdAt
        ? new Date(data.createdAt as string)
        : new Date(),
    }
  }

  private serializeColumn(
    column: ColumnDefinition,
  ): Record<string, string | number | boolean> {
    return {
      id: column.id,
      key: column.key,
      name: column.name,
      type: column.type,
      description: column.description || '',
      properties: JSON.stringify(column.properties || {}),
    }
  }

  private deserializeColumn(
    data: Record<string, string | number | boolean>,
  ): ColumnDefinition {
    return {
      id: data.id as string,
      key: data.key as string,
      name: data.name as string,
      type: data.type as ColumnDefinition['type'],
      description: (data.description as string) || '',
      properties: data.properties ? JSON.parse(data.properties as string) : {},
    }
  }

  // Get the underlying TinyBase store for advanced operations
  getStore(): Store {
    return this.store
  }
}
