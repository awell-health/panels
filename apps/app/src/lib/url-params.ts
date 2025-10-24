import type { ResourceType } from '@medplum/fhirtypes'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

/**
 * Helper functions for managing URL query parameters in panel pages
 */

export interface RowClickParams {
  searchParams: URLSearchParams
  router: ReturnType<typeof useRouter>
  pathname: string
}

/**
 * Handles row click by setting appropriate URL parameters
 * @param row - The clicked row data
 * @param params - Router and search params context
 */
export const handleRowClick = (
  resourceType: ResourceType,
  resourceId: string,
  { searchParams, router, pathname }: RowClickParams,
) => {
  const currentParams = new URLSearchParams(searchParams.toString())

  if (resourceType === 'Patient' || resourceType.toLowerCase() === 'patient') {
    currentParams.set('patientId', resourceId)
    currentParams.delete('taskId')
    currentParams.delete('appointmentId')
  }

  if (resourceType === 'Task' || resourceType.toLowerCase() === 'task') {
    currentParams.delete('patientId')
    currentParams.set('taskId', resourceId)
    currentParams.delete('appointmentId')
  }

  if (
    resourceType === 'Appointment' ||
    resourceType.toLowerCase() === 'appointment'
  ) {
    // For appointments, show the appointment modal
    currentParams.delete('patientId')
    currentParams.delete('taskId')
    currentParams.set('appointmentId', resourceId)
  }

  console.log(resourceType, 'currentParams', currentParams.toString())

  return router.push(`${pathname}?${currentParams.toString()}`)
}

/**
 * Handles modal close by removing patient and task parameters
 * @param params - Router and search params context
 */
export const handleModalClose = ({
  searchParams,
  router,
  pathname,
}: RowClickParams) => {
  const currentParams = new URLSearchParams(searchParams.toString())
  currentParams.delete('patientId')
  currentParams.delete('taskId')
  currentParams.delete('appointmentId')
  router.push(pathname)
}

/**
 * Hook to get URL parameter management functions
 * @returns Object with row click and modal close handlers
 */
export const useModalUrlParams = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const routerParams = {
    searchParams,
    router,
    pathname,
  }

  return {
    handleRowClick: (resourceType: ResourceType, resourceId: string) =>
      handleRowClick(resourceType, resourceId, routerParams),
    handleModalClose: () => handleModalClose(routerParams),
  }
}

export function setQueryParamsWithoutRerender(
  params: Record<string, string | null | undefined>,
) {
  const url = new URL(window.location.href)
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') {
      url.searchParams.delete(key)
    } else {
      url.searchParams.set(key, value)
    }
  }
  // No navigation, no re-render:
  window.history.replaceState(window.history.state, '', url.toString())
}

export function removeQueryParamsWithoutRerender(
  params: Record<string, string | null | undefined>,
) {
  const url = new URL(window.location.href)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.delete(key)
  }
  window.history.replaceState(window.history.state, '', url.toString())
}
