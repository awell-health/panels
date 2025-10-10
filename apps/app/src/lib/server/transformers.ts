import type { Panel, View, Column } from '@/types/panel'
import type { PanelResponse, CreatePanelResponse } from '@panels/types/panels'
import type { ColumnInfoResponse, ColumnsResponse } from '@panels/types/columns'
import type { View as ViewBackend, ViewsResponse } from '@panels/types/views'

/**
 * Transform backend panel to frontend panel format
 */
export function transformBackendPanelToFrontend(
  backendPanel: PanelResponse | CreatePanelResponse,
): Panel {
  return {
    id: backendPanel.id.toString(),
    name: backendPanel.name,
    description: backendPanel.description ?? undefined,
    createdAt: new Date(backendPanel.createdAt),
    metadata: {
      // Preserve ALL metadata fields from backend
      ...backendPanel.metadata,
      // Ensure required fields have defaults
      filters: backendPanel.metadata?.filters || [],
      sort: backendPanel.metadata?.sort || undefined,
      viewType: backendPanel.metadata?.viewType || 'patient',
    },
  }
}

/**
 * Transform backend column to frontend column format
 */
export function transformBackendColumnToFrontend(
  backendColumn: ColumnInfoResponse,
  panelId: string,
): Column {
  return {
    id: backendColumn.id.toString(),
    panelId: panelId,
    name: backendColumn.name,
    type: backendColumn.type,
    sourceField: backendColumn.sourceField,
    tags: backendColumn.tags,
    properties: {
      display: {
        width: backendColumn.properties?.display?.width ?? 150,
        visible: backendColumn.properties?.display?.visible ?? true,
        order: backendColumn.properties?.display?.order ?? 0,
        locked: backendColumn.properties?.display?.locked ?? false,
        format: backendColumn.properties?.display?.format,
      },
    },
    metadata: backendColumn.metadata || {},
  }
}

/**
 * Transform backend view to frontend view format
 */
export function transformBackendViewToFrontend(
  backendView: ViewBackend,
  panelId: string,
): View {
  return {
    id: backendView.id.toString(),
    panelId: panelId,
    name: backendView.name,
    visibleColumns: backendView.visibleColumns,
    createdAt: new Date(backendView.createdAt),
    isPublished: backendView.isPublished,
    metadata: {
      filters: [], // Backend view doesn't have filters field
      viewType: 'patient' as const, // Default view type
      sort:
        backendView.sort.length > 0
          ? {
              columnId: backendView.sort[0].columnName,
              direction: backendView.sort[0].direction,
            }
          : undefined,
      columnVisibility: {}, // Will be populated based on visibleColumns
      columnLocked: {}, // Default empty
      ...backendView.metadata,
      publishedAt: backendView.publishedAt,
    },
  }
}

/**
 * Transform array of backend columns to frontend columns
 */
export function transformBackendColumnsToFrontend(
  backendColumns: ColumnsResponse,
  panelId: string,
): Column[] {
  // Combine base and calculated columns
  const allColumns = [
    ...backendColumns.baseColumns,
    ...backendColumns.calculatedColumns,
  ]

  return allColumns.map((col) => transformBackendColumnToFrontend(col, panelId))
}

/**
 * Transform array of backend views to frontend views
 */
export function transformBackendViewsToFrontend(
  backendViews: ViewsResponse,
  panelId: string,
): View[] {
  return backendViews.views.map((view) =>
    transformBackendViewToFrontend(view, panelId),
  )
}
