import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Panel, View, Column } from '@/types/panel'
import type { ACL } from '@panels/types/acls'

interface ReactiveStoreState {
  // Data tables
  panels: Record<string, Panel>
  views: Record<string, View>
  columns: Record<string, Column>
  acls: Record<string, ACL>

  // Metadata
  isLoading: boolean
  lastSync: number
  error: string | null

  // Save states for operations
  saveStates: Record<string, 'saving' | 'saved' | 'error'>
}

interface ReactiveStoreActions {
  // Panel operations
  setPanel: (panel: Panel) => void
  setPanels: (panels: Panel[]) => void
  updatePanel: (id: string, updates: Partial<Panel>) => void
  deletePanel: (id: string) => void
  getPanel: (id: string) => Panel | undefined
  getPanels: () => Panel[]

  // View operations
  setView: (view: View) => void
  setViews: (views: View[]) => void
  updateView: (viewId: string, updates: Partial<View>) => void
  deleteView: (viewId: string) => void
  getView: (panelId: string, viewId: string) => View | undefined
  getViewsForPanel: (panelId: string) => View[]

  // Column operations
  setColumn: (column: Column) => void
  setColumns: (columns: Column[]) => void
  updateColumn: (columnId: string, updates: Partial<Column>) => void
  deleteColumn: (columnId: string) => void
  getColumn: (columnId: string) => Column | undefined
  getColumnsForPanel: (panelId: string) => Column[]

  // ACL operations
  setACL: (acl: ACL) => void
  setACLs: (acls: ACL[]) => void
  updateACL: (id: number, updates: Partial<ACL>) => void
  deleteACL: (id: number) => void
  getACL: (id: number) => ACL | undefined
  getACLs: (resourceType: 'panel' | 'view', resourceId: number) => ACL[]
  getACLsForResource: (
    resourceType: 'panel' | 'view',
    resourceId: number,
  ) => ACL[]

  // Metadata operations
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  setLastSync: (timestamp: number) => void
  getLoading: () => boolean
  getError: () => string | null
  getLastSync: () => number | null

  // Utility operations
  clearAll: () => void

  // Save state operations
  setSaveState: (
    operationId: string,
    state: 'saving' | 'saved' | 'error',
  ) => void
  getSaveState: (
    operationId: string,
  ) => 'saving' | 'saved' | 'error' | undefined
}

type ReactiveStore = ReactiveStoreState & ReactiveStoreActions

