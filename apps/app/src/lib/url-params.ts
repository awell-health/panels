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

  if (resourceType === 'Patient') {
    currentParams.set('patientId', resourceId)
    currentParams.delete('taskId')
  }

  if (resourceType === 'Task') {
    currentParams.delete('patientId')
    currentParams.set('taskId', resourceId)
  }

  router.push(`${pathname}?${currentParams.toString()}`)
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
