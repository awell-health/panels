'use client'

import type { Column, Panel, View } from '@/types/panel'
import { useMemo } from 'react'
import { useReactivePanelStore } from './use-reactive-panel-store'

/**
 * Hook to get reactive panels data using Zustand
 */
export function useReactivePanels() {
  const { getReactiveStore } = useReactivePanelStore()
  const reactiveStore = getReactiveStore()

  if (!reactiveStore) {
    return {
      panels: [],
      isLoading: true,
      error: 'Store not initialized',
    }
  }

  const store = reactiveStore.getStore()
  const panels = store((state) => state.panels)
  const isLoading = store((state) => state.isLoading)
  const error = store((state) => state.error)

  const panelsArray = useMemo(() => {
    const result = Object.values(panels)
    return result
  }, [panels])

  return {
    panels: panelsArray,
    isLoading: Boolean(isLoading),
    error: error || null,
  }
}

/**
 * Hook to get reactive panel data using Zustand
 */
export function useReactivePanel(panelId: string) {
  const { getReactiveStore } = useReactivePanelStore()
  const reactiveStore = getReactiveStore()

  if (!reactiveStore) {
    return {
      panel: null,
      isLoading: true,
      error: 'Store not initialized',
    }
  }

  const store = reactiveStore.getStore()
  const panel = store((state) => state.panels[panelId])
  const isLoading = store((state) => state.isLoading)
  const error = store((state) => state.error)

  return {
    panel: panel || null,
    isLoading: Boolean(isLoading),
    error: error || null,
  }
}

/**
 * Hook to get reactive view data using Zustand
 */
export function useReactiveView(panelId: string, viewId: string) {
  const { getReactiveStore } = useReactivePanelStore()
  const reactiveStore = getReactiveStore()

  if (!reactiveStore) {
    return {
      view: null,
      isLoading: true,
      error: 'Store not initialized',
    }
  }

  const store = reactiveStore.getStore()
  const view = store((state) => state.views[viewId])
  const isLoading = store((state) => state.isLoading)
  const error = store((state) => state.error)

  const validView = useMemo(() => {
    if (!view || view.panelId !== panelId) return null
    return view
  }, [view, panelId])

  return {
    view: validView,
    isLoading: Boolean(isLoading),
    error: error || null,
  }
}

/**
 * Hook to get reactive columns for a panel using Zustand
 */
export function useReactiveColumns(panelId: string) {
  const { getReactiveStore } = useReactivePanelStore()
  const reactiveStore = getReactiveStore()

  if (!reactiveStore) {
    return {
      columns: [],
      isLoading: true,
      error: 'Store not initialized',
    }
  }

  const store = reactiveStore.getStore()
  const columns = store((state) => state.columns)
  const isLoading = store((state) => state.isLoading)
  const error = store((state) => state.error)

  const panelColumns = useMemo(() => {
    return Object.values(columns).filter((column) => column.panelId === panelId)
  }, [columns, panelId])

  return {
    columns: panelColumns,
    isLoading: Boolean(isLoading),
    error: error || null,
  }
}

/**
 * Hook to get reactive views for a panel using Zustand
 */
export function useReactiveViews(panelId: string) {
  const { getReactiveStore } = useReactivePanelStore()
  const reactiveStore = getReactiveStore()

  if (!reactiveStore) {
    return {
      views: [],
      isLoading: true,
      error: 'Store not initialized',
    }
  }

  const store = reactiveStore.getStore()
  const views = store((state) => state.views)
  const isLoading = store((state) => state.isLoading)
  const error = store((state) => state.error)

  const panelViews = useMemo(() => {
    return Object.values(views).filter((view) => view.panelId === panelId)
  }, [views, panelId])

  return {
    views: panelViews,
    isLoading: Boolean(isLoading),
    error: error || null,
  }
}

/**
 * Hook to get reactive save state for operations using Zustand
 */
export function useSaveState(operationId: string) {
  const { getReactiveStore } = useReactivePanelStore()
  const reactiveStore = getReactiveStore()

  if (!reactiveStore) {
    return 'error' as const
  }

  const store = reactiveStore.getStore()
  const saveState = store((state) => state.saveStates[operationId])

  return saveState || 'saved'
}

/**
 * Hook to get reactive ACLs for a resource using Zustand
 */
export function useReactiveACLs(
  resourceType: 'panel' | 'view',
  resourceId: number,
) {
  const { getReactiveStore } = useReactivePanelStore()
  const reactiveStore = getReactiveStore()

  if (!reactiveStore) {
    return {
      acls: [],
      isLoading: true,
      error: 'Store not initialized',
    }
  }

  const store = reactiveStore.getStore()
  const acls = store((state) => state.acls)
  const isLoading = store((state) => state.isLoading)
  const error = store((state) => state.error)

  const resourceACLs = useMemo(() => {
    return Object.values(acls).filter(
      (acl) =>
        acl.resourceType === resourceType && acl.resourceId === resourceId,
    )
  }, [acls, resourceType, resourceId])

  return {
    acls: resourceACLs,
    isLoading: Boolean(isLoading),
    error: error || null,
  }
}
