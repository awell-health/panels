'use server'

import type { Panel, View, Column } from '@/types/panel'
import type { ACL } from '@panels/types/acls'
// Dynamic imports used to avoid naming conflicts
import { unstable_cache } from 'next/cache'
import {
  transformBackendPanelToFrontend,
  transformBackendColumnsToFrontend,
  transformBackendViewsToFrontend,
  transformBackendViewToFrontend,
} from './transformers'

const CACHE_TIME = process.env.NODE_ENV === 'development' ? 1 : 300 // 5 minutes

/**
 * Server-side reactive store for panels, views, and columns
 * This provides server-side data fetching with caching capabilities
 * without the complexity of Zustand or client-side reactivity
 */
class ServerReactiveStore {
  private static instance: ServerReactiveStore | null = null
  private authToken: string | null = null

  static async getInstance(): Promise<ServerReactiveStore> {
    if (!ServerReactiveStore.instance) {
      ServerReactiveStore.instance = new ServerReactiveStore()
    }
    return ServerReactiveStore.instance
  }

  /**
   * Get panel with caching
   */
  async getPanel(panelId: string): Promise<Panel | null> {
    try {
      // Import the panel API client function to avoid naming conflict
      const { getPanel: getPanelAPI } = await import('./panel-api-client')
      const backendPanel = await getPanelAPI({ id: panelId })
      return transformBackendPanelToFrontend(backendPanel)
    } catch (error) {
      console.error('Failed to fetch panel server-side:', error)
      return null
    }
  }

  /**
   * Get columns for a panel with caching
   */
  async getColumns(panelId: string): Promise<Column[]> {
    try {
      const { getColumns: getColumnsAPI } = await import('./panel-api-client')
      const columnsResponse = await getColumnsAPI({ id: panelId })
      return transformBackendColumnsToFrontend(columnsResponse, panelId)
    } catch (error) {
      console.error('Failed to fetch columns server-side:', error)
      return []
    }
  }

  /**
   * Get views for a panel
   */
  async getViews(panelId: string): Promise<View[]> {
    try {
      const { getViews: getViewsAPI } = await import('./panel-api-client')
      const viewsResponse = await getViewsAPI(panelId)
      return transformBackendViewsToFrontend(viewsResponse, panelId)
    } catch (error) {
      console.error('Failed to fetch views server-side:', error)

      // If it's a 404, the panel might not have views - this is okay
      if (error instanceof Error && error.message.includes('404')) {
        return []
      }

      return []
    }
  }

  /**
   * Get a single view by ID
   */
  async getView(panelId: string, viewId: string): Promise<View | null> {
    try {
      const { getView: getViewAPI } = await import('./panel-api-client')
      const viewResponse = await getViewAPI(viewId)
      return transformBackendViewToFrontend(viewResponse, panelId)
    } catch (error) {
      console.error('Failed to fetch view server-side:', error)
      return null
    }
  }

  /**
   * Get all panel-related data in one call
   */
  async getPanelWithRelatedData(panelId: string): Promise<{
    panel: Panel | null
    columns: Column[]
    views: View[]
  }> {
    try {
      const [panel, columns, views] = await Promise.all([
        this.getPanel(panelId),
        this.getColumns(panelId),
        this.getViews(panelId),
      ])

      return {
        panel,
        columns,
        views,
      }
    } catch (error) {
      console.error('Failed to fetch panel with related data:', error)
      return {
        panel: null,
        columns: [],
        views: [],
      }
    }
  }
}
/**
 * Server-side store instance getter
 */
export async function getServerReactiveStore(): Promise<ServerReactiveStore> {
  return await ServerReactiveStore.getInstance()
}
