import type { Column, Panel, View, ViewType } from '@/types/panel'
import type { StorageAdapter } from './types'
import type { ColumnsResponse } from '@panels/types/columns'
import type { ViewsResponse } from '@panels/types/views'
import {
  mapBackendPanelToFrontend,
  mapFrontendPanelToBackend,
  mapBackendColumnToFrontend,
  validateApiConfig,
  mapBackendViewToFrontend,
} from './type-adapters'
import { logger } from '../logger'

/**
 * Simplified API Storage Adapter - Direct backend integration without complex logic
 */
export class APIStorageAdapter implements StorageAdapter {
  private config: { tenantId: string; userId: string }

  constructor(userId?: string, organizationSlug?: string) {
    this.config = {
      tenantId: organizationSlug || '',
      userId: userId || '',
    }
    validateApiConfig(this.config)
  }

  async getPanels(): Promise<Panel[]> {
    try {
      const { panelsAPI } = await import('@/api/panelsAPI')
      const backendPanels = await panelsAPI.all(
        this.config.tenantId,
        this.config.userId,
      )

      // Simple mapping without complex enrichment
      return backendPanels.map((panel) => mapBackendPanelToFrontend(panel))
    } catch (error) {
      logger.error({ error }, 'Failed to fetch panels from API')
      throw new Error(
        `Failed to load panels: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async getPanel(id: string): Promise<Panel | null> {
    try {
      const { panelsAPI } = await import('@/api/panelsAPI')

      // Single API call for panel data
      const backendPanel = await panelsAPI.get(
        { id },
        this.config.tenantId,
        this.config.userId,
      )

      return mapBackendPanelToFrontend(backendPanel)
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      logger.error({ error, id }, `Failed to fetch panel ${id} from API`)
      throw new Error(
        `Failed to load panel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async createPanel(panel: Omit<Panel, 'id'>): Promise<Panel> {
    try {
      // Validate that we have the required config values
      if (!this.config.tenantId || !this.config.userId) {
        throw new Error(
          `Invalid configuration: tenantId (${this.config.tenantId}) and userId (${this.config.userId}) are required`,
        )
      }

      const { panelsAPI } = await import('@/api/panelsAPI')

      // Simple panel creation - no column creation
      const backendPanelInfo = mapFrontendPanelToBackend(panel, this.config)
      const createdPanel = await panelsAPI.create(backendPanelInfo)

      // Create a basic data source
      await panelsAPI.dataSources.create(
        { id: createdPanel.id.toString() },
        {
          type: 'api',
          config: {
            endpoint: '/api/patients',
            method: 'GET',
          },
          tenantId: this.config.tenantId,
          userId: this.config.userId,
        },
      )

      return mapBackendPanelToFrontend(createdPanel)
    } catch (error) {
      logger.error(
        { error, config: this.config },
        'Failed to create panel via API',
      )
      throw new Error(
        `Failed to create panel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async updatePanel(id: string, updates: Partial<Panel>): Promise<Panel> {
    try {
      // Validate that we have the required config values
      if (!this.config.tenantId || !this.config.userId) {
        throw new Error(
          `Invalid configuration: tenantId (${this.config.tenantId}) and userId (${this.config.userId}) are required`,
        )
      }

      const { panelsAPI } = await import('@/api/panelsAPI')

      // Build the panel info with only the fields that are being updated
      // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
      const backendPanelInfo: any = {
        id: id,
        tenantId: this.config.tenantId,
        userId: this.config.userId,
      }

      // Only include fields that are actually being updated
      if (updates.name !== undefined) {
        backendPanelInfo.name = updates.name
      }
      if (updates.description !== undefined) {
        backendPanelInfo.description = updates.description
      }
      if (updates.metadata !== undefined) {
        backendPanelInfo.metadata = updates.metadata
      }

      const updatedPanel = await panelsAPI.update(backendPanelInfo)

      const frontendPanel = mapBackendPanelToFrontend(updatedPanel)

      return frontendPanel
    } catch (error) {
      logger.error(
        { error, id, config: this.config },
        `Failed to update panel ${id} via API`,
      )
      throw new Error(
        `Failed to update panel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async deletePanel(id: string): Promise<void> {
    try {
      // Validate that we have the required config values
      if (!this.config.tenantId || !this.config.userId) {
        throw new Error(
          `Invalid configuration: tenantId (${this.config.tenantId}) and userId (${this.config.userId}) are required`,
        )
      }

      const { panelsAPI } = await import('@/api/panelsAPI')
      await panelsAPI.delete(this.config.tenantId, this.config.userId, { id })
    } catch (error) {
      logger.error(
        { error, id, config: this.config },
        `Failed to delete panel ${id} via API`,
      )
      throw new Error(
        `Failed to delete panel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  // Get all views across all panels
  async getViews(): Promise<View[]> {
    try {
      const { viewsAPI } = await import('@/api/viewsAPI')

      const viewsResponse = await viewsAPI.all(
        this.config.tenantId,
        this.config.userId,
      )

      return viewsResponse.views.map((view: ViewsResponse['views'][number]) =>
        mapBackendViewToFrontend(view, view.panelId.toString()),
      )
    } catch (error) {
      logger.error({ error }, 'Failed to fetch all views from API')
      throw new Error(
        `Failed to load views: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  // Get all columns across all panels
  async getColumns(): Promise<Column[]> {
    try {
      const { panelsAPI } = await import('@/api/panelsAPI')

      // Get all panels to fetch their columns
      const panels = await this.getPanels()
      const allColumns: Column[] = []

      // Fetch columns for each panel in parallel
      const columnPromises = panels.map(async (panel) => {
        try {
          const columnsResponse = await panelsAPI.columns.list(
            { id: panel.id },
            this.config.tenantId,
            this.config.userId,
          )

          const panelColumns = [
            ...columnsResponse.baseColumns,
            ...columnsResponse.calculatedColumns,
          ]

          return panelColumns.map(
            (
              column:
                | ColumnsResponse['baseColumns'][number]
                | ColumnsResponse['calculatedColumns'][number],
            ) => mapBackendColumnToFrontend(column, panel.id),
          )
        } catch (error) {
          logger.error(
            { error, panelId: panel.id },
            `Failed to fetch columns for panel ${panel.id}`,
          )
          return []
        }
      })

      const columnArrays = await Promise.all(columnPromises)
      for (const columns of columnArrays) {
        allColumns.push(...columns)
      }

      return allColumns
    } catch (error) {
      logger.error({ error }, 'Failed to fetch all columns from API')
      throw new Error(
        `Failed to load columns: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  // Direct column operations
  async addColumn(
    panelId: string,
    column: Omit<Column, 'id'>,
  ): Promise<Column> {
    try {
      const { panelsAPI } = await import('@/api/panelsAPI')

      // Get data source for the panel
      const dataSources = await panelsAPI.dataSources.list(
        { id: panelId },
        this.config.tenantId,
        this.config.userId,
      )
      const dataSourceId = dataSources[0]?.id || 1

      // Direct API call to create column
      const createdColumn = await panelsAPI.columns.createBase(
        { id: panelId },
        {
          name: column.name,
          type: column.type,
          sourceField: column.sourceField || column.name,
          dataSourceId,
          metadata: column.metadata || {},
          properties: column.properties || { display: {} },
          tags: column.tags || [],
          tenantId: this.config.tenantId,
          userId: this.config.userId,
        },
      )

      return mapBackendColumnToFrontend(createdColumn, panelId)
    } catch (error) {
      logger.error(
        { error, panelId },
        `Failed to add column to panel ${panelId}`,
      )
      throw new Error(
        `Failed to add column: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async updateColumn(
    panelId: string,
    columnId: string,
    updates: Partial<Column>,
  ): Promise<Column> {
    try {
      // Validate that we have the required config values
      if (!this.config.tenantId || !this.config.userId) {
        throw new Error(
          `Invalid configuration: tenantId (${this.config.tenantId}) and userId (${this.config.userId}) are required`,
        )
      }

      // Validate that we have required parameters
      if (!panelId || typeof panelId !== 'string') {
        throw new Error(
          `Invalid panelId: expected non-empty string, got ${typeof panelId} (${panelId})`,
        )
      }

      if (!columnId || typeof columnId !== 'string') {
        throw new Error(
          `Invalid columnId: expected non-empty string, got ${typeof columnId} (${columnId})`,
        )
      }

      // Log what we're about to send for debugging
      logger.debug(
        {
          panelId,
          columnId,
          updates,
          config: this.config,
        },
        'About to update column',
      )

      const { panelsAPI } = await import('@/api/panelsAPI')

      // Only include defined properties to avoid sending undefined values
      // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
      const updatePayload: any = {
        id: columnId,
        tenantId: this.config.tenantId,
        userId: this.config.userId,
      }

      // Only add properties that are actually defined in the updates
      if (updates.name !== undefined) updatePayload.name = updates.name
      if (updates.type !== undefined) updatePayload.type = updates.type
      if (updates.sourceField !== undefined)
        updatePayload.sourceField = updates.sourceField
      if (updates.properties !== undefined) {
        // Validate and sanitize properties before sending
        const sanitizedProperties = { ...updates.properties }

        // Ensure display.order is valid if present
        if (sanitizedProperties.display?.order !== undefined) {
          const order = sanitizedProperties.display.order
          if (typeof order !== 'number' || order < 0) {
            logger.warn(
              { originalOrder: order, columnId, panelId },
              'Invalid display.order value, setting to 0',
            )
            sanitizedProperties.display.order = 0
          }
        }

        updatePayload.properties = sanitizedProperties
      }
      if (updates.metadata !== undefined)
        updatePayload.metadata = updates.metadata
      if (updates.tags !== undefined) updatePayload.tags = updates.tags

      logger.debug(
        { updatePayload, panelIdParam: { id: panelId } },
        'API call parameters',
      )

      const updatedColumn = await panelsAPI.columns.update(updatePayload, {
        id: panelId,
      })

      logger.debug({ updatedColumn }, 'API response received')

      return mapBackendColumnToFrontend(updatedColumn, panelId)
    } catch (error) {
      logger.error(
        {
          error,
          columnId,
          panelId,
          updates,
          config: this.config,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        `Failed to update column ${columnId} in panel ${panelId}`,
      )
      throw new Error(
        `Failed to update column: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async deleteColumn(panelId: string, columnId: string): Promise<void> {
    try {
      const { panelsAPI } = await import('@/api/panelsAPI')

      // Direct API call to delete column
      await panelsAPI.columns.delete(
        {
          id: columnId,
          tenantId: this.config.tenantId,
          userId: this.config.userId,
        },
        { id: panelId },
      )
    } catch (error) {
      logger.error(
        { error, columnId, panelId },
        `Failed to delete column ${columnId} in panel ${panelId}`,
      )
      throw new Error(
        `Failed to delete column: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async getColumnsForPanel(panelId: string): Promise<Column[]> {
    try {
      const { panelsAPI } = await import('@/api/panelsAPI')

      // Fetch columns for the specified panel
      const columnsResponse = await panelsAPI.columns.list(
        { id: panelId },
        this.config.tenantId,
        this.config.userId,
      )

      // Combine base and calculated columns and map to frontend format
      const allColumns = [
        ...columnsResponse.baseColumns,
        ...columnsResponse.calculatedColumns,
      ]

      return allColumns.map(
        (
          column:
            | ColumnsResponse['baseColumns'][number]
            | ColumnsResponse['calculatedColumns'][number],
        ) => mapBackendColumnToFrontend(column, panelId),
      )
    } catch (error) {
      logger.error(
        { error, panelId },
        `Failed to fetch columns for panel ${panelId}`,
      )
      throw new Error(
        `Failed to fetch columns: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  // Simplified view operations
  async addView(panelId: string, view: Omit<View, 'id'>): Promise<View> {
    try {
      const { viewsAPI } = await import('@/api/viewsAPI')

      const createdView = await viewsAPI.create({
        name: view.name,
        panelId: Number.parseInt(panelId, 10),
        visibleColumns: view.visibleColumns,
        metadata: view.metadata,
      })

      return mapBackendViewToFrontend(createdView, panelId)
    } catch (error) {
      logger.error({ error, panelId }, `Failed to add view to panel ${panelId}`)
      throw new Error(
        `Failed to add view: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async updateView(
    panelId: string,
    viewId: string,
    updates: Partial<View>,
  ): Promise<View> {
    try {
      const { viewsAPI } = await import('@/api/viewsAPI')

      const updatedView = await viewsAPI.update({
        id: viewId,
        name: updates.name,
        visibleColumns: updates.visibleColumns,
        metadata: updates.metadata,
      })

      return mapBackendViewToFrontend(updatedView, panelId)
    } catch (error) {
      logger.error(
        { error, viewId, panelId },
        `Failed to update view ${viewId} in panel ${panelId}`,
      )
      throw new Error(
        `Failed to update view: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async deleteView(panelId: string, viewId: string): Promise<void> {
    try {
      // Validate that we have the required config values
      if (!this.config.tenantId || !this.config.userId) {
        throw new Error(
          `Invalid configuration: tenantId (${this.config.tenantId}) and userId (${this.config.userId}) are required`,
        )
      }

      const { viewsAPI } = await import('@/api/viewsAPI')
      await viewsAPI.delete(this.config.tenantId, this.config.userId, {
        id: viewId,
      })
    } catch (error) {
      logger.error(
        { error, viewId, panelId, config: this.config },
        `Failed to delete view ${viewId} in panel ${panelId}`,
      )
      throw new Error(
        `Failed to delete view: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async getView(panelId: string, viewId: string): Promise<View | null> {
    try {
      const { viewsAPI } = await import('@/api/viewsAPI')
      const backendView = await viewsAPI.get(
        this.config.tenantId,
        this.config.userId,
        { id: viewId },
      )

      return mapBackendViewToFrontend(backendView, panelId)
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      logger.error(
        { error, viewId, panelId },
        `Failed to fetch view ${viewId} from panel ${panelId}`,
      )
      throw new Error(
        `Failed to fetch view: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async getViewsForPanel(panelId: string): Promise<View[]> {
    try {
      const { viewsAPI } = await import('@/api/viewsAPI')

      // Get all views and filter by panelId since there's no direct list method by panel
      const viewsResponse = await viewsAPI.all(
        this.config.tenantId,
        this.config.userId,
      )

      // Filter views for the specified panel and map to frontend format
      const panelViews = viewsResponse.views.filter(
        (view: ViewsResponse['views'][number]) =>
          view.panelId === Number.parseInt(panelId, 10),
      )

      return panelViews.map((view: ViewsResponse['views'][number]) =>
        mapBackendViewToFrontend(view, panelId),
      )
    } catch (error) {
      logger.error(
        { error, panelId },
        `Failed to fetch views for panel ${panelId}`,
      )
      throw new Error(
        `Failed to fetch views: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  isLoading(): boolean {
    return false
  }
}
