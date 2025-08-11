import type { IdParam } from '@panels/types'
import type {
  ColumnBaseCreate,
  ColumnBaseCreateResponse,
  ColumnCalculatedCreate,
  ColumnCalculatedCreateResponse,
  ColumnInfo,
  ColumnInfoResponse,
  ColumnsResponse,
} from '@panels/types/columns'
import type {
  DataSourceInfo,
  DataSourceResponse,
  DataSourceSyncResponse,
  DataSourcesResponse,
} from '@panels/types/datasources'
import type {
  CreatePanelResponse,
  PanelInfo,
  PanelResponse,
  PanelsResponse,
} from '@panels/types/panels'

export const panelsAPI = {
  get: async (
    panel: IdParam,
    options?: Record<string, unknown>,
  ): Promise<PanelResponse> => {
    const { apiConfig } = await import('./config/apiConfig')
    const defaultOptions = await apiConfig.getDefaultOptionsNoBody()

    const response = await fetch(
      await apiConfig.buildUrl(`/panels/${panel.id}`),
      {
        method: 'GET',
        ...defaultOptions,
        ...(options || {}),
      },
    )
    return response.json() as Promise<PanelResponse>
  },

  all: async (options = undefined): Promise<PanelsResponse> => {
    const { apiConfig } = await import('./config/apiConfig')
    const defaultOptions = await apiConfig.getDefaultOptionsNoBody()
    const panels = await fetch(await apiConfig.buildUrl('/panels'), {
      method: 'GET',
      ...defaultOptions,
      ...(options || {}),
    })
    return panels.json() as Promise<PanelsResponse>
  },

  create: async (
    panel: PanelInfo,
    options = undefined,
  ): Promise<CreatePanelResponse> => {
    const { apiConfig } = await import('./config/apiConfig')
    const defaultOptions = await apiConfig.getDefaultOptions()
    const response = await fetch(await apiConfig.buildUrl('/panels'), {
      method: 'POST',
      ...defaultOptions,
      body: JSON.stringify({
        name: panel.name,
        description: panel.description,
        metadata: panel.metadata,
      }),
      ...(options || {}),
    })
    return response.json() as Promise<CreatePanelResponse>
  },

  update: async (
    panel: PanelInfo & IdParam,
    options = undefined,
  ): Promise<PanelResponse> => {
    const { apiConfig } = await import('./config/apiConfig')
    const defaultOptions = await apiConfig.getDefaultOptions()
    const response = await fetch(
      await apiConfig.buildUrl(`/panels/${panel.id}`),
      {
        method: 'PUT',
        ...defaultOptions,
        body: JSON.stringify(panel),
        ...(options || {}),
      },
    )
    return response.json() as Promise<PanelResponse>
  },

  delete: async (panel: IdParam, options = undefined): Promise<void> => {
    const { apiConfig } = await import('./config/apiConfig')
    const defaultOptions = await apiConfig.getDefaultOptionsNoBody()
    await fetch(await apiConfig.buildUrl(`/panels/${panel.id}`), {
      method: 'DELETE',
      ...defaultOptions,
      ...(options || {}),
    })
  },

  dataSources: {
    list: async (
      panel: IdParam,
      options = undefined,
    ): Promise<DataSourcesResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const defaultOptions = await apiConfig.getDefaultOptionsNoBody()
      const response = await fetch(
        await apiConfig.buildUrl(`/panels/${panel.id}/datasources`),
        {
          method: 'GET',
          ...defaultOptions,
          ...(options || {}),
        },
      )
      return response.json() as Promise<DataSourcesResponse>
    },

    create: async (
      panel: IdParam,
      dataSource: DataSourceInfo,
      options = undefined,
    ): Promise<DataSourceResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const defaultOptions = await apiConfig.getDefaultOptions()
      const response = await fetch(
        await apiConfig.buildUrl(`/panels/${panel.id}/datasources`),
        {
          method: 'POST',
          ...defaultOptions,
          body: JSON.stringify(dataSource),
          ...(options || {}),
        },
      )
      return response.json() as Promise<DataSourceResponse>
    },

    update: async (
      dataSource: DataSourceInfo & IdParam,
      options = undefined,
    ): Promise<DataSourceResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const defaultOptions = await apiConfig.getDefaultOptions()
      const response = await fetch(
        await apiConfig.buildUrl(`/datasources/${dataSource.id}`),
        {
          method: 'PUT',
          ...defaultOptions,
          body: JSON.stringify(dataSource),
          ...(options || {}),
        },
      )
      return response.json() as Promise<DataSourceResponse>
    },

    delete: async (dataSource: IdParam, options = undefined): Promise<void> => {
      const { apiConfig } = await import('./config/apiConfig')
      const defaultOptions = await apiConfig.getDefaultOptionsNoBody()
      await fetch(await apiConfig.buildUrl(`/datasources/${dataSource.id}`), {
        method: 'DELETE',
        ...defaultOptions,
        ...(options || {}),
      })
    },

    sync: async (
      dataSource: IdParam,
      options = undefined,
    ): Promise<DataSourceSyncResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const defaultOptions = await apiConfig.getDefaultOptions()
      const response = await fetch(
        await apiConfig.buildUrl(`/datasources/${dataSource.id}/sync`),
        {
          method: 'POST',
          ...defaultOptions,
          ...(options || {}),
        },
      )
      return response.json() as Promise<DataSourceSyncResponse>
    },
  },

  columns: {
    list: async (
      panel: IdParam,
      ids?: string[],
      tags?: string[],
      options = undefined,
    ): Promise<ColumnsResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const defaultOptions = await apiConfig.getDefaultOptionsNoBody()

      const queryParams = new URLSearchParams()
      if (ids) {
        for (const id of ids) {
          queryParams.append('ids', id)
        }
      }
      if (tags) {
        for (const tag of tags) {
          queryParams.append('tags', tag)
        }
      }

      const queryString = queryParams.toString()
      const url = queryString
        ? await apiConfig.buildUrl(`/panels/${panel.id}/columns?${queryString}`)
        : await apiConfig.buildUrl(`/panels/${panel.id}/columns`)

      const response = await fetch(url, {
        method: 'GET',
        ...defaultOptions,
        ...(options || {}),
      })
      return response.json() as Promise<ColumnsResponse>
    },

    createBase: async (
      panel: IdParam,
      column: ColumnBaseCreate,
      options = undefined,
    ): Promise<ColumnBaseCreateResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const defaultOptions = await apiConfig.getDefaultOptions()
      const response = await fetch(
        await apiConfig.buildUrl(`/panels/${panel.id}/columns/base`),
        {
          method: 'POST',
          ...defaultOptions,
          body: JSON.stringify(column),
          ...(options || {}),
        },
      )
      return response.json() as Promise<ColumnBaseCreateResponse>
    },

    createCalculated: async (
      panel: IdParam,
      column: ColumnCalculatedCreate,
      options = undefined,
    ): Promise<ColumnCalculatedCreateResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const defaultOptions = await apiConfig.getDefaultOptions()
      const response = await fetch(
        await apiConfig.buildUrl(`/panels/${panel.id}/columns/calculated`),
        {
          method: 'POST',
          ...defaultOptions,
          body: JSON.stringify(column),
          ...(options || {}),
        },
      )
      return response.json() as Promise<ColumnCalculatedCreateResponse>
    },

    update: async (
      column: ColumnInfo & IdParam,
      panelId: IdParam,
      options = undefined,
    ): Promise<ColumnInfoResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const defaultOptions = await apiConfig.getDefaultOptions()
      const response = await fetch(
        await apiConfig.buildUrl(`/panels/${panelId.id}/columns/${column.id}`),
        {
          method: 'PUT',
          ...defaultOptions,
          body: JSON.stringify(column),
          ...(options || {}),
        },
      )
      return response.json() as Promise<ColumnInfoResponse>
    },

    delete: async (
      column: IdParam,
      panelId: IdParam,
      options = undefined,
    ): Promise<void> => {
      const { apiConfig } = await import('./config/apiConfig')
      const defaultOptions = await apiConfig.getDefaultOptionsNoBody()
      await fetch(
        await apiConfig.buildUrl(`/panels/${panelId.id}/columns/${column.id}`),
        {
          method: 'DELETE',
          ...defaultOptions,
          ...(options || {}),
        },
      )
    },
  },
}
