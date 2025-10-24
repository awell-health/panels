'use server'

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
import type { View as ViewBackend, ViewsResponse } from '@panels/types/views'
import { getRuntimeConfig } from '@/lib/config'
import { cookies } from 'next/headers'

/**
 * Get server-side authentication token from cookies
 * This extracts the Stytch session token from the 'stytch_session' cookie
 * which is set by the client-side Stytch authentication
 *
 * Alternative: For more robust server-side authentication, you can install
 * the Stytch Node.js library: npm install stytch
 *
 * Then use it like this:
 * ```typescript
 * import { StytchApiKey, StytchPublicToken, Stytch } from 'stytch'
 *
 * const stytch = new Stytch({
 *   project_id: process.env.STYTCH_PROJECT_ID!,
 *   secret: process.env.STYTCH_SECRET!,
 *   public_token: process.env.STYTCH_PUBLIC_TOKEN!,
 * })
 *
 * async function getServerAuthToken(): Promise<string | null> {
 *   try {
 *     const cookieStore = await cookies()
 *     const stytchSession = cookieStore.get('stytch_session')
 *
 *     if (!stytchSession?.value) {
 *       return null
 *     }
 *
 *     // Verify the session with Stytch server-side
 *     const session = await stytch.sessions.authenticate({
 *       session_token: stytchSession.value,
 *     })
 *
 *     return `Bearer ${session.session_token}`
 *   } catch (error) {
 *     console.warn('Failed to authenticate session:', error)
 *     return null
 *   }
 * }
 * ```
 */
export async function getServerAuthToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()

    // Check for the Stytch JWT session cookie (this is what the API expects)
    const stytchSessionJwt = cookieStore.get('stytch_session_jwt')

    // Fallback to regular session cookie if JWT cookie not found
    const stytchSession = cookieStore.get('stytch_session')

    // Prefer JWT token over session token (this matches jwtTokenService.getToken())
    const tokenValue = stytchSessionJwt?.value || stytchSession?.value

    if (!tokenValue) {
      console.warn('No Stytch session cookies found')
      return null
    }

    // Return in "Bearer token" format for API requests
    // Note: This should match the format returned by jwtTokenService.getAuthorizationHeader()
    return `Bearer ${tokenValue}`
  } catch (error) {
    console.warn('Failed to get server auth token from cookies:', error)
    return null
  }
}

/**
 * Get server-side API configuration
 */
async function getServerApiConfig() {
  const config = await getRuntimeConfig()

  if (!config.storageApiBaseUrl) {
    throw new Error('Storage API base URL is not configured')
  }

  return {
    baseUrl: config.storageApiBaseUrl.replace(/\/$/, ''), // Remove trailing slash
  }
}

/**
 * Get authorization header for requests
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}

  // If no authToken provided, try to get it automatically (only if allowed)
  const authHeader = await getServerAuthToken()

  if (authHeader) {
    headers.Authorization = authHeader
  } else {
    console.warn('No auth header found')
  }

  return headers
}

/**
 * Get default options for requests with body
 */
async function getDefaultOptions(): Promise<RequestInit> {
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders()),
    },
  }
}

/**
 * Get default options for requests without body
 */
async function getDefaultOptionsNoBody(): Promise<RequestInit> {
  return {
    headers: {
      ...(await getAuthHeaders()),
    },
  }
}

/**
 * Build full URL from path
 */
async function buildUrl(path: string): Promise<string> {
  const { baseUrl } = await getServerApiConfig()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const fullUrl = `${baseUrl}${cleanPath}`
  console.log(`[DEBUG] Built URL: ${fullUrl}`)
  return fullUrl
}

/**
 * Make HTTP request with error handling
 */
async function makeRequest<T>(url: string, options: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`API request failed for ${url}:`, error)
    throw error
  }
}

// Panel operations
export async function getPanel(
  panel: IdParam,
  options?: RequestInit,
): Promise<PanelResponse> {
  const url = await buildUrl(`/panels/${panel.id}`)

  const requestOptions = {
    method: 'GET',
    ...(await getDefaultOptionsNoBody()),
    ...(options || {}),
  }

  return makeRequest<PanelResponse>(url, requestOptions)
}

