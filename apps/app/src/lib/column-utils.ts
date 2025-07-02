import type {
  ColumnDefinition,
  WorklistDefinition,
  ViewDefinition,
  ColumnChange,
} from '@/types/worklist'

export const applyColumnChangesToPanel = (
  panel: WorklistDefinition,
  changes: ColumnChange[],
): WorklistDefinition => {
  const updatedPanel = { ...panel }

  for (const change of changes) {
    const targetColumns =
      change.viewType === 'patient'
        ? [...(updatedPanel.patientViewColumns || [])]
        : [...(updatedPanel.taskViewColumns || [])]

    switch (change.operation) {
      case 'create': {
        if (change.column) {
          targetColumns.push(change.column as ColumnDefinition)
        }
        break
      }

      case 'update': {
        const updateIndex = targetColumns.findIndex(
          (col) => col.id === change.id,
        )
        if (updateIndex !== -1 && change.column) {
          targetColumns[updateIndex] = {
            ...targetColumns[updateIndex],
            ...change.column,
          }
        }
        break
      }

      case 'delete': {
        const deleteIndex = targetColumns.findIndex(
          (col) => col.id === change.id,
        )
        if (deleteIndex !== -1) {
          targetColumns.splice(deleteIndex, 1)
        }
        break
      }
    }

    if (change.viewType === 'patient') {
      updatedPanel.patientViewColumns = targetColumns
    } else {
      updatedPanel.taskViewColumns = targetColumns
    }
  }

  return updatedPanel
}

export const applyColumnChangesToView = (
  view: ViewDefinition,
  panel: WorklistDefinition,
  changes: ColumnChange[],
): ViewDefinition => {
  // Get current columns (from view.columns or fallback to panel)
  const currentColumns =
    view.columns && view.columns.length > 0
      ? [...view.columns]
      : view.viewType === 'patient'
        ? [...(panel.patientViewColumns || [])]
        : [...(panel.taskViewColumns || [])]

  let updatedColumns = [...currentColumns]

  for (const change of changes) {
    // Only apply changes that match the view's type
    if (change.viewType !== view.viewType) continue

    switch (change.operation) {
      case 'create': {
        if (change.column) {
          updatedColumns.push(change.column as ColumnDefinition)
        }
        break
      }

      case 'update': {
        const updateIndex = updatedColumns.findIndex(
          (col) => col.id === change.id,
        )
        if (updateIndex !== -1 && change.column) {
          updatedColumns[updateIndex] = {
            ...updatedColumns[updateIndex],
            ...change.column,
          }
        }
        break
      }

      case 'delete': {
        updatedColumns = updatedColumns.filter((col) => col.id !== change.id)
        break
      }
    }
  }

  return {
    ...view,
    columns: updatedColumns,
  }
}
