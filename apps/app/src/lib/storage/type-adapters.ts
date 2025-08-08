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
  const frontendPanel = {
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

  return frontendPanel
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
  // Validate that we have the required fields
  if (!backendColumn) {
    throw new Error(
      'mapBackendColumnToFrontend: backendColumn is null or undefined',
    )
  }

  if (backendColumn.id === null || backendColumn.id === undefined) {
    throw new Error(
      `mapBackendColumnToFrontend: backendColumn.id is ${backendColumn.id}. Full column: ${JSON.stringify(backendColumn)}`,
    )
  }

  if (!backendColumn.name) {
    throw new Error(
      `mapBackendColumnToFrontend: backendColumn.name is missing. Full column: ${JSON.stringify(backendColumn)}`,
    )
  }

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
