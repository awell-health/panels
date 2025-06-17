import type {
  ColumnDefinition,
  PanelDefinition,
  ViewDefinition,
} from '@/types/worklist'
import type { ColumnsResponse } from '@panels/types/columns'
import type { ViewResponse } from '@panels/types/views'
import {
  adaptBackendPanelsToFrontend,
  adaptBackendToFrontend,
  adaptBackendViewToFrontend,
  adaptFrontendToBackend,
  adaptFrontendViewToBackend,
  adaptBackendColumnToFrontend,
  getApiConfig,
  validateApiConfig,
} from './type-adapters'
import type { StorageAdapter } from './types'

interface CacheConfig {
  enabled: boolean
  duration: number // in milliseconds
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  key: string
}

interface CacheStore {
  panels: CacheEntry<PanelDefinition[]> | null
  views: { [panelId: string]: CacheEntry<ViewDefinition[]> } | null
}

/**
 * API Storage Adapter - Full integration with backend services
 * Uses sophisticated type adapters and loads complete data relationships
 */
export class APIStorageAdapter implements StorageAdapter {
  private config: { tenantId: string; userId: string }
  private cache: CacheStore = { panels: null, views: null }
  private cacheConfig: CacheConfig

  constructor(cacheConfig?: Partial<CacheConfig>) {
    this.config = getApiConfig()
    validateApiConfig(this.config)
    this.cacheConfig = {
      enabled: cacheConfig?.enabled ?? true,
      duration: cacheConfig?.duration ?? 5 * 60 * 1000, // 5 minutes default
    }
  }

  private isCacheValid<T>(entry: CacheEntry<T> | null): boolean {
    if (!this.cacheConfig.enabled || !entry) return false
    return Date.now() - entry.timestamp < this.cacheConfig.duration
  }

  private setCacheEntry<T>(
    key: keyof CacheStore,
    data: T,
    subKey?: string,
  ): void {
    if (!this.cacheConfig.enabled) return

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      key: subKey || key,
    }

