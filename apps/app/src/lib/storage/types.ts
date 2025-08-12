import type { Panel, View, Column } from '@/types/panel'
import type { ACL, ACLCreate, ACLUpdate } from '@panels/types/acls'

/**
 * Storage abstraction interface that provides a unified API
 * for both localStorage and backend API storage implementations
 */
export interface StorageAdapter {
  // Panel operations
  getPanels(): Promise<Panel[]>
  getPanel(id: string): Promise<Panel | null>
  createPanel(panel: Omit<Panel, 'id'>): Promise<Panel>
  updatePanel(id: string, updates: Partial<Panel>): Promise<Panel>
  deletePanel(id: string): Promise<void>

  // View operations
  getViews(): Promise<View[]>
  addView(panelId: string, view: Omit<View, 'id'>): Promise<View>
  updateView(
    panelId: string,
    viewId: string,
    updates: Partial<View>,
  ): Promise<View>
  deleteView(panelId: string, viewId: string): Promise<void>
  getView(panelId: string, viewId: string): Promise<View | null>
  getViewsForPanel(panelId: string): Promise<View[]>

  // Column operations
  getColumns(): Promise<Column[]>
  addColumn(panelId: string, column: Omit<Column, 'id'>): Promise<Column>
  updateColumn(
    panelId: string,
    columnId: string,
    updates: Partial<Column>,
  ): Promise<Column>
  deleteColumn(panelId: string, columnId: string): Promise<void>
  getColumnsForPanel(panelId: string): Promise<Column[]>

  // ACL operations
  getACLs(resourceType: 'panel' | 'view', resourceId: number): Promise<ACL[]>
  createACL(
    resourceType: 'panel' | 'view',
    resourceId: number,
    acl: ACLCreate,
  ): Promise<ACL>
  updateACL(
    resourceType: 'panel' | 'view',
    resourceId: number,
    userEmail: string,
    acl: ACLUpdate,
  ): Promise<ACL>
  deleteACL(
    resourceType: 'panel' | 'view',
    resourceId: number,
    userEmail: string,
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
