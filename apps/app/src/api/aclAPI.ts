import type {
  ACLCreate,
  ACLResponse,
  ACLsResponse,
  ACLUpdate,
} from '@panels/types/acls'

export const aclAPI = {
  list: async (
    resourceType: 'panel' | 'view',
    resourceId: number,
    options?: Record<string, unknown>,
  ): Promise<ACLsResponse> => {
    const { apiConfig } = await import('./config/apiConfig')
    const defaultOptions = await apiConfig.getDefaultOptionsNoBody()

    const response = await fetch(
      await apiConfig.buildUrl(`/acls/${resourceType}/${resourceId}`),
      {
        method: 'GET',
        ...defaultOptions,
        ...(options || {}),
      },
    )
    return response.json() as Promise<ACLsResponse>
  },

  create: async (
    resourceType: 'panel' | 'view',
    resourceId: number,
    acl: ACLCreate,
    options?: Record<string, unknown>,
  ): Promise<ACLResponse> => {
    const { apiConfig } = await import('./config/apiConfig')
    const defaultOptions = await apiConfig.getDefaultOptions()

    const response = await fetch(
      await apiConfig.buildUrl(`/acls/${resourceType}/${resourceId}`),
      {
        method: 'POST',
        ...defaultOptions,
        body: JSON.stringify(acl),
        ...(options || {}),
      },
    )
    return response.json() as Promise<ACLResponse>
  },

  update: async (
    resourceType: 'panel' | 'view',
    resourceId: number,
    userEmail: string,
    acl: ACLUpdate,
    options?: Record<string, unknown>,
  ): Promise<ACLResponse> => {
    const { apiConfig } = await import('./config/apiConfig')
    const defaultOptions = await apiConfig.getDefaultOptions()

    const response = await fetch(
      await apiConfig.buildUrl(
        `/acls/${resourceType}/${resourceId}/${userEmail}`,
      ),
      {
        method: 'PUT',
        ...defaultOptions,
        body: JSON.stringify(acl),
        ...(options || {}),
      },
    )
    return response.json() as Promise<ACLResponse>
  },

  delete: async (
    resourceType: 'panel' | 'view',
    resourceId: number,
    userEmail: string,
    options?: Record<string, unknown>,
  ): Promise<void> => {
    const { apiConfig } = await import('./config/apiConfig')
    const defaultOptions = await apiConfig.getDefaultOptionsNoBody()

    await fetch(
      await apiConfig.buildUrl(
        `/acls/${resourceType}/${resourceId}/${userEmail}`,
      ),
      {
        method: 'DELETE',
        ...defaultOptions,
        ...(options || {}),
      },
    )
  },
}