export const useReactiveStore = create<ReactiveStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    panels: {},
    views: {},
    columns: {},
    acls: {},
    isLoading: false,
    lastSync: 0,
    error: null,
    saveStates: {},

    // Panel operations
    setPanel: (panel: Panel) => {
      set((state) => ({
        panels: {
          ...state.panels,
          [panel.id]: panel,
        },
      }))
    },

    setPanels: (panels: Panel[]) => {
      const panelsMap = panels.reduce(
        (acc, panel) => {
          acc[panel.id] = panel
          return acc
        },
        {} as Record<string, Panel>,
      )

      set({ panels: panelsMap })
    },

    updatePanel: (id: string, updates: Partial<Panel>) => {
      set((state) => {
        const currentPanel = state.panels[id]
        if (!currentPanel) return state

        return {
          panels: {
            ...state.panels,
            [id]: { ...currentPanel, ...updates },
          },
        }
      })
    },

    deletePanel: (id: string) => {
      set((state) => {
        const newState = { ...state }

        // Delete the panel
        delete newState.panels[id]

        // Delete all views for this panel
        for (const viewId of Object.keys(newState.views)) {
          if (newState.views[viewId].panelId === id) {
            delete newState.views[viewId]
          }
        }

        // Delete all columns for this panel
        for (const columnId of Object.keys(newState.columns)) {
          if (newState.columns[columnId].panelId === id) {
            delete newState.columns[columnId]
          }
        }

        return newState
      })
    },

    getPanel: (id: string) => {
      return get().panels[id]
    },

    getPanels: () => {
      return Object.values(get().panels)
    },

    // View operations
    setView: (view: View) => {
      set((state) => ({
        views: {
          ...state.views,
          [view.id]: view,
        },
      }))
    },

    setViews: (views: View[]) => {
      const viewsMap = views.reduce(
        (acc, view) => {
          acc[view.id] = view
          return acc
        },
        {} as Record<string, View>,
      )

      set({ views: viewsMap })
    },

    updateView: (viewId: string, updates: Partial<View>) => {
      set((state) => {
        const currentView = state.views[viewId]
        if (!currentView) return state

        return {
          views: {
            ...state.views,
            [viewId]: { ...currentView, ...updates },
          },
        }
      })
    },

    deleteView: (viewId: string) => {
      set((state) => {
        const newViews = { ...state.views }
        delete newViews[viewId]
        return { views: newViews }
      })
    },

    getView: (panelId: string, viewId: string) => {
      const view = get().views[viewId]
      if (!view || view.panelId !== panelId) return undefined
      return view
    },

    getViewsForPanel: (panelId: string) => {
      return Object.values(get().views).filter(
        (view) => view.panelId === panelId,
      )
    },

    // Column operations
    setColumn: (column: Column) => {
      set((state) => ({
        columns: {
          ...state.columns,
          [column.id]: column,
        },
      }))
    },

    setColumns: (columns: Column[]) => {
      const columnsMap = columns.reduce(
        (acc, column) => {
          acc[column.id] = column
          return acc
        },
        {} as Record<string, Column>,
      )

      set({ columns: columnsMap })
    },

    updateColumn: (columnId: string, updates: Partial<Column>) => {
      set((state) => {
        const currentColumn = state.columns[columnId]
        if (!currentColumn) return state

        return {
          columns: {
            ...state.columns,
            [columnId]: { ...currentColumn, ...updates },
          },
        }
      })
    },

    deleteColumn: (columnId: string) => {
      set((state) => {
        const newColumns = { ...state.columns }
        delete newColumns[columnId]
        return { columns: newColumns }
      })
    },

    getColumn: (columnId: string) => {
      return get().columns[columnId]
    },

    getColumnsForPanel: (panelId: string) => {
      return Object.values(get().columns).filter(
        (column) => column.panelId === panelId,
      )
    },

    // ACL operations
    setACL: (acl: ACL) => {
      set((state) => ({
        acls: {
          ...state.acls,
          [acl.id.toString()]: acl,
        },
      }))
    },

    setACLs: (acls: ACL[]) => {
      const aclsMap = acls.reduce(
        (acc, acl) => {
          acc[acl.id.toString()] = acl
          return acc
        },
        {} as Record<string, ACL>,
      )

      set({ acls: aclsMap })
    },

    updateACL: (id: number, updates: Partial<ACL>) => {
      set((state) => {
        const currentACL = state.acls[id.toString()]
        if (!currentACL) return state

        return {
          acls: {
            ...state.acls,
            [id.toString()]: { ...currentACL, ...updates },
          },
        }
      })
    },

    deleteACL: (id: number) => {
      set((state) => {
        const newACLs = { ...state.acls }
        delete newACLs[id.toString()]
        return { acls: newACLs }
      })
    },

    getACL: (id: number) => {
      return get().acls[id.toString()]
    },

    getACLs: (resourceType: 'panel' | 'view', resourceId: number) => {
      return Object.values(get().acls).filter(
        (acl) =>
          acl.resourceType === resourceType && acl.resourceId === resourceId,
      )
    },

    getACLsForResource: (
      resourceType: 'panel' | 'view',
      resourceId: number,
    ) => {
      return get().getACLs(resourceType, resourceId)
    },

    // Metadata operations
    setLoading: (isLoading: boolean) => {
      set({ isLoading })
    },

    setError: (error: string | null) => {
      set({ error: error || null })
    },

    setLastSync: (timestamp: number) => {
      set({ lastSync: timestamp })
    },

    getLoading: () => {
      return get().isLoading
    },

    getError: () => {
      return get().error
    },

    getLastSync: () => {
      return get().lastSync
    },

    // Utility operations
    clearAll: () => {
      set({
        panels: {},
        views: {},
        columns: {},
        acls: {},
        isLoading: false,
        lastSync: 0,
        error: null,
        saveStates: {},
      })
    },

    // Save state operations
    setSaveState: (
      operationId: string,
      state: 'saving' | 'saved' | 'error',
    ) => {
      set((currentState) => ({
        saveStates: {
          ...currentState.saveStates,
          [operationId]: state,
        },
      }))
    },

    getSaveState: (operationId: string) => {
      return get().saveStates[operationId]
    },
  })),
)

