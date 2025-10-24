import { useCallback, useMemo } from 'react'
import type { Column, ColumnVisibilityContext } from '@/types/panel'
import {
  useReactiveColumns,
  useReactivePanel,
  useReactiveView,
} from './use-reactive-data-zustand'
import { useReactivePanelStore } from './use-reactive-panel-store'
import { useColumnOperations } from './use-column-operations'
import { useColumnLocking } from './use-column-locking'

/**
 * Column visibility manager hook that provides a unified interface for both panel and view contexts
 * @param panelId - The panel ID
 * @param viewId - Optional view ID. If provided, manages view-specific visibility
 * @param currentViewType - Optional current view type. If provided, uses this instead of panel metadata
 * @returns ColumnVisibilityContext object with unified visibility management interface
 */
export function useColumnVisibility(
  panelId: string,
  viewId?: string,
  currentViewType?: string,
): ColumnVisibilityContext {
  const { columns: allColumns } = useReactiveColumns(panelId)
  const { panel } = useReactivePanel(panelId)
  const { view } = useReactiveView(panelId, viewId || '')
  const { updateView } = useReactivePanelStore()
  const { updateColumn } = useColumnOperations()

  // Determine context type and get relevant columns
  const contextType = viewId ? 'view' : 'panel'
  const effectiveViewType =
    currentViewType ||
    view?.metadata.viewType ||
    panel?.metadata.viewType ||
    'patient'

  // Filter columns based on context
  const contextColumns = useMemo(() => {
    if (contextType === 'view' && view) {
      // For views: only return columns that are explicitly associated with this view
      const viewColumnIds = new Set([
        ...view.visibleColumns,
        ...(view.metadata.columnVisibility
          ? Object.keys(view.metadata.columnVisibility)
          : []),
      ])

      return allColumns.filter((col) => viewColumnIds.has(col.id))
    }

    if (effectiveViewType === 'patient') {
      return allColumns.filter((col) => col.tags?.includes('panels:patients'))
    }

    if (effectiveViewType === 'task') {
      return allColumns.filter((col) => col.tags?.includes('panels:tasks'))
    }

    if (effectiveViewType === 'appointment') {
      return allColumns.filter((col) =>
        col.tags?.includes('panels:appointments'),
      )
    }

    return allColumns
  }, [allColumns, effectiveViewType, contextType, view])

  // Get visibility for a specific column
  const getVisibility = useCallback(
    (columnId: string): boolean => {
      if (contextType === 'view' && view) {
        // View context - check columnVisibility metadata first
        if (view.metadata.columnVisibility) {
          return view.metadata.columnVisibility[columnId] ?? false
        }
        // Fallback for old views - check if column is in visibleColumns array
        return view.visibleColumns.includes(columnId)
      }

      // Panel context - check column display properties
      const column = allColumns.find((col) => col.id === columnId)
      return column?.properties?.display?.visible !== false
    },
    [contextType, view, allColumns],
  )

  // Set visibility for a specific column
  const setVisibility = useCallback(
    async (columnId: string, visible: boolean): Promise<void> => {
      if (contextType === 'view' && view && updateView) {
        // View context - update view metadata
        const currentColumnVisibility = view.metadata.columnVisibility || {}
        const newColumnVisibility = {
          ...currentColumnVisibility,
          [columnId]: visible,
        }

        // Also update visibleColumns array for backward compatibility
        let newVisibleColumns = [...view.visibleColumns]
        if (visible) {
          if (!newVisibleColumns.includes(columnId)) {
            newVisibleColumns.push(columnId)
          }
        } else {
          newVisibleColumns = newVisibleColumns.filter((id) => id !== columnId)
        }

        if (viewId) {
          await updateView(panelId, viewId, {
            visibleColumns: newVisibleColumns,
            metadata: {
              ...view.metadata,
              columnVisibility: newColumnVisibility,
            },
          })
        }
      } else if (contextType === 'panel') {
        // Panel context - update column display properties
        await updateColumn(panelId, columnId, {
          properties: {
            display: {
              visible,
            },
          },
        })
      }
    },
    [contextType, view, updateView, updateColumn, panelId, viewId],
  )

  // Get visible columns
  const getVisibleColumns = useCallback((): Column[] => {
    if (view) {
      // For view context: get columns in view order, then separate locked/unlocked
      const viewColumns =
        view?.visibleColumns
          .map((col) => {
            return contextColumns.find((c) => c.id === col)
          })
          .filter((c) => c !== undefined)
          .filter((c) => getVisibility(c.id)) ?? []

      // For views, we now do the locked/unlocked separation at the page level
      // where we have better access to the final locked state after enhancement
      // So we just return the columns in view order here
      return viewColumns
    }

    // For panel context: sort by display order and let page level handle locked/unlocked separation
    return contextColumns
      .filter((col) => getVisibility(col.id))
      .sort((a, b) => {
        // Sort by order first to get the drag-drop order
        const orderA = a.properties?.display?.order ?? Number.MAX_SAFE_INTEGER
        const orderB = b.properties?.display?.order ?? Number.MAX_SAFE_INTEGER
        return orderA - orderB
      })
  }, [contextColumns, getVisibility, view])

  // Get all columns for the current context
  const getAllColumns = useCallback((): Column[] => {
    if (effectiveViewType === 'patient') {
      return allColumns.filter((col) => col.tags?.includes('panels:patients'))
    }

    if (effectiveViewType === 'task') {
      return allColumns.filter((col) => col.tags?.includes('panels:tasks'))
    }

    if (effectiveViewType === 'appointment') {
      return allColumns.filter((col) =>
        col.tags?.includes('panels:appointments'),
      )
    }

    return allColumns
  }, [allColumns, effectiveViewType])

  return {
    type: contextType,
    panelId,
    viewId,
    columns: contextColumns,
    getVisibility,
    setVisibility,
    getVisibleColumns,
    getAllColumns,
  }
}
