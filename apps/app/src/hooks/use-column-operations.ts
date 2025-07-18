import { useCallback, useEffect } from 'react'
import { useReactivePanelStore } from './use-reactive-panel-store'
import { useToastHelpers } from '@/contexts/ToastContext'
import type { Column, ColumnChangesResponse } from '@/types/panel'

export function useColumnOperations() {
  const store = useReactivePanelStore()
  const { showProgress, showSuccess, showError, updateToast } =
    useToastHelpers()

  const updateColumn = useCallback(
    async (
      panelId: string,
      columnId: string,
      updates: Partial<Column>,
    ): Promise<void> => {
      const columnName = updates.name || 'Column'
      const progressToastId = showProgress(
        'Updating column...',
        `Saving changes to "${columnName}"`,
      )

      try {
        await store.updateColumn(panelId, columnId, updates)

        updateToast(progressToastId, {
          type: 'success',
          title: 'Column updated',
          message: `Your changes to "${columnName}" have been saved`,
          duration: 3000,
          dismissible: true,
        })
      } catch (error) {
        updateToast(progressToastId, {
          type: 'error',
          title: 'Could not update column',
          message: 'Your changes could not be saved. Please try again.',
          duration: 0,
          dismissible: true,
          onRetry: () => updateColumn(panelId, columnId, updates),
        })

        throw error
      }
    },
    [store, showProgress, updateToast],
  )

  const deleteColumn = useCallback(
    async (
      panelId: string,
      columnId: string,
      columnName?: string,
    ): Promise<void> => {
      const displayName = columnName || 'column'
      const progressToastId = showProgress(
        'Removing column...',
        `Deleting "${displayName}"`,
      )

      try {
        await store.deleteColumn(panelId, columnId)

        updateToast(progressToastId, {
          type: 'success',
          title: 'Column removed',
          message: `"${displayName}" has been removed from the panel and all associated views`,
          duration: 3000,
          dismissible: true,
        })
      } catch (error) {
        updateToast(progressToastId, {
          type: 'error',
          title: 'Could not remove column',
          message: 'The column could not be deleted. Please try again.',
          duration: 0,
          dismissible: true,
          onRetry: () => deleteColumn(panelId, columnId, columnName),
        })

        throw error
      }
    },
    [store, showProgress, updateToast],
  )

  const applyColumnChanges = useCallback(
    async (
      panelId: string,
      columnChanges: ColumnChangesResponse,
      viewId?: string,
    ): Promise<void> => {
      if (!columnChanges.changes || columnChanges.changes.length === 0) {
        return
      }

      try {
        await store.applyColumnChanges(panelId, columnChanges, viewId)

        // Show individual notifications for each change
        columnChanges.changes.forEach((change, index) => {
          const columnName = change.column?.name || 'New Column'

          // Delay each notification slightly to avoid overwhelming the user
          setTimeout(() => {
            switch (change.operation) {
              case 'create':
                showSuccess(
                  'Column added',
                  viewId
                    ? `"${columnName}" has been added to the panel and automatically added to the current view`
                    : `"${columnName}" has been added to the panel`,
                  { duration: 4000 },
                )
                break
              case 'update':
                showSuccess(
                  'Column updated',
                  `"${columnName}" has been modified`,
                  { duration: 3000 },
                )
                break
              case 'delete':
                showSuccess(
                  'Column removed',
                  `"${columnName}" has been removed from the panel and all associated views`,
                  { duration: 4000 },
                )
                break
            }
          }, index * 200) // 200ms delay between each notification
        })
      } catch (error) {
        const changeCount = columnChanges.changes.length
        showError(
          'Could not apply changes',
          changeCount === 1
            ? 'The column change could not be applied. Please try again.'
            : 'Some column changes could not be applied. Please try again.',
          {
            duration: 0,
            onRetry: () => applyColumnChanges(panelId, columnChanges, viewId),
          },
        )

        throw error
      }
    },
    [store, showSuccess, showError],
  )

  const reorderColumns = useCallback(
    async (panelId: string, reorderedColumns: Column[]): Promise<void> => {
      const progressToastId = showProgress(
        'Reordering columns...',
        'Updating column order',
      )

      try {
        // Batch update all columns with their new order
        await Promise.all(
          reorderedColumns.map(async (column, index) => {
            await store.updateColumn(panelId, column.id, {
              ...column,
              properties: {
                ...column.properties,
                display: {
                  ...column.properties?.display,
                  order: index,
                },
              },
            })
          }),
        )

        updateToast(progressToastId, {
          type: 'success',
          title: 'Columns reordered',
          message: 'Column order has been updated',
          duration: 3000,
          dismissible: true,
        })
      } catch (error) {
        updateToast(progressToastId, {
          type: 'error',
          title: 'Could not reorder columns',
          message: 'Column order could not be updated. Please try again.',
          duration: 0,
          dismissible: true,
          onRetry: () => reorderColumns(panelId, reorderedColumns),
        })

        throw error
      }
    },
    [store, showProgress, updateToast],
  )

  return {
    updateColumn,
    applyColumnChanges,
    deleteColumn,
    reorderColumns,
  }
}