// Export a class-like interface for compatibility with existing code
export class ReactiveStoreZustand {
  private store = useReactiveStore

  // Panel operations
  getPanels(): Panel[] {
    return this.store.getState().getPanels()
  }

  getPanel(id: string): Panel | undefined {
    return this.store.getState().getPanel(id)
  }

  setPanel(panel: Panel) {
    this.store.getState().setPanel(panel)
  }

  setPanels(panels: Panel[]) {
    this.store.getState().setPanels(panels)
  }

  updatePanel(id: string, updates: Partial<Panel>) {
    this.store.getState().updatePanel(id, updates)
  }

  deletePanel(id: string) {
    this.store.getState().deletePanel(id)
  }

  // View operations
  getView(panelId: string, viewId: string): View | undefined {
    return this.store.getState().getView(panelId, viewId)
  }

  getViewsForPanel(panelId: string): View[] {
    return this.store.getState().getViewsForPanel(panelId)
  }

  setView(view: View) {
    this.store.getState().setView(view)
  }

  setViews(views: View[]) {
    this.store.getState().setViews(views)
  }

  updateView(viewId: string, updates: Partial<View>) {
    this.store.getState().updateView(viewId, updates)
  }

  deleteView(viewId: string) {
    this.store.getState().deleteView(viewId)
  }

  // Column operations
  getColumnsForPanel(panelId: string): Column[] {
    return this.store.getState().getColumnsForPanel(panelId)
  }

  getColumn(columnId: string): Column | undefined {
    return this.store.getState().getColumn(columnId)
  }

  setColumn(column: Column) {
    this.store.getState().setColumn(column)
  }

  setColumns(columns: Column[]) {
    this.store.getState().setColumns(columns)
  }

  updateColumn(columnId: string, updates: Partial<Column>) {
    this.store.getState().updateColumn(columnId, updates)
  }

  deleteColumn(columnId: string) {
    this.store.getState().deleteColumn(columnId)
  }

  // ACL operations
  getACLs(resourceType: 'panel' | 'view', resourceId: number): ACL[] {
    return this.store.getState().getACLs(resourceType, resourceId)
  }

  getACL(id: number): ACL | undefined {
    return this.store.getState().getACL(id)
  }

  setACL(acl: ACL) {
    this.store.getState().setACL(acl)
  }

  setACLs(acls: ACL[]) {
    this.store.getState().setACLs(acls)
  }

  updateACL(id: number, updates: Partial<ACL>) {
    this.store.getState().updateACL(id, updates)
  }

  deleteACL(id: number) {
    this.store.getState().deleteACL(id)
  }

  getACLsForResource(
    resourceType: 'panel' | 'view',
    resourceId: number,
  ): ACL[] {
    return this.store.getState().getACLsForResource(resourceType, resourceId)
  }

  // Metadata operations
  setLoading(isLoading: boolean) {
    this.store.getState().setLoading(isLoading)
  }

  setError(error: string | null) {
    this.store.getState().setError(error)
  }

  setLastSync(timestamp: number) {
    this.store.getState().setLastSync(timestamp)
  }

  getLoading(): boolean {
    return this.store.getState().getLoading()
  }

  getError(): string | null {
    return this.store.getState().getError()
  }

  getLastSync(): number | null {
    return this.store.getState().getLastSync()
  }

  // Get the underlying Zustand store for reactive hooks
  getStore() {
    return this.store
  }

  // Save state operations
  setSaveState(operationId: string, state: 'saving' | 'saved' | 'error') {
    this.store.getState().setSaveState(operationId, state)
  }

  getSaveState(operationId: string) {
    return this.store.getState().getSaveState(operationId)
  }
}
