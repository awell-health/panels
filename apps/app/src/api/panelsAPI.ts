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
    tenantId: string,
    userId: string,
    options?: Record<string, unknown>,
  ): Promise<PanelResponse> => {
    const { apiConfig } = await import('./config/apiConfig')
    const response = await fetch(apiConfig.buildUrl(`/panels/${panel.id}?tenantId=${tenantId}&userId=${userId}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      ...(options || {}),
    })
    return response.json() as Promise<PanelResponse>
  },

  all: async (
    tenantId: string,
    userId: string,
    options = undefined,
  ): Promise<PanelsResponse> => {
    const { apiConfig } = await import('./config/apiConfig')
    const panels = await fetch(
      apiConfig.buildUrl(`/panels?tenantId=${tenantId}&userId=${userId}`),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        ...(options || {}),
      },
    )
    return panels.json() as Promise<PanelsResponse>
  },

  create: async (
    panel: PanelInfo,
    options = undefined,
  ): Promise<CreatePanelResponse> => {
    const { apiConfig } = await import('./config/apiConfig')
    const response = await fetch(apiConfig.buildUrl('/panels'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: panel.name,
        description: panel.description,
        tenantId: panel.tenantId,
        userId: panel.userId,
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
    const response = await fetch(apiConfig.buildUrl(`/panels/${panel.id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: panel.name,
        description: panel.description,
        tenantId: panel.tenantId,
        userId: panel.userId,
      }),
      ...(options || {}),
    })
    return response.json() as Promise<PanelResponse>
  },

  delete: async (
    tenantId: string,
    userId: string,
    panel: IdParam,
    options = undefined,
  ): Promise<void> => {
    const { apiConfig } = await import('./config/apiConfig')
    await fetch(apiConfig.buildUrl(`/panels/${panel.id}?tenantId=${tenantId}&userId=${userId}`), {
      method: 'DELETE',
      ...(options || {}),
    })
  },

  dataSources: {
    list: async (
      panel: IdParam,
      tenantId: string,
      userId: string,
      options = undefined,
    ): Promise<DataSourcesResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const response = await fetch(
        apiConfig.buildUrl(
          `/panels/${panel.id}/datasources?tenantId=${tenantId}&userId=${userId}`,
        ),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
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
      const response = await fetch(
        apiConfig.buildUrl(`/panels/${panel.id}/datasources`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
      const response = await fetch(
        apiConfig.buildUrl(`/datasources/${dataSource.id}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataSource),
          ...(options || {}),
        },
      )
      return response.json() as Promise<DataSourceResponse>
    },

    delete: async (
      dataSource: IdParam & { tenantId: string; userId: string },
      options = undefined,
    ): Promise<void> => {
      const { apiConfig } = await import('./config/apiConfig')
      await fetch(apiConfig.buildUrl(`/datasources/${dataSource.id}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: dataSource.tenantId,
          userId: dataSource.userId,
        }),
        ...(options || {}),
      })
    },

    sync: async (
      dataSource: IdParam,
      options = undefined,
    ): Promise<DataSourceSyncResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const response = await fetch(
        apiConfig.buildUrl(`/datasources/${dataSource.id}/sync`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          ...(options || {}),
        },
      )
      return response.json() as Promise<DataSourceSyncResponse>
    },
  },

  columns: {
    list: async (
      panel: IdParam,
      tenantId: string,
      userId: string,
      options = undefined,
    ): Promise<ColumnsResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const response = await fetch(
        apiConfig.buildUrl(
          `/panels/${panel.id}/columns?tenantId=${tenantId}&userId=${userId}`,
        ),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          ...(options || {}),
        },
      )
      return response.json() as Promise<ColumnsResponse>
    },

    createBase: async (
      panel: IdParam,
      column: ColumnBaseCreate,
      options = undefined,
    ): Promise<ColumnBaseCreateResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const response = await fetch(
        apiConfig.buildUrl(`/panels/${panel.id}/columns/base`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
      const response = await fetch(
        apiConfig.buildUrl(`/panels/${panel.id}/columns/calculated`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(column),
          ...(options || {}),
        },
      )
      return response.json() as Promise<ColumnCalculatedCreateResponse>
    },

    update: async (
      column: ColumnInfo & IdParam,
      options = undefined,
    ): Promise<ColumnInfoResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const response = await fetch(
        apiConfig.buildUrl(`/columns/${column.id}`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(column),
          ...(options || {}),
        },
      )
      return response.json() as Promise<ColumnInfoResponse>
    },

    delete: async (
      column: IdParam & { tenantId: string; userId: string },
      options = undefined,
    ): Promise<void> => {
      const { apiConfig } = await import('./config/apiConfig')
      await fetch(apiConfig.buildUrl(`/columns/${column.id}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: column.tenantId,
          userId: column.userId,
        }),
        ...(options || {}),
      })
    },
  },
}
