'use client'

import { useEffect, useState, useCallback, useContext } from 'react'
import { useStore, useTable, useValue } from 'tinybase/ui-react'
import type {
  PanelDefinition,
  ViewDefinition,
  ColumnDefinition,
} from '@/types/worklist'
import { getStorageAdapter } from '@/lib/storage/storage-factory'
import type { StorageAdapter } from '@/lib/storage/types'
import type { ReactiveStore } from '@/lib/reactive/reactive-store'
import { ReactivePanelStoreContext } from './use-reactive-panel-store'

// Type for reactive storage adapter
interface ReactiveStorageAdapter extends StorageAdapter {
  getReactiveStore(): ReactiveStore
}

/**
 * Hook to get reactive panels data
 * Automatically updates when panels change in the store
 */
export function useReactivePanels() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [panels, setPanels] = useState<PanelDefinition[]>([])

  // Get the reactive store from the ReactivePanelStore context
  const reactivePanelStore = useContext(ReactivePanelStoreContext)

  // Initialize and subscribe to reactive store
  useEffect(() => {
    let isMounted = true

    const initializeReactiveStore = () => {
      try {
        if (!reactivePanelStore) {
          return
        }

        // Get the reactive store from the panel store
        const reactiveStore = reactivePanelStore.getReactiveStore()

        if (!reactiveStore) {
          return
        }

        if (!isMounted) return

        // Get initial data
        const initialPanels = reactiveStore.getPanels()

        if (!isMounted) return

        setPanels(initialPanels)
        setIsLoading(reactiveStore.getLoading())
        setError(reactiveStore.getError() || null)

        // Subscribe to changes
        const unsubscribe = reactiveStore.subscribe(() => {
          if (!isMounted) return

          const updatedPanels = reactiveStore.getPanels()
          const loading = reactiveStore.getLoading()
          const error = reactiveStore.getError()

          setPanels(updatedPanels)
          setIsLoading(loading)
          setError(error || null)
        })

        return unsubscribe
      } catch (err) {
        if (!isMounted) return
        console.error(
          'useReactivePanels: failed to initialize reactive store:',
          err,
        )
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to initialize reactive store',
        )
        setIsLoading(false)
      }
    }

    const unsubscribe = initializeReactiveStore()

    return () => {
      isMounted = false
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [reactivePanelStore]) // Add reactivePanelStore as dependency

  const refetch = useCallback(() => {
    if (reactivePanelStore) {
      const reactiveStore = reactivePanelStore.getReactiveStore()
      if (reactiveStore) {
        const updatedPanels = reactiveStore.getPanels()
        setPanels(updatedPanels)
        setIsLoading(reactiveStore.getLoading())
        setError(reactiveStore.getError() || null)
      }
    }
  }, [reactivePanelStore])

  return {
    panels,
    isLoading,
    error,
    refetch,
  }
}

/**
 * Hook to get reactive panel data
 * Automatically updates when panel changes in the store
 */
export function useReactivePanel(panelId: string) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [panel, setPanel] = useState<PanelDefinition | null>(null)

  // Get the reactive store from the ReactivePanelStore context
  const reactivePanelStore = useContext(ReactivePanelStoreContext)

  // Initialize and subscribe to reactive store
  useEffect(() => {
    let isMounted = true

    const initializeReactiveStore = () => {
      try {
        if (!reactivePanelStore) {
          return
        }

        // Get the reactive store from the panel store
        const reactiveStore = reactivePanelStore.getReactiveStore()

        if (!reactiveStore) {
          return
        }

        if (!isMounted) return

        // Get initial data
        const initialPanel = reactiveStore.getPanel(panelId)

        if (!isMounted) return

        setPanel(initialPanel || null)
        setIsLoading(reactiveStore.getLoading())
        setError(reactiveStore.getError() || null)

        // Subscribe to changes
        const unsubscribe = reactiveStore.subscribe(() => {
          if (!isMounted) return

          const updatedPanel = reactiveStore.getPanel(panelId)
          const loading = reactiveStore.getLoading()
          const error = reactiveStore.getError()

          setPanel(updatedPanel || null)
          setIsLoading(loading)
          setError(error || null)
        })

        return unsubscribe
      } catch (err) {
        if (!isMounted) return
        console.error(
          'useReactivePanel: failed to initialize reactive store:',
          err,
        )
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to initialize reactive store',
        )
        setIsLoading(false)
      }
    }

    const unsubscribe = initializeReactiveStore()

    return () => {
      isMounted = false
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [reactivePanelStore, panelId])

  return {
    panel,
    isLoading,
    error,
  }
}

