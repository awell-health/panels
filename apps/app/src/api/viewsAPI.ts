import type { IdParam } from '@panels/types'
import type {
  ViewCreate,
  View,
  ViewSortsUpdate,
  ViewSortsResponse,
  ViewsResponse,
  ViewUpdate,
} from '@panels/types/views'

export const viewsAPI = {
  all: async (options = undefined): Promise<ViewsResponse> => {
    const { apiConfig } = await import('./config/apiConfig')
    const defaultOptions = await apiConfig.getDefaultOptionsNoBody()
    const response = await fetch(await apiConfig.buildUrl('/views'), {
      method: 'GET',
      ...defaultOptions,
      ...(options || {}),
    })
    return response.json() as Promise<ViewsResponse>
  },

  get: async (
    view: IdParam,
    options?: Record<string, unknown>,
  ): Promise<View> => {
    const { apiConfig } = await import('./config/apiConfig')
    const defaultOptions = await apiConfig.getDefaultOptionsNoBody()
    const response = await fetch(
      await apiConfig.buildUrl(`/views/${view.id}`),
      {
        method: 'GET',
        ...defaultOptions,
        ...(options || {}),
      },
    )
    return response.json() as Promise<View>
  },

  create: async (view: ViewCreate, options = undefined): Promise<View> => {
    const { apiConfig } = await import('./config/apiConfig')
    const defaultOptions = await apiConfig.getDefaultOptions()
    const response = await fetch(await apiConfig.buildUrl('/views'), {
      method: 'POST',
      ...defaultOptions,
      body: JSON.stringify(view),
      ...(options || {}),
    })
    return response.json() as Promise<View>
  },

  update: async (
    view: ViewUpdate & IdParam,
    options = undefined,
  ): Promise<View> => {
    const { apiConfig } = await import('./config/apiConfig')
    const defaultOptions = await apiConfig.getDefaultOptions()
    const response = await fetch(
      await apiConfig.buildUrl(`/views/${view.id}`),
      {
        method: 'PUT',
        ...defaultOptions,
        body: JSON.stringify(view),
        ...(options || {}),
      },
    )
    return response.json() as Promise<View>
  },

  delete: async (view: IdParam, options = undefined): Promise<void> => {
    const { apiConfig } = await import('./config/apiConfig')
    const defaultOptions = await apiConfig.getDefaultOptionsNoBody()
    await fetch(await apiConfig.buildUrl(`/views/${view.id}`), {
      method: 'DELETE',
      ...defaultOptions,
      ...(options || {}),
    })
  },

  sorts: {
    update: async (
      view: IdParam,
      sorts: ViewSortsUpdate,
      options = undefined,
    ): Promise<ViewSortsResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const defaultOptions = await apiConfig.getDefaultOptions()
      const response = await fetch(
        await apiConfig.buildUrl(`/views/${view.id}/sorts`),
        {
          method: 'PUT',
          ...defaultOptions,
          body: JSON.stringify(sorts),
          ...(options || {}),
        },
      )
      return response.json() as Promise<ViewSortsResponse>
    },

    get: async (
      view: IdParam,
      options = undefined,
    ): Promise<ViewSortsResponse> => {
      const { apiConfig } = await import('./config/apiConfig')
      const defaultOptions = await apiConfig.getDefaultOptions()
      const response = await fetch(
        await apiConfig.buildUrl(`/views/${view.id}/sorts`),
        {
          method: 'GET',
          ...defaultOptions,
          ...(options || {}),
        },
      )
      return response.json() as Promise<ViewSortsResponse>
    },
  },
}
