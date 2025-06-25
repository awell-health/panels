import type {
  PanelDefinition,
  ViewDefinition,
  ColumnDefinition,
} from '@/types/worklist'

/**
 * Storage abstraction interface that provides a unified API
 * for both localStorage and backend API storage implementations
 */
export interface StorageAdapter {
  // Panel operations
  getPanels(): Promise<PanelDefinition[]>
  getPanel(id: string): Promise<PanelDefinition | null>
  createPanel(panel: Omit<PanelDefinition, 'id'>): Promise<PanelDefinition>
  updatePanel(id: string, updates: Partial<PanelDefinition>): Promise<void>
  deletePanel(id: string): Promise<void>

  // View operations
  addView(
    panelId: string,
    view: Omit<ViewDefinition, 'id'>,
  ): Promise<ViewDefinition>
  updateView(
    panelId: string,
    viewId: string,
    updates: Partial<ViewDefinition>,
  ): Promise<void>
  deleteView(panelId: string, viewId: string): Promise<void>
  getView(panelId: string, viewId: string): Promise<ViewDefinition | null>

  // Column operations
  updateColumn(
    panelId: string,
    columnId: string,
    updates: Partial<ColumnDefinition>,
  ): Promise<void>

  // Loading state
  isLoading(): boolean
}

/**
 * Storage configuration options
 */
export interface StorageConfig {
  mode: 'local' | 'api'
  apiConfig?: {
    baseUrl: string
    tenantId: string
    userId: string
  }
}

/**
 * Storage adapter factory function type
 */
export type StorageAdapterFactory = () => StorageAdapter

/**
 * Supported storage modes
 */
export const STORAGE_MODES = {
  LOCAL: 'local',
  API: 'api',
} as const

export type StorageMode = (typeof STORAGE_MODES)[keyof typeof STORAGE_MODES]
