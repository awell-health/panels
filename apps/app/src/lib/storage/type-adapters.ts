import type { Column, Panel, View } from '@/types/panel'
import type {
  ColumnBaseCreateResponse,
  ColumnInfoResponse,
  ColumnsResponse,
} from '@panels/types/columns'
import type {
  CreatePanelResponse,
  PanelInfo,
  PanelResponse,
} from '@panels/types/panels'
import type { View as ViewBackend } from '@panels/types/views'

/**
 * Simple direct mapping from backend to frontend panel
 */
export const mapBackendPanelToFrontend = (
  backendPanel: PanelResponse | CreatePanelResponse,
): Panel => {
  return {
    id: backendPanel.id.toString(),
    name: backendPanel.name,
    description: backendPanel.description ?? undefined,
    createdAt: new Date(backendPanel.createdAt),
    metadata: {
      filters: backendPanel.metadata?.filters || [],
    },
  }
}

export const mapBackendViewToFrontend = (
  backendView: ViewBackend,
  panelId: string,
): View => {
  return {
    id: backendView.id.toString(),
    name: backendView.name,
    panelId,
    visibleColumns: backendView.visibleColumns || [],
    createdAt: new Date(),
    isPublished: backendView.isPublished,
    metadata: backendView.metadata as View['metadata'],
    sort: backendView.sort,
  }
}

/**
 * Simple frontend to backend mapping for panel creation/updates
 */
export const mapFrontendPanelToBackend = (
  frontendPanel: Panel | Omit<Panel, 'id'>,
  config: { tenantId: string; userId: string },
): PanelInfo => {
  return {
    name: frontendPanel.name,
    description: frontendPanel.description || '',
    tenantId: config.tenantId,
    userId: config.userId,
    metadata: frontendPanel.metadata || {},
  }
}

/**
 * Simple column mapping from backend to frontend
 */
export const mapBackendColumnToFrontend = (
  backendColumn:
    | ColumnBaseCreateResponse
    | ColumnsResponse['baseColumns'][number]
    | ColumnInfoResponse,
  panelId: string,
): Column => {
  return {
    id: backendColumn.id.toString(),
    panelId,
    name: backendColumn.name,
    type: backendColumn.type,
    sourceField: backendColumn.sourceField,
    tags: backendColumn.tags,
    properties: {
      display: backendColumn.properties?.display,
    },
    metadata: {
      description: backendColumn.metadata?.description || undefined,
    },
  }
}

/**
 * Validate API configuration
 */
export const validateApiConfig = (config: {
  tenantId?: string
  userId?: string
}) => {
  if (!config.tenantId || !config.userId) {
    throw new Error(
      'Missing required API configuration: tenantId and userId must be provided',
    )
  }
}