/**
 * Hook to get reactive view data
 * Automatically updates when view changes in the store
 */
export function useReactiveView(panelId: string, viewId: string) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewDefinition | null>(null)

  // Get the reactive store from the ReactivePanelStore context
  const reactivePanelStore = useContext(ReactivePanelStoreContext)

  // Initialize and subscribe to reactive store
  useEffect(() => {
    let isMounted = true

    const initializeReactiveStore = () => {
      try {
        if (!reactivePanelStore) {
          return
        }

        // Get the reactive store from the panel store
        const reactiveStore = reactivePanelStore.getReactiveStore()

        if (!reactiveStore) {
          return
        }

        if (!isMounted) return

        // Get initial data
        const initialView = reactiveStore.getView(panelId, viewId)

        if (!isMounted) return

        setView(initialView || null)
        setIsLoading(reactiveStore.getLoading())
        setError(reactiveStore.getError() || null)

        // Subscribe to changes
        const unsubscribe = reactiveStore.subscribe(() => {
          if (!isMounted) return

          const updatedView = reactiveStore.getView(panelId, viewId)
          const loading = reactiveStore.getLoading()
          const error = reactiveStore.getError()

          setView(updatedView || null)
          setIsLoading(loading)
          setError(error || null)
        })

        return unsubscribe
      } catch (err) {
        if (!isMounted) return
        console.error(
          'useReactiveView: failed to initialize reactive store:',
          err,
        )
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to initialize reactive store',
        )
        setIsLoading(false)
      }
    }

    const unsubscribe = initializeReactiveStore()

    return () => {
      isMounted = false
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [reactivePanelStore, panelId, viewId])

  return {
    view,
    isLoading,
    error,
  }
}

/**
 * Hook to get reactive columns for a panel
 */
export function useReactiveColumns(panelId: string) {
  const [columns, setColumns] = useState<ColumnDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get the storage adapter from the ReactivePanelStore context
  const reactiveStore = useContext(ReactivePanelStoreContext)

  // Load columns when storage and panelId are available
  useEffect(() => {
    const storage = reactiveStore?.getStorage()
    if (!storage || !panelId) return

    let isMounted = true

    const loadColumns = async () => {
      try {
        setIsLoading(true)
        // Load panel to get columns
        const panel = await storage.getPanel(panelId)

        if (!isMounted) return

        if (panel) {
          const allColumns = [
            ...(panel.patientViewColumns || []),
            ...(panel.taskViewColumns || []),
          ]
          setColumns(allColumns)
        }
        setError(null)
      } catch (err) {
        if (!isMounted) return
        console.error('useReactiveColumns: failed to load columns', err)
        setError(err instanceof Error ? err.message : 'Failed to load columns')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadColumns()

    return () => {
      isMounted = false
    }
  }, [reactiveStore, panelId])

  const refetch = useCallback(() => {
    const storage = reactiveStore?.getStorage()
    if (storage && panelId) {
      storage
        .getPanel(panelId)
        .then((panel) => {
          if (panel) {
            const allColumns = [
              ...(panel.patientViewColumns || []),
              ...(panel.taskViewColumns || []),
            ]
            setColumns(allColumns)
          }
        })
        .catch((err: Error) =>
          setError(
            err instanceof Error ? err.message : 'Failed to refetch columns',
          ),
        )
    }
  }, [reactiveStore, panelId])

  return {
    columns,
    isLoading,
    error,
    refetch,
  }
}
