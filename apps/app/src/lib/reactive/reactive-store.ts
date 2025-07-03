import { createStore, type Store } from 'tinybase'
import type { Panel, View, Column, ViewType, Filter } from '@/types/panel'

/**
 * Reactive Store using TinyBase for managing panels, views, and columns as separate entities
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
    // Initialize tables for panels, views, and columns as separate entities
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

  // Panel operations - simplified since panels no longer contain columns/views
  getPanels(): Panel[] {
    const panels = this.store.getTable('panels')
    return Object.values(panels).map((panel) => {
      const panelData = panel as Record<string, string | number | boolean>
      return this.deserializePanel(panelData)
    })
  }

  getPanel(id: string): Panel | undefined {
    const panel = this.store.getRow('panels', id)
    if (!panel) return undefined

    const panelData = panel as Record<string, string | number | boolean>
    return this.deserializePanel(panelData)
  }

  setPanel(panel: Panel) {
    const serialized = this.serializePanel(panel)
    this.store.setRow('panels', panel.id, serialized)
  }

  setPanels(panels: Panel[]) {
    const serializedPanels: Record<
      string,
      Record<string, string | number | boolean>
    > = {}

    for (const panel of panels) {
      serializedPanels[panel.id] = this.serializePanel(panel)
    }

    this.store.setTable('panels', serializedPanels)
  }

  updatePanel(id: string, updates: Partial<Panel>) {
    const currentPanel = this.getPanel(id)
    if (!currentPanel) return

    const updatedPanel = { ...currentPanel, ...updates }
    this.setPanel(updatedPanel)
  }

  deletePanel(id: string) {
    // Delete the panel
    this.store.delRow('panels', id)

    // Delete all views for this panel
    const views = this.store.getTable('views')
    const viewsToDelete = Object.entries(views)
      .filter(([, view]) => {
        const viewData = view as Record<string, string | number | boolean>
        return viewData.panelId === id
      })
      .map(([viewId]) => viewId)

    for (const viewId of viewsToDelete) {
      this.store.delRow('views', viewId)
    }

    // Delete all columns for this panel
    const columns = this.store.getTable('columns')
    const columnsToDelete = Object.entries(columns)
      .filter(([, column]) => {
        const columnData = column as Record<string, string | number | boolean>
        return columnData.panelId === id
      })
      .map(([columnId]) => columnId)

    for (const columnId of columnsToDelete) {
      this.store.delRow('columns', columnId)
    }
  }

  // View operations - independent of panels
  getView(panelId: string, viewId: string): View | undefined {
    const view = this.store.getRow('views', viewId)
    if (!view) return undefined

    const viewData = view as Record<string, string | number | boolean>
    const deserializedView = this.deserializeView(viewData)

    // Verify this view belongs to the specified panel
    if (deserializedView.panelId !== panelId) return undefined

    return deserializedView
  }

  getViewsForPanel(panelId: string): View[] {
    const views = this.store.getTable('views')
    return Object.entries(views)
      .map(([, view]) => {
        const viewData = view as Record<string, string | number | boolean>
        return this.deserializeView(viewData)
      })
      .filter((view) => view.panelId === panelId)
  }

  setView(view: View) {
    const serialized = this.serializeView(view)
    this.store.setRow('views', view.id, serialized)
  }

  setViews(views: View[]) {
    const serializedViews: Record<
      string,
      Record<string, string | number | boolean>
    > = {}

    for (const view of views) {
      serializedViews[view.id] = this.serializeView(view)
    }

    this.store.setTable('views', serializedViews)
  }

  updateView(viewId: string, updates: Partial<View>) {
    const currentView = this.store.getRow('views', viewId)
    if (!currentView) return

    const currentViewData = this.deserializeView(
      currentView as Record<string, string | number | boolean>,
    )
    const updatedView = { ...currentViewData, ...updates }
    this.setView(updatedView)
  }

  deleteView(viewId: string) {
    this.store.delRow('views', viewId)
  }

  // Column operations - independent of panels
  getColumnsForPanel(panelId: string): Column[] {
    const columns = this.store.getTable('columns')
    return Object.entries(columns)
      .map(([, column]) => {
        const columnData = column as Record<string, string | number | boolean>
        return this.deserializeColumn(columnData)
      })
      .filter((column) => column.panelId === panelId)
  }

  getColumn(columnId: string): Column | undefined {
    const column = this.store.getRow('columns', columnId)
    if (!column) return undefined

    const columnData = column as Record<string, string | number | boolean>
    return this.deserializeColumn(columnData)
  }

  setColumn(column: Column) {
    const serialized = this.serializeColumn(column)
    this.store.setRow('columns', column.id, serialized)
  }

  setColumns(columns: Column[]) {
    const serializedColumns: Record<
      string,
      Record<string, string | number | boolean>
    > = {}

    for (const column of columns) {
      serializedColumns[column.id] = this.serializeColumn(column)
    }

    this.store.setTable('columns', serializedColumns)
  }

  updateColumn(columnId: string, updates: Partial<Column>) {
    const currentColumn = this.store.getRow('columns', columnId)
    if (!currentColumn) return

    const currentColumnData = this.deserializeColumn(
      currentColumn as Record<string, string | number | boolean>,
    )
    const updatedColumn = { ...currentColumnData, ...updates }
    this.setColumn(updatedColumn)
  }

  deleteColumn(columnId: string) {
    this.store.delRow('columns', columnId)
  }

  // Metadata operations
  setLoading(isLoading: boolean) {
    this.store.setValue('isLoading', isLoading)
  }

  setError(error: string | null) {
    this.store.setValue('error', error || '')
  }

  setLastSync(timestamp: number) {
    this.store.setValue('lastSync', timestamp)
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

  // Simplified serialization helpers
  private serializePanel(
    panel: Panel,
  ): Record<string, string | number | boolean> {
    return {
      id: panel.id,
      name: panel.name,
      description: panel.description || '',
      metadata: JSON.stringify(panel.metadata || {}),
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
  ): Panel {
    return {
      id: data.id as string,
      name: data.name as string,
      description: (data.description as string) || undefined,
      metadata: data.metadata
        ? JSON.parse(data.metadata as string)
        : { filters: [] },
      createdAt: data.createdAt
        ? new Date(data.createdAt as string)
        : new Date(),
    }
  }

  private serializeView(view: View): Record<string, string | number | boolean> {
    return {
      id: view.id,
      name: view.name,
      panelId: view.panelId,
      visibleColumns: JSON.stringify(view.visibleColumns),
      isPublished: view.isPublished,
      metadata: JSON.stringify(view.metadata || {}),
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
  ): View {
    return {
      id: data.id as string,
      name: data.name as string,
      panelId: data.panelId as string,
      visibleColumns: data.visibleColumns
        ? JSON.parse(data.visibleColumns as string)
        : [],
      isPublished: Boolean(data.isPublished),
      metadata: data.metadata
        ? JSON.parse(data.metadata as string)
        : { filters: [], viewType: 'patient' },
      createdAt: data.createdAt
        ? new Date(data.createdAt as string)
        : new Date(),
    }
  }

  private serializeColumn(
    column: Column,
  ): Record<string, string | number | boolean> {
    return {
      id: column.id,
      panelId: column.panelId,
      name: column.name,
      type: column.type,
      sourceField: column.sourceField || '',
      tags: JSON.stringify(column.tags || []),
      properties: JSON.stringify(column.properties || {}),
      metadata: JSON.stringify(column.metadata || {}),
    }
  }

  private deserializeColumn(
    data: Record<string, string | number | boolean>,
  ): Column {
    return {
      id: data.id as string,
      panelId: data.panelId as string,
      name: data.name as string,
      type: data.type as Column['type'],
      sourceField: (data.sourceField as string) || undefined,
      tags: data.tags ? JSON.parse(data.tags as string) : [],
      properties: data.properties
        ? JSON.parse(data.properties as string)
        : { display: {} },
      metadata: data.metadata ? JSON.parse(data.metadata as string) : {},
    }
  }

  // Get the underlying TinyBase store for advanced operations
  getStore(): Store {
    return this.store
  }
}