export async function getAllPanels(
  authToken?: string,
  options?: RequestInit,
): Promise<PanelsResponse> {
  const url = await buildUrl('/panels')
  const requestOptions = {
    method: 'GET',
    ...(await getDefaultOptionsNoBody()),
    ...(options || {}),
  }

  return makeRequest<PanelsResponse>(url, requestOptions)
}

export async function createPanel(
  panel: PanelInfo,
  authToken?: string,
  options?: RequestInit,
): Promise<CreatePanelResponse> {
  const url = await buildUrl('/panels')
  const requestOptions = {
    method: 'POST',
    ...(await getDefaultOptions()),
    body: JSON.stringify({
      name: panel.name,
      description: panel.description,
      metadata: panel.metadata,
    }),
    ...(options || {}),
  }

  return makeRequest<CreatePanelResponse>(url, requestOptions)
}

export async function updatePanel(
  panelId: string,
  updates: Partial<PanelInfo>,
  options?: RequestInit,
): Promise<PanelResponse> {
  const url = await buildUrl(`/panels/${panelId}`)
  const requestOptions = {
    method: 'PUT',
    ...(await getDefaultOptions()),
    body: JSON.stringify(updates),
    ...(options || {}),
  }

  return makeRequest<PanelResponse>(url, requestOptions)
}

export async function deletePanel(
  panel: IdParam,
  authToken?: string,
  options?: RequestInit,
): Promise<void> {
  const url = await buildUrl(`/panels/${panel.id}`)
  const requestOptions = {
    method: 'DELETE',
    ...(await getDefaultOptionsNoBody()),
    ...(options || {}),
  }

  await makeRequest<void>(url, requestOptions)
}

// Data source operations
export async function getDataSources(
  panel: IdParam,
  authToken?: string,
  options?: RequestInit,
): Promise<DataSourcesResponse> {
  const url = await buildUrl(`/panels/${panel.id}/datasources`)
  const requestOptions = {
    method: 'GET',
    ...(await getDefaultOptionsNoBody()),
    ...(options || {}),
  }

  return makeRequest<DataSourcesResponse>(url, requestOptions)
}

export async function createDataSource(
  panel: IdParam,
  dataSource: DataSourceInfo,
  authToken?: string,
  options?: RequestInit,
): Promise<DataSourceResponse> {
  const url = await buildUrl(`/panels/${panel.id}/datasources`)
  const requestOptions = {
    method: 'POST',
    ...(await getDefaultOptions()),
    body: JSON.stringify(dataSource),
    ...(options || {}),
  }

  return makeRequest<DataSourceResponse>(url, requestOptions)
}

export async function updateDataSource(
  dataSource: DataSourceInfo & IdParam,
  authToken?: string,
  options?: RequestInit,
): Promise<DataSourceResponse> {
  const url = await buildUrl(`/datasources/${dataSource.id}`)
  const requestOptions = {
    method: 'PUT',
    ...(await getDefaultOptions()),
    body: JSON.stringify(dataSource),
    ...(options || {}),
  }

  return makeRequest<DataSourceResponse>(url, requestOptions)
}

export async function deleteDataSource(
  dataSource: IdParam,
  authToken?: string,
  options?: RequestInit,
): Promise<void> {
  const url = await buildUrl(`/datasources/${dataSource.id}`)
  const requestOptions = {
    method: 'DELETE',
    ...(await getDefaultOptionsNoBody()),
    ...(options || {}),
  }

  await makeRequest<void>(url, requestOptions)
}

export async function syncDataSource(
  dataSource: IdParam,
  authToken?: string,
  options?: RequestInit,
): Promise<DataSourceSyncResponse> {
  const url = await buildUrl(`/datasources/${dataSource.id}/sync`)
  const requestOptions = {
    method: 'POST',
    ...(await getDefaultOptions()),
    ...(options || {}),
  }

  return makeRequest<DataSourceSyncResponse>(url, requestOptions)
}

// Column operations
export async function getColumns(
  panel: IdParam,
  ids?: string[],
  tags?: string[],
  options?: RequestInit,
): Promise<ColumnsResponse> {
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
  const path = queryString
    ? `/panels/${panel.id}/columns?${queryString}`
    : `/panels/${panel.id}/columns`

  const url = await buildUrl(path)

  const requestOptions = {
    method: 'GET',
    ...(await getDefaultOptionsNoBody()),
    ...(options || {}),
  }

  return makeRequest<ColumnsResponse>(url, requestOptions)
}

