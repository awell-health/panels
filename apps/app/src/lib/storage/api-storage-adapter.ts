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
      logger.error({ error }, 'Failed to create panel via API')
      throw new Error(
        `Failed to create panel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async updatePanel(id: string, updates: Partial<Panel>): Promise<Panel> {
    try {
      const { panelsAPI } = await import('@/api/panelsAPI')

      // Simple panel update - no column synchronization
      const backendPanelInfo = {
        ...mapFrontendPanelToBackend(updates as Panel, this.config),
        id: id,
      }

      const updatedPanel = await panelsAPI.update(backendPanelInfo)
      return mapBackendPanelToFrontend(updatedPanel)
    } catch (error) {
      logger.error({ error, id }, `Failed to update panel ${id} via API`)
      throw new Error(
        `Failed to update panel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async deletePanel(id: string): Promise<void> {
    try {
      const { panelsAPI } = await import('@/api/panelsAPI')
      await panelsAPI.delete(this.config.tenantId, this.config.userId, { id })
    } catch (error) {
      logger.error({ error, id }, `Failed to delete panel ${id} via API`)
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
      const { panelsAPI } = await import('@/api/panelsAPI')

      // Direct API call without complex logic
      const updatedColumn = await panelsAPI.columns.update(
        {
          id: columnId,
          name: updates.name,
          type: updates.type,
          sourceField: updates.sourceField,
          properties: updates.properties,
          metadata: updates.metadata,
          tags: updates.tags,
          tenantId: this.config.tenantId,
          userId: this.config.userId,
        },
        { id: panelId },
      )

      return mapBackendColumnToFrontend(updatedColumn, panelId)
    } catch (error) {
      logger.error(
        { error, columnId, panelId },
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
        tenantId: this.config.tenantId,
        ownerUserId: this.config.userId,
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
        tenantId: this.config.tenantId,
        ownerUserId: this.config.userId,
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
      const { viewsAPI } = await import('@/api/viewsAPI')
      await viewsAPI.delete(this.config.tenantId, this.config.userId, {
        id: viewId,
      })
    } catch (error) {
      logger.error(
        { error, viewId, panelId },
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