    if (key === 'views' && subKey) {
      if (!this.cache.views) this.cache.views = {}
      this.cache.views[subKey] = entry as CacheEntry<ViewDefinition[]>
    } else if (key === 'panels') {
      this.cache.panels = entry as CacheEntry<PanelDefinition[]>
    }
  }

  private getCacheEntry<T>(key: keyof CacheStore, subKey?: string): T | null {
    if (!this.cacheConfig.enabled) return null

    let entry: CacheEntry<T> | null = null

    if (key === 'views' && subKey && this.cache.views) {
      entry = (this.cache.views[subKey] as CacheEntry<T> | undefined) || null
    } else if (key === 'panels') {
      entry = this.cache.panels as CacheEntry<T> | null
    }

    return this.isCacheValid(entry) && entry ? entry.data : null
  }

  private invalidateCache(key: keyof CacheStore, subKey?: string): void {
    if (key === 'views' && subKey && this.cache.views) {
      delete this.cache.views[subKey]
    } else if (key === 'panels') {
      this.cache.panels = null
    }
  }

  async getPanels(): Promise<PanelDefinition[]> {
    // Check cache first
    const cachedPanels = this.getCacheEntry<PanelDefinition[]>('panels')
    if (cachedPanels) {
      return cachedPanels
    }

    try {
      const { panelsAPI } = await import('@/api/panelsAPI')
      const backendPanels = await panelsAPI.all(
        this.config.tenantId,
        this.config.userId,
      )

      // Use the sophisticated adapter to convert all panels at once
      const frontendPanels = adaptBackendPanelsToFrontend(backendPanels)

      // Load detailed data for each panel in parallel
      const enrichedPanels = await Promise.allSettled(
        frontendPanels.map(async (panel) => {
          try {
            return await this.enrichPanelWithDetails(panel)
          } catch (error) {
            console.warn(
              `Failed to enrich panel ${panel.id} with details:`,
              error,
            )
            // Return panel with default columns if enrichment fails
            return {
              ...panel,
              patientViewColumns: panel.patientViewColumns || [
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
              ],
              taskViewColumns: panel.taskViewColumns || [
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
              ],
              views: panel.views || [],
            }
          }
        }),
      )

      // Extract successful results and log failures
      const result = enrichedPanels.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value
        }
        console.error(
          `Failed to load panel ${frontendPanels[index].id}:`,
          result.reason,
        )
        // Return panel with default columns as fallback
        return {
          ...frontendPanels[index],
          patientViewColumns: frontendPanels[index].patientViewColumns || [
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
          ],
          taskViewColumns: frontendPanels[index].taskViewColumns || [
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
          ],
          views: frontendPanels[index].views || [],
        }
      })

      // Cache the result
      this.setCacheEntry('panels', result)
      return result
    } catch (error) {
      console.error('Failed to fetch panels from API:', error)
      throw new Error(
        `Failed to load panels: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async getPanel(id: string): Promise<PanelDefinition | null> {
    try {
      const { panelsAPI } = await import('@/api/panelsAPI')

      // Get detailed panel data with all relationships
      const [backendPanel, columns, backendViews] = await Promise.allSettled([
        panelsAPI.get({ id }, this.config.tenantId, this.config.userId),
        this.loadPanelColumns(id),
        this.loadPanelViews(id),
      ])

      // Handle the panel data
      if (backendPanel.status === 'rejected') {
        if (
          backendPanel.reason instanceof Error &&
          backendPanel.reason.message.includes('404')
        ) {
          return null
        }
        throw backendPanel.reason
      }

      // Use sophisticated adapter with all available data
      const columnsData =
        columns.status === 'fulfilled' ? columns.value : undefined
      const viewsData =
        backendViews.status === 'fulfilled' ? backendViews.value : []

      return adaptBackendToFrontend(
        backendPanel.value,
        columnsData || undefined,
        viewsData,
      )
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      console.error(`Failed to fetch panel ${id} from API:`, error)
      throw new Error(
        `Failed to load panel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async createPanel(
    panel: Omit<PanelDefinition, 'id'>,
  ): Promise<PanelDefinition> {
    try {
      const { panelsAPI } = await import('@/api/panelsAPI')

      // Convert frontend panel to backend format using sophisticated adapter
      const backendPanelInfo = adaptFrontendToBackend(panel, this.config)

      // Create panel via API
      const createdPanel = await panelsAPI.create(backendPanelInfo)

      // Create a data source for the panel
      const dataSource = await panelsAPI.dataSources.create(
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

      // Map frontend column types to backend types
      const typeMapping = {
        string: 'text' as const,
        number: 'number' as const,
        boolean: 'boolean' as const,
        date: 'date' as const,
        tasks: 'custom' as const,
        select: 'select' as const,
        array: 'multi_select' as const,
        assignee: 'user' as const,
      }

      // Create all columns (both patient and task view) as base columns
      const allColumnsPromises = [
        ...panel.patientViewColumns.map((column) =>
          panelsAPI.columns.createBase(
            { id: createdPanel.id.toString() },
            {
              name: column.name,
              type: typeMapping[column.type],
              sourceField: column.key,
              dataSourceId: dataSource.id,
              metadata: {
                description: column.description,
              },
              properties: {
                display: column.properties?.display,
                validation: {},
                required: false,
                unique: false,
              },
              tags: ['panels:patients'],
              tenantId: this.config.tenantId,
              userId: this.config.userId,
            },
          ),
        ),
        ...panel.taskViewColumns.map((column) =>
          panelsAPI.columns.createBase(
            { id: createdPanel.id.toString() },
            {
              name: column.name,
              type: typeMapping[column.type],
              sourceField: column.key,
              dataSourceId: dataSource.id,
              metadata: {
                description: column.description,
              },
              properties: {
                display: column.properties?.display,
                validation: {},
                required: false,
                unique: false,
              },
              tags: ['panels:tasks'],
              tenantId: this.config.tenantId,
              userId: this.config.userId,
            },
          ),
        ),
      ]

      // Wait for all columns to be created
      const createdColumns = await Promise.all(allColumnsPromises)

      // Invalidate panels cache since we created a new one
      this.invalidateCache('panels')

      // Return the created panel using full adapter
      const createdPanelAdapted = adaptBackendToFrontend(
        createdPanel,
        {
          baseColumns: createdColumns.map(column => ({
            ...column,
            columnType: 'base'
          })),
          calculatedColumns: []
        }
      )
      return createdPanelAdapted
    } catch (error) {
      console.error('Failed to create panel via API:', error)
      throw new Error(
        `Failed to create panel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async updatePanel(
    id: string,
    updates: Partial<PanelDefinition>,
  ): Promise<void> {
    try {
      const { panelsAPI } = await import('@/api/panelsAPI')

      // Get the current panel to merge updates
      const currentPanel = await this.getPanel(id)
      if (!currentPanel) {
        throw new Error(`Panel ${id} not found`)
      }

      // Merge updates with current panel
      const updatedPanel = { ...currentPanel, ...updates }

      // Convert to backend format using sophisticated adapter
      const backendPanelInfo = {
        ...adaptFrontendToBackend(updatedPanel, this.config),
        id: id, // Keep as string for API compatibility
      }

      // Update panel via API
      await panelsAPI.update(backendPanelInfo)

      // Handle column synchronization
      const currentColumns = await this.loadPanelColumns(id)
      const currentPatientColumns =
        currentColumns?.baseColumns.filter((col) =>
          col.tags?.includes('panels:patients'),
        ) || []
      const currentTaskColumns =
        currentColumns?.baseColumns.filter((col) =>
          col.tags?.includes('panels:tasks'),
        ) || []

      // Create arrays of column keys for comparison
      const currentPatientKeys = new Set(
        currentPatientColumns.map((col) => col.sourceField),
      )
      const currentTaskKeys = new Set(
        currentTaskColumns.map((col) => col.sourceField),
      )
      const newPatientKeys = new Set(
        updatedPanel.patientViewColumns?.map((col) => col.key) || [],
      )
      const newTaskKeys = new Set(
        updatedPanel.taskViewColumns?.map((col) => col.key) || [],
      )

      // Find columns to delete (in current but not in new)
      const patientColumnsToDelete = currentPatientColumns.filter(
        (col) => !newPatientKeys.has(col.sourceField),
      )
      const taskColumnsToDelete = currentTaskColumns.filter(
        (col) => !newTaskKeys.has(col.sourceField),
      )

      // Find columns to create (in new but not in current)
      const patientColumnsToCreate = updatedPanel.patientViewColumns?.filter(
        (col) => !currentPatientKeys.has(col.key),
      ) || []
      const taskColumnsToCreate = updatedPanel.taskViewColumns?.filter(
        (col) => !currentTaskKeys.has(col.key),
      )

      // Delete removed columns
      const deletePromises = [
        ...patientColumnsToDelete.map((col) =>
          panelsAPI.columns.delete({
            id: col.id.toString(),
            tenantId: this.config.tenantId,
            userId: this.config.userId,
          }),
        ),
        ...taskColumnsToDelete.map((col) =>
          panelsAPI.columns.delete({
            id: col.id.toString(),
            tenantId: this.config.tenantId,
            userId: this.config.userId,
          }),
        ),
      ]

      const dataSources = await panelsAPI.dataSources.list(
        { id: id },
        this.config.tenantId,
        this.config.userId,
      )
      // Get the data source ID from the current panel
      const dataSourceId = dataSources[0].id || 1 // Fallback to 1 if not available

      // Map frontend column types to backend types
      const typeMapping: Record<
        string,
        | 'text'
        | 'number'
        | 'date'
        | 'boolean'
        | 'select'
        | 'multi_select'
        | 'user'
        | 'file'
        | 'custom'
      > = {
        string: 'text',
        number: 'number',
        date: 'date',
        boolean: 'boolean',
        select: 'select',
        tasks: 'select',
        array: 'multi_select',
        assignee: 'user',
      }

      // Create new columns
      const createPromises = [
        ...patientColumnsToCreate.map((column) =>
          panelsAPI.columns.createBase(
            { id },
            {
              name: column.name,
              type: typeMapping[column.type] || 'text',
              sourceField: column.key,
              dataSourceId,
              metadata: {
                description: column.description,
              },
              properties: {
                display: column.properties?.display,
                validation: {},
                required: false,
                unique: false,
              },
              tags: ['panels:patients'],
              tenantId: this.config.tenantId,
              userId: this.config.userId,
            },
          ),
        ),
        ...(taskColumnsToCreate || []).map((column) =>
          panelsAPI.columns.createBase(
            { id },
            {
              name: column.name,
              type: typeMapping[column.type] || 'text',
              sourceField: column.key,
              dataSourceId,
              metadata: {
                description: column.description,
              },
              properties: {
                display: column.properties?.display,
                validation: {},
                required: false,
                unique: false,
              },
              tags: ['panels:tasks'],
              tenantId: this.config.tenantId,
              userId: this.config.userId,
            },
          ),
        ),
      ]

      // Execute all column operations in parallel
      await Promise.all([...deletePromises, ...createPromises])

      // Invalidate panels cache since we updated one
      this.invalidateCache('panels')
    } catch (error) {
      console.error(`Failed to update panel ${id} via API:`, error)
      throw new Error(
        `Failed to update panel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async deletePanel(id: string): Promise<void> {
    try {
      const { panelsAPI } = await import('@/api/panelsAPI')

      // Delete via API
      await panelsAPI.delete(this.config.tenantId, this.config.userId, {
        id: id,
      })

      // Invalidate panels cache since we deleted one
      this.invalidateCache('panels')
    } catch (error) {
      console.error(`Failed to delete panel ${id} via API:`, error)
      throw new Error(
        `Failed to delete panel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async addView(
    panelId: string,
    view: Omit<ViewDefinition, 'id'>,
  ): Promise<ViewDefinition> {
    try {
      const { viewsAPI } = await import('@/api/viewsAPI')
      const { panelsAPI } = await import('@/api/panelsAPI')

      // Convert frontend view to backend format
      const backendViewInfo = adaptFrontendViewToBackend(
        view,
        panelId,
        this.config,
      )
      // Create view via API
      const createdView = await viewsAPI.create(backendViewInfo)

      const columns = await panelsAPI.columns.list(
        { id: panelId },
        this.config.tenantId,
        this.config.userId,
        createdView.config.columns,
      )

      const frontendView = adaptBackendViewToFrontend(
        createdView,
        columns.baseColumns,
        columns.calculatedColumns,
      )

      // const patientColumns = columns.baseColumns.map(
      //   adaptBackendColumnToFrontend,
      // )
      // const taskColumns = columns.calculatedColumns.map(
      //   adaptBackendColumnToFrontend,
      // )

      // const updatedView: ViewDefinition = {
      //   ...createdView,
      //   id: createdView.id.toString(),
      //   columns: [...patientColumns, ...taskColumns] as ColumnDefinition[], //TODO: fix this type
      //   title: createdView.name,
      //   filters: [],
      //   createdAt: new Date(), //TODO: get the actual createdAt from the backend
      //   viewType: 'patient',
      // }

      // Invalidate views cache for this panel
      this.invalidateCache('views', panelId)

      return frontendView
    } catch (error) {
      console.error(`Failed to add view to panel ${panelId}:`, error)
      throw new Error(
        `Failed to add view: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async updateView(
    panelId: string,
    viewId: string,
    updates: Partial<ViewDefinition>,
  ): Promise<void> {
    try {
      const { viewsAPI } = await import('@/api/viewsAPI')

      // Get current view to merge updates
      const currentView = await this.getView(panelId, viewId)
      if (!currentView) {
        throw new Error(`View ${viewId} not found in panel ${panelId}`)
      }

      // Merge updates with current view
      const updatedView = { ...currentView, ...updates }

      // Convert to backend format
      const backendViewInfo = adaptFrontendViewToBackend(
        updatedView,
        panelId,
        this.config,
      )

      // Update via API
      await viewsAPI.update({
        ...backendViewInfo,
        id: viewId,
      })

      // Invalidate views cache for this panel
      this.invalidateCache('views', panelId)
    } catch (error) {
      console.error(
        `Failed to update view ${viewId} in panel ${panelId}:`,
        error,
      )
      throw new Error(
        `Failed to update view: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async deleteView(panelId: string, viewId: string): Promise<void> {
    try {
      const { viewsAPI } = await import('@/api/viewsAPI')

      // Delete via API
      await viewsAPI.delete(this.config.tenantId, this.config.userId, {
        id: viewId,
      })

      // Invalidate views cache for this panel
      this.invalidateCache('views', panelId)
    } catch (error) {
      console.error(
        `Failed to delete view ${viewId} in panel ${panelId}:`,
        error,
      )
      throw new Error(
        `Failed to delete view: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async getView(
    panelId: string,
    viewId: string,
  ): Promise<ViewDefinition | null> {
    try {
      const { viewsAPI } = await import('@/api/viewsAPI')
      const { panelsAPI } = await import('@/api/panelsAPI')
      // Check cache first
      const cachedViews = this.getCacheEntry<ViewDefinition[]>('views', panelId)
      if (cachedViews) {
        const cachedView = cachedViews.find((view) => view.id === viewId)
        if (cachedView) return cachedView
      }

      // Get from API
      const backendView = await viewsAPI.get(
        this.config.tenantId,
        this.config.userId,
        { id: viewId },
      )

      const columns = await panelsAPI.columns.list(
        { id: panelId },
        this.config.tenantId,
        this.config.userId,
        backendView.config.columns,
      )

      const frontendView = adaptBackendViewToFrontend(
        backendView,
        columns.baseColumns,
        columns.calculatedColumns,
      )

      // const patientColumns = columns.baseColumns.map(
      //   adaptBackendColumnToFrontend,
      // )
      // const taskColumns = columns.calculatedColumns.map(
      //   adaptBackendColumnToFrontend,
      // )

      // const frontendView: ViewDefinition = {
      //   ...backendView,
      //   id: backendView.id.toString(),
      //   columns: [...patientColumns, ...taskColumns] as ColumnDefinition[],
      //   title: backendView.name,
      //   filters: [],
      //   createdAt: new Date(), //TODO: get the actual createdAt from the backend
      //   viewType: 'patient',
      // }

      // Cache the result
      this.setCacheEntry('views', [frontendView], panelId)

      return frontendView
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      console.error(
        `Failed to fetch view ${viewId} from panel ${panelId}:`,
        error,
      )
      throw new Error(
        `Failed to fetch view: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Enhanced panel enrichment with sophisticated data loading
   */
  private async enrichPanelWithDetails(
    panel: PanelDefinition,
  ): Promise<PanelDefinition> {
    try {
      // Load columns and views in parallel for maximum efficiency
      const [columns, views] = await Promise.allSettled([
        this.loadPanelColumns(panel.id),
        this.loadPanelViews(panel.id),
      ])

      // Create enriched panel with all available data
      const enrichedPanel: PanelDefinition = {
        ...panel,
        patientViewColumns:
          columns.status === 'fulfilled' && columns.value?.baseColumns
            ? columns.value.baseColumns
                .filter((column) => column.tags?.includes('panels:patients'))
                .map(adaptBackendColumnToFrontend)
            : panel.patientViewColumns || [],
        taskViewColumns:
          columns.status === 'fulfilled' && columns.value?.baseColumns
            ? columns.value.baseColumns
                .filter((column) => column.tags?.includes('panels:tasks'))
                .map(adaptBackendColumnToFrontend)
            : panel.taskViewColumns || [],
        views:
          views.status === 'fulfilled' &&
          views.value &&
          columns.status === 'fulfilled' &&
          columns.value
            ? views.value.map((vw) =>
                adaptBackendViewToFrontend(
                  vw,
                  columns.value?.baseColumns || [],
                  columns.value?.calculatedColumns || [],
                ),
              )
            : panel.views || [],
      }

      return enrichedPanel
    } catch (error) {
      console.error(`Failed to enrich panel ${panel.id}:`, error)
      // Return panel with empty arrays for missing data
      return {
        ...panel,
        patientViewColumns: panel.patientViewColumns || [],
        taskViewColumns: panel.taskViewColumns || [],
        views: panel.views || [],
      }
    }
  }

  /**
   * Load columns for a specific panel
   */
  private async loadPanelColumns(
    panelId: string,
  ): Promise<ColumnsResponse | null> {
    try {
      const { panelsAPI } = await import('@/api/panelsAPI')
      return await panelsAPI.columns.list(
        { id: panelId },
        this.config.tenantId,
        this.config.userId,
      )
    } catch (error) {
      console.warn(`Failed to load columns for panel ${panelId}:`, error)
      return null
    }
  }

  /**
   * Load views for a specific panel
   */
  private async loadPanelViews(panelId: string): Promise<ViewResponse[]> {
    try {
      const { viewsAPI } = await import('@/api/viewsAPI')

      // Get all views for the user and filter by panel
      const allViews = await viewsAPI.all(
        //TODO: fix this is extremely bad
        this.config.tenantId,
        this.config.userId,
      )

      // Filter views that belong to this panel
      return allViews.views.filter(
        (view) => view.panelId === Number.parseInt(panelId, 10),
      )
    } catch (error) {
      console.warn(`Failed to load views for panel ${panelId}:`, error)
      return []
    }
  }

  isLoading(): boolean {
    return false // API operations are inherently async, no persistent loading state
  }
}