export async function createBaseColumn(
  panel: IdParam,
  column: ColumnBaseCreate,
  options?: RequestInit,
): Promise<ColumnBaseCreateResponse> {
  const url = await buildUrl(`/panels/${panel.id}/columns/base`)
  const requestOptions = {
    method: 'POST',
    ...(await getDefaultOptions()),
    body: JSON.stringify(column),
    ...(options || {}),
  }

  return makeRequest<ColumnBaseCreateResponse>(url, requestOptions)
}

export async function createCalculatedColumn(
  panel: IdParam,
  column: ColumnCalculatedCreate,
  options?: RequestInit,
): Promise<ColumnCalculatedCreateResponse> {
  const url = await buildUrl(`/panels/${panel.id}/columns/calculated`)
  const requestOptions = {
    method: 'POST',
    ...(await getDefaultOptions()),
    body: JSON.stringify(column),
    ...(options || {}),
  }

  return makeRequest<ColumnCalculatedCreateResponse>(url, requestOptions)
}

export async function updateColumn(
  column: ColumnInfo & IdParam,
  panelId: IdParam,
  options?: RequestInit,
): Promise<ColumnInfoResponse> {
  const url = await buildUrl(`/panels/${panelId.id}/columns/${column.id}`)
  const requestOptions = {
    method: 'PUT',
    ...(await getDefaultOptions()),
    body: JSON.stringify(column),
    ...(options || {}),
  }

  return makeRequest<ColumnInfoResponse>(url, requestOptions)
}

export async function deleteColumn(
  column: IdParam,
  panelId: IdParam,
  options?: RequestInit,
): Promise<void> {
  const url = await buildUrl(`/panels/${panelId.id}/columns/${column.id}`)
  const requestOptions = {
    method: 'DELETE',
    ...(await getDefaultOptionsNoBody()),
    ...(options || {}),
  }

  await makeRequest<void>(url, requestOptions)
}

// View operations
export async function getViews(
  panelId: string,
  options?: RequestInit,
): Promise<ViewsResponse> {
  const url = await buildUrl(`/views?panelId=${panelId}`)

  const requestOptions = {
    method: 'GET',
    ...(await getDefaultOptionsNoBody()),
    ...(options || {}),
  }

  return makeRequest<ViewsResponse>(url, requestOptions)
}

export async function getView(
  viewId: string,
  options?: RequestInit,
): Promise<ViewBackend> {
  const url = await buildUrl(`/views/${viewId}`)

  const requestOptions = {
    method: 'GET',
    ...(await getDefaultOptionsNoBody()),
    ...(options || {}),
  }

  return makeRequest<ViewBackend>(url, requestOptions)
}

export async function createView(
  panelId: string,
  view: Omit<ViewBackend, 'id'>,
  options?: RequestInit,
): Promise<ViewBackend> {
  const url = await buildUrl(`/panels/${panelId}/views`)
  const requestOptions = {
    method: 'POST',
    ...(await getDefaultOptions()),
    body: JSON.stringify(view),
    ...(options || {}),
  }

  return makeRequest<ViewBackend>(url, requestOptions)
}

export async function updateView(
  panelId: string,
  viewId: string,
  view: Partial<ViewBackend>,
  options?: RequestInit,
): Promise<ViewBackend> {
  const url = await buildUrl(`/panels/${panelId}/views/${viewId}`)
  const requestOptions = {
    method: 'PUT',
    ...(await getDefaultOptions()),
    body: JSON.stringify(view),
    ...(options || {}),
  }

  return makeRequest<ViewBackend>(url, requestOptions)
}

export async function deleteView(
  panelId: string,
  viewId: string,
  options?: RequestInit,
): Promise<void> {
  const url = await buildUrl(`/panels/${panelId}/views/${viewId}`)
  const requestOptions = {
    method: 'DELETE',
    ...(await getDefaultOptionsNoBody()),
    ...(options || {}),
  }

  await makeRequest<void>(url, requestOptions)
}
