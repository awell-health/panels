import type { Column, Panel, View, ViewType } from '@/types/panel'
import type { StorageAdapter } from './types'
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

      // Load columns if needed
      const columns = await panelsAPI.columns.list(
        { id },
        this.config.tenantId,
        this.config.userId,
      )

      return mapBackendPanelToFrontend(backendPanel, columns)
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

      return mapBackendColumnToFrontend(createdColumn)
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
          properties: updates.properties,
          metadata: updates.metadata,
          tags: updates.tags,
          tenantId: this.config.tenantId,
          userId: this.config.userId,
        },
        { id: panelId },
      )

      return mapBackendColumnToFrontend(updatedColumn)
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

  // Simplified view operations
  async addView(panelId: string, view: Omit<View, 'id'>): Promise<View> {
    try {
      const { viewsAPI } = await import('@/api/viewsAPI')

      const createdView = await viewsAPI.create({
        name: view.name,
        panelId: Number.parseInt(panelId, 10),
        config: {
          columns: view.visibleColumns,
          layout: 'table',
        },
        metadata: view.metadata,
        tenantId: this.config.tenantId,
        userId: this.config.userId,
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
        panelId: Number.parseInt(panelId, 10),
        name: updates.name || '',
        config: {
          columns: updates.visibleColumns || [],
          layout: 'table',
        },
        metadata: updates.metadata || {},
        tenantId: this.config.tenantId,
        userId: this.config.userId,
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

  isLoading(): boolean {
    return false
  }
}
