'use client'

import type {
  Column,
  Panel,
  View,
} from '@/types/panel'
import { useMemo } from 'react'
import { useRow, useTable, useValue } from 'tinybase/ui-react'
import { useReactivePanelStore } from './use-reactive-panel-store'

/**
 * Deserialize panel data from TinyBase format
 */
function deserializePanel(data: Record<string, string | number | boolean>): Panel {
  return {
    id: data.id as string,
    name: data.name as string,
    description: (data.description as string) || undefined,
    metadata: data.metadata ? JSON.parse(data.metadata as string) : { filters: [] },
    createdAt: data.createdAt ? new Date(data.createdAt as string) : new Date(),
  }
}

/**
 * Deserialize view data from TinyBase format
 */
function deserializeView(data: Record<string, string | number | boolean>): View {
  return {
    id: data.id as string,
    name: data.name as string,
    panelId: data.panelId as string,
    visibleColumns: data.visibleColumns ? JSON.parse(data.visibleColumns as string) : [],
    isPublished: Boolean(data.isPublished),
    metadata: data.metadata ? JSON.parse(data.metadata as string) : { filters: [], viewType: 'patient' },
    createdAt: data.createdAt ? new Date(data.createdAt as string) : new Date(),
  }
}

/**
 * Deserialize column data from TinyBase format
 */
function deserializeColumn(data: Record<string, string | number | boolean>): Column {
  return {
    id: data.id as string,
    panelId: data.panelId as string,
    name: data.name as string,
    type: data.type as Column['type'],
    sourceField: (data.sourceField as string) || undefined,
    tags: data.tags ? JSON.parse(data.tags as string) : [],
    properties: data.properties ? JSON.parse(data.properties as string) : { display: {} },
    metadata: data.metadata ? JSON.parse(data.metadata as string) : {},
  }
}

/**
 * Hook to get reactive panels data
 * Now uses TinyBase ui-react for automatic reactivity
 */
export function useReactivePanels() {
  const { store } = useReactivePanelStore()

  // These hooks automatically re-render when data changes - no manual subscriptions!
  const panelsTable = useTable('panels', store)
  const isLoading = useValue('isLoading', store) as boolean
  const error = useValue('error', store) as string | null

  const panels = useMemo(() => {
    if (!panelsTable) return []
    return Object.values(panelsTable).map(deserializePanel)
  }, [panelsTable])

  return {
    panels,
    isLoading: Boolean(isLoading),
    error: error || null,
  }
}

/**
 * Hook to get reactive panel data
 * Now uses TinyBase ui-react for automatic reactivity
 */
export function useReactivePanel(panelId: string) {
  const { store } = useReactivePanelStore()

  // Automatically reactive - no manual subscriptions needed!
  const panelRow = useRow('panels', panelId, store)
  const isLoading = useValue('isLoading', store) as boolean
  const error = useValue('error', store) as string | null

  const panel = useMemo(() => {
    if (!panelRow) return null
    return deserializePanel(panelRow)
  }, [panelRow])

  return {
    panel,
    isLoading: Boolean(isLoading),
    error: error || null,
  }
}

/**
 * Hook to get reactive view data
 * Now uses TinyBase ui-react for automatic reactivity
 */
export function useReactiveView(panelId: string, viewId: string) {
  const { store } = useReactivePanelStore()

  // Automatically reactive!
  const viewRow = useRow('views', viewId, store)
  const isLoading = useValue('isLoading', store) as boolean
  const error = useValue('error', store) as string | null

  const view = useMemo(() => {
    if (!viewRow) return null
    const deserializedView = deserializeView(viewRow)

    // Verify this view belongs to the specified panel
    if (deserializedView.panelId !== panelId) return null

    return deserializedView
  }, [viewRow, panelId])

  return {
    view,
    isLoading: Boolean(isLoading),
    error: error || null,
  }
}

/**
 * Hook to get reactive columns for a panel
 * Now uses TinyBase ui-react with automatic filtering
 */
export function useReactiveColumns(panelId: string) {
  const { store } = useReactivePanelStore()

  // Get all columns automatically - reactive!
  const columnsTable = useTable('columns', store)
  const isLoading = useValue('isLoading', store) as boolean
  const error = useValue('error', store) as string | null

  // Filter columns for this panel
  const columns = useMemo(() => {
    if (!columnsTable) return []
    return Object.values(columnsTable)
      .map(deserializeColumn)
      .filter(column => column.panelId === panelId)
  }, [columnsTable, panelId])

  return {
    columns,
    isLoading: Boolean(isLoading),
    error: error || null,
  }
}

/**
 * Hook to get reactive views for a panel
 * Now uses TinyBase ui-react with automatic filtering
 */
export function useReactiveViews(panelId: string) {
  const { store } = useReactivePanelStore()

  // Get all views automatically - reactive!
  const viewsTable = useTable('views', store)
  const isLoading = useValue('isLoading', store) as boolean
  const error = useValue('error', store) as string | null

  // Filter views for this panel
  const views = useMemo(() => {
    if (!viewsTable) return []
    return Object.values(viewsTable)
      .map(deserializeView)
      .filter(view => view.panelId === panelId)
  }, [viewsTable, panelId])

  return {
    views,
    isLoading: Boolean(isLoading),
    error: error || null,
  }
}

/**
 * Hook to get reactive save state for operations
 * Uses TinyBase for reactive save state tracking
 */
export function useSaveState(operationId: string) {
  const { store } = useReactivePanelStore()
  return useValue(`saveState_${operationId}`, store) as 'saving' | 'saved' | 'error' | undefined
}
