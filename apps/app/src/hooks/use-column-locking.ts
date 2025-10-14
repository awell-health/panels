import { useCallback } from 'react'
import type { Column } from '@/types/panel'
import { useReactiveView, useReactivePanel } from './use-reactive-data-zustand'
import { useReactivePanelStore } from './use-reactive-panel-store'
import { useColumnOperations } from './use-column-operations'

/**
 * Column locking manager hook that provides view-specific or panel-specific locking
 * @param panelId - The panel ID
 * @param viewId - Optional view ID. If provided, manages view-specific locking
 * @returns Column locking management interface
 */
export function useColumnLocking(panelId: string, viewId?: string) {
  const { view } = useReactiveView(panelId, viewId || '')
  const { panel } = useReactivePanel(panelId)
  const { updateView } = useReactivePanelStore()
  const { updateColumn } = useColumnOperations()

  const contextType = viewId ? 'view' : 'panel'

  /**
   * Check if a column is locked in the current context (view or panel)
   */
  const isColumnLocked = useCallback(
    (columnId: string): boolean => {
      if (contextType === 'view' && view) {
        // View context - check view-specific locked state first
        if (view.metadata.columnLocked) {
          const viewSpecificLocked = view.metadata.columnLocked[columnId]
          if (viewSpecificLocked !== undefined) {
            return viewSpecificLocked
          }
        }

        // No view-specific locked state - for backward compatibility, fall back to column-level locked state
        // But only if this column is visible in the view
        if (view.visibleColumns.includes(columnId)) {
          // We would need to fetch the column to check its locked state
          // For now, return false as default
          return false
        }

        return false
      }

      // Panel context - check column-level locked state for backward compatibility
      // This would require fetching all columns, which we don't have in this hook
      // Return false for now
      return false
    },
    [contextType, view],
  )

  /**
   * Set locked state for a column in the current context
   */
  const setColumnLocked = useCallback(
    async (columnId: string, locked: boolean): Promise<void> => {
      if (contextType === 'view' && view && viewId) {
        // View context - update view metadata
        const currentColumnLocked = view.metadata.columnLocked || {}
        const newColumnLocked = {
          ...currentColumnLocked,
          [columnId]: locked,
        }

        await updateView(panelId, viewId, {
          metadata: {
            ...view.metadata,
            columnLocked: newColumnLocked,
          },
        })
      } else if (contextType === 'panel') {
        // Panel context - update column properties for backward compatibility
        await updateColumn(panelId, columnId, {
          properties: {
            display: {
              locked,
              // When locking at panel level, use negative timestamp for ordering
              order: locked ? -Date.now() : undefined,
            },
          },
        })
      }
    },
    [contextType, view, updateView, updateColumn, panelId, viewId],
  )

  /**
   * Toggle locked state for a column
   */
  const toggleColumnLocked = useCallback(
    async (columnId: string): Promise<void> => {
      const currentlyLocked = isColumnLocked(columnId)
      await setColumnLocked(columnId, !currentlyLocked)
    },
    [isColumnLocked, setColumnLocked],
  )

  /**
   * Get all locked column IDs in the current context
   */
  const getLockedColumnIds = useCallback((): string[] => {
    if (contextType === 'view' && view?.metadata.columnLocked) {
      return Object.entries(view.metadata.columnLocked)
        .filter(([, locked]) => locked)
        .map(([columnId]) => columnId)
    }

    return []
  }, [contextType, view])

  return {
    contextType,
    isColumnLocked,
    setColumnLocked,
    toggleColumnLocked,
    getLockedColumnIds,
  }
}
