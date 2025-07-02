import type {
  ColumnDefinition,
  WorklistDefinition,
  ViewDefinition,
  ColumnChange,
} from '@/types/worklist'
import type { Panel, Column, View } from '@/types/panel'

export const applyColumnChangesToPanel = (
  panel: Panel,
  changes: any[],
): Panel => {
  console.warn(
    'applyColumnChangesToPanel: This function needs to be updated to work with the new reactive storage system',
  )
  console.log('Panel:', panel, 'Changes:', changes)

  // Return unchanged panel for now
  return panel
}

export const applyColumnChangesToView = (
  view: View,
  panel: Panel,
  changes: any[],
): View => {
  console.warn(
    'applyColumnChangesToView: This function needs to be updated to work with the new reactive storage system',
  )
  console.log('View:', view, 'Panel:', panel, 'Changes:', changes)

  // Return unchanged view for now
  return view
}

// Helper function to filter columns by tags
export const getPatientColumns = (columns: Column[]): Column[] => {
  return columns.filter((col) => col.tags?.includes('panels:patients'))
}

export const getTaskColumns = (columns: Column[]): Column[] => {
  return columns.filter((col) => col.tags?.includes('panels:tasks'))
}

// Helper function to get columns for a specific view type
export const getColumnsForViewType = (
  columns: Column[],
  viewType: 'patient' | 'task',
): Column[] => {
  return viewType === 'patient'
    ? getPatientColumns(columns)
    : getTaskColumns(columns)
}
