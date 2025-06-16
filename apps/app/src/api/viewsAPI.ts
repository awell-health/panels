import type { IdParam } from '@panels/types'
import type {
  ViewInfo,
  ViewPublishInfo,
  ViewPublishResponse,
  ViewResponse,
  ViewSortsInfo,
  ViewSortsResponse,
  ViewsResponse,
} from '@panels/types/views'

export const viewsAPI = {
  all: async (
    tenantId: string,
    userId: string,
    options = undefined,
  ): Promise<ViewsResponse> => {
    const { apiConfig } = await import('./config/apiConfig')
    const response = await fetch(
      apiConfig.buildUrl(`/views?tenantId=${tenantId}&userId=${userId}`),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        ...(options || {}),
      },
    )
    return response.json() as Promise<ViewsResponse>
  },

  get: async (
    view: IdParam,
    options?: Record<string, unknown>,
  ): Promise<ViewResponse> => {
    const { apiConfig } = await import('./config/apiConfig')
    const response = await fetch(apiConfig.buildUrl(`/views/${view.id}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      ...(options || {}),
    })
    return response.json() as Promise<ViewResponse>
  },

  create: async (
    view: ViewInfo,
    options = undefined,
  ): Promise<ViewResponse> => {
    const { apiConfig } = await import('./config/apiConfig')
    const response = await fetch(apiConfig.buildUrl('/views'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(view),
      ...(options || {}),
    })
    return response.json() as Promise<ViewResponse>
  },

  update: async (
    view: ViewInfo & IdParam,
    options = undefined,
  ): Promise<ViewResponse> => {
    const { apiConfig } = await import('./config/apiConfig')
    const response = await fetch(apiConfig.buildUrl(`/views/${view.id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(view),
      ...(options || {}),
    })
    return response.json() as Promise<ViewResponse>
  },

  delete: async (
    view: IdParam & { tenantId: string; userId: string },
    options = undefined,
  ): Promise<void> => {
    const { apiConfig } = await import('./config/apiConfig')
    await fetch(apiConfig.buildUrl(`/views/${view.id}`), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantId: view.tenantId,
        userId: view.userId,
      }),
      ...(options || {}),
    })
  },

  publishing: {
    publish: async (
      view: IdParam,
      context: ViewPublishInfo,
      options = undefined,
    ): Promise<ViewPublishResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const response = await fetch(
        apiConfig.buildUrl(`/views/${view.id}/publish`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(context),
          ...(options || {}),
        },
      )
      return response.json() as Promise<ViewPublishResponse>
    },
  },

  sorts: {
    update: async (
      view: IdParam,
      sorts: ViewSortsInfo,
      options = undefined,
    ): Promise<ViewSortsResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const response = await fetch(
        apiConfig.buildUrl(`/views/${view.id}/sorts`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sorts),
          ...(options || {}),
        },
      )
      return response.json() as Promise<ViewSortsResponse>
    },

    get: async (
      view: IdParam,
      tenantId: string,
      userId: string,
      options = undefined,
    ): Promise<ViewSortsResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const response = await fetch(
        apiConfig.buildUrl(
          `/views/${view.id}/sorts?tenantId=${tenantId}&userId=${userId}`,
        ),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          ...(options || {}),
        },
      )
      return response.json() as Promise<ViewSortsResponse>
    },
  },
}
