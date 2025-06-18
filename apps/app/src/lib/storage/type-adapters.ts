import type {
  ColumnDefinition,
  Filter,
  PanelDefinition,
  ViewDefinition,
} from '@/types/worklist'
import type { ColumnsResponse } from '@panels/types/columns'
import type {
  CreatePanelResponse,
  PanelInfo,
  PanelResponse,
  PanelsResponse,
} from '@panels/types/panels'
import type {
  ViewInfo,
  ViewResponse,
  ViewSortsInfoResponse,
} from '@panels/types/views'
import type { ColumnInfoResponse } from '@panels/types/columns'

/**
 * Convert backend panel response to frontend panel definition
 */
export const adaptBackendToFrontend = (
  backendPanel: PanelResponse | CreatePanelResponse,
  columns?: ColumnsResponse,
  views?: ViewResponse[],
): PanelDefinition => {
  // Default columns if not provided
  const defaultPatientColumns: ColumnDefinition[] = [
    {
      id: 'name',
      key: 'name',
      name: 'Patient Name',
      type: 'string',
      description: "Patient's full name",
    },
    {
      id: 'birthDate',
      key: 'birthDate',
      name: 'Date of Birth',
      type: 'date',
      description: "Patient's date of birth",
    },
  ]

  const defaultTaskColumns: ColumnDefinition[] = [
    {
      id: 'taskId',
      key: 'id',
      name: 'Task ID',
      type: 'string',
      description: 'Task ID',
    },
    {
      id: 'description',
      key: 'description',
      name: 'Description',
      type: 'string',
      description: 'Task description',
    },
  ]

  // TODO: TEMPORARY DISABLED BUT THE COHORT RULE PERMITS TO ADD FILTERS LATER AND MANAGE THEM IN THE UI
  // Convert cohort rule to filters
  // const filters: Filter[] = backendPanel.cohortRule.conditions.map(
  //   (condition) => ({
  //     fhirPathFilter: [condition.field, condition.value?.toString() || ''],
  //   }),
  // )

  // Convert backend columns to frontend columns if provided
  const patientViewColumns =
    columns?.baseColumns
      .filter((column) => column.tags?.includes('panels:patients'))
      .sort((a, b) => {
        const orderA = a.properties?.display?.order ?? Number.MAX_SAFE_INTEGER
        const orderB = b.properties?.display?.order ?? Number.MAX_SAFE_INTEGER
        return orderA - orderB
      })
      .map(adaptBackendColumnToFrontend) || defaultPatientColumns
  const taskViewColumns =
    columns?.baseColumns
      .filter((column) => column.tags?.includes('panels:tasks'))
      .sort((a, b) => {
        const orderA = a.properties?.display?.order ?? Number.MAX_SAFE_INTEGER
        const orderB = b.properties?.display?.order ?? Number.MAX_SAFE_INTEGER
        return orderA - orderB
      })
      .map(adaptBackendColumnToFrontend) || defaultTaskColumns

  // Convert backend views to frontend views if provided
  const frontendViews: ViewDefinition[] =
    views?.map((vw) =>
      adaptBackendViewToFrontend(
        vw,
        columns?.baseColumns || [],
        columns?.calculatedColumns || [],
      ),
    ) || []

  const filters = backendPanel.metadata?.filters || []

  return {
    id: backendPanel.id.toString(),
    title: backendPanel.name,
    createdAt: new Date(backendPanel.createdAt), // Keep as Date object
    filters,
    patientViewColumns,
    taskViewColumns,
    views: frontendViews,
  }
}

/**
 * Convert frontend panel definition to backend panel info for creation/updates
 */
export const adaptFrontendToBackend = (
  frontendPanel: PanelDefinition | Omit<PanelDefinition, 'id'>,
  config: { tenantId: string; userId: string },
): PanelInfo => {
  return {
    name: frontendPanel.title,
    description: `Panel created: ${frontendPanel.createdAt instanceof Date ? frontendPanel.createdAt.toISOString() : frontendPanel.createdAt}`,
    tenantId: config.tenantId,
    userId: config.userId,
    metadata: {
      filters: frontendPanel.filters,
    },
  }
}

/**
 * Convert backend column to frontend column definition
 */
export const adaptBackendColumnToFrontend = (
  backendColumn: ColumnInfoResponse,
): ColumnDefinition => {
  // Map backend column types to frontend types
  const typeMapping: Record<string, ColumnDefinition['type']> = {
    text: 'string',
    number: 'number',
    date: 'date',
    boolean: 'boolean',
    select: 'select',
    multi_select: 'array',
    user: 'assignee',
    file: 'string',
    custom: 'string',
  }

  // Handle different column types - base columns have sourceField, calculated columns have formula
  const key =
    'sourceField' in backendColumn &&
    typeof backendColumn.sourceField === 'string'
      ? backendColumn.sourceField
      : backendColumn.name

  return {
    id: backendColumn.id.toString(),
    key,
    name: backendColumn.name,
    type: typeMapping[backendColumn.type] || 'string',
    description: backendColumn.metadata?.description || '',
    properties: {
      display: backendColumn.properties?.display,
    },
  }
}

/**
 * Convert backend view to frontend view definition
 */
export const adaptBackendViewToFrontend = (
  backendView: ViewResponse,
  backendColumns: ColumnInfoResponse[],
  backendCalculatedColumns: ColumnInfoResponse[],
  sortConfig?: ViewSortsInfoResponse,
): ViewDefinition => {
  // Convert backend column IDs to frontend column definitions
  const columns = backendView.config.columns
    .map((columnId) => {
      return backendColumns.find((column) => column.id.toString() === columnId)
    })
    .filter((column) => column !== undefined)
    .map(adaptBackendColumnToFrontend)

  const frontendSortConfig = sortConfig?.sorts
    .map((sort) => {
      const column = columns.find((column) => column.key === sort.columnName)
      if (!column) {
        return undefined
      }
      return {
        key: column.key,
        direction: sort.direction,
      }
    })
    .filter((sort) => sort !== undefined)

  // Extract view type and filters from metadata
  const metadata = backendView.metadata || {}
  const viewType = (metadata.viewType as 'task' | 'patient') || 'patient'
  const filters = metadata.filters || []

  const frontendView: ViewDefinition = {
    ...backendView,
    id: backendView.id.toString(),
    columns,
    title: backendView.name,
    filters,
    createdAt: new Date(), //TODO: get the actual createdAt from the backend
    viewType,
    sortConfig: frontendSortConfig,
  }

  return frontendView
}

/**
 * Convert frontend view to backend view info
 */
export const adaptFrontendViewToBackend = (
  frontendView: ViewDefinition | Omit<ViewDefinition, 'id'>,
  panelId: string,
  config: { tenantId: string; userId: string },
): ViewInfo => {
  return {
    name: frontendView.title,
    description: `View created: ${frontendView.createdAt instanceof Date ? frontendView.createdAt.toISOString() : frontendView.createdAt}`,
    panelId: Number.parseInt(panelId, 10), // Convert to number for backend
    config: {
      columns: frontendView.columns.map((col) => col.id),
      layout: 'table',
    },
    metadata: {
      viewType: frontendView.viewType,
      filters: frontendView.filters,
    },
    tenantId: config.tenantId,
    userId: config.userId,
  }
}

/**
 * Batch convert multiple backend panels to frontend format
 */
export const adaptBackendPanelsToFrontend = (
  backendPanels: PanelsResponse,
): PanelDefinition[] => {
  return backendPanels.map((panel) => adaptBackendToFrontend(panel)) || []
}

/**
 * Validate that we have the required configuration for API calls
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

