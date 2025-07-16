import { useCallback, useEffect, useRef, useState } from 'react'
import { useMedplum } from '@/contexts/MedplumClientProvider'
import type { PaginationOptions, PaginatedResult } from '@/lib/medplum'
import type { WorklistTask, WorklistPatient } from '@/lib/fhir-to-table-data'
import {
  mapPatientsToWorklistPatients,
  mapTasksToWorklistTasks,
} from '@/lib/fhir-to-table-data'
import { panelDataStore } from '@/lib/reactive/panel-medplum-data-store'

export interface ProgressiveLoadingOptions {
  pageSize: number
  maxRecords: number
  panelId: string
}

export interface ProgressiveLoadingState<T> {
  data: T[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  loadedCount: number
  error: Error | null
  dataAfter?: string
  loadMore: () => Promise<void>
  loadAll: () => Promise<void>
  refresh: () => Promise<void>
  reset: () => void
}

export function useProgressiveMedplumData<T extends 'Patient' | 'Task'>(
  resourceType: T,
  options: ProgressiveLoadingOptions,
): ProgressiveLoadingState<
  T extends 'Patient' ? WorklistPatient : WorklistTask
> {
  const { pageSize = 1000, maxRecords = 100000, panelId } = options

  const { getPatientsPaginated, getTasksPaginated } = useMedplum()

  const [data, setData] = useState<
    (T extends 'Patient' ? WorklistPatient : WorklistTask)[]
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)

  const isInitialLoadRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isLoadMoreInProgressRef = useRef(false)
  const previousResourceTypeRef = useRef<T>(resourceType)

  // Get the appropriate paginated method
  const getPaginatedData = useCallback(
    async (
      paginationOptions: PaginationOptions,
    ): Promise<
      PaginatedResult<T extends 'Patient' ? WorklistPatient : WorklistTask>
    > => {
      if (resourceType === 'Patient') {
        const result = await getPatientsPaginated(paginationOptions)
        const mappedData = mapPatientsToWorklistPatients(result.data, [])
        return {
          ...result,
          data: mappedData,
        } as PaginatedResult<
          T extends 'Patient' ? WorklistPatient : WorklistTask
        >
      }
      const result = await getTasksPaginated(paginationOptions)
      const mappedData = mapTasksToWorklistTasks([], result.data)
      return {
        ...result,
        data: mappedData,
      } as PaginatedResult<T extends 'Patient' ? WorklistPatient : WorklistTask>
    },
    [resourceType, getPatientsPaginated, getTasksPaginated],
  )

  // Load initial data
  const loadInitialData = useCallback(async () => {
    if (isLoading) return

    // Check if resource type has changed
    if (previousResourceTypeRef.current !== resourceType) {
      // Resource type changed, reset the initial load flag
      isInitialLoadRef.current = false
      previousResourceTypeRef.current = resourceType
    }

    if (isInitialLoadRef.current) return

    try {
      setIsLoading(true)
      setError(null)

      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      try {
        const cached = panelDataStore.getData(panelId, resourceType)

        if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
          setData(
            cached.data as (T extends 'Patient'
              ? WorklistPatient
              : WorklistTask)[],
          )
          // Restore pagination state from cache
          setHasMore(cached.pagination.hasMore)
          setNextCursor(cached.pagination.nextCursor)
          isInitialLoadRef.current = true
          setIsLoading(false)
          return
        }
      } catch (err) {
        console.error('Error getting cached data', err)
      }

      // Load from API if no cache hit
      const result = await getPaginatedData({ pageSize })

      if (abortControllerRef.current.signal.aborted) return

      setData(result.data)
      setHasMore(result.hasMore)
      setNextCursor(result.nextCursor)
      isInitialLoadRef.current = true

      if (panelDataStore && panelId) {
        panelDataStore.setData(
          panelId,
          resourceType,
          result.data as WorklistPatient[] | WorklistTask[],
          {
            nextCursor: result.nextCursor,
            hasMore: result.hasMore,
          },
        )
      }
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) return
      setError(
        err instanceof Error ? err : new Error('Failed to load initial data'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, getPaginatedData, pageSize, panelId, resourceType])

  // Load more data
  const loadMore = useCallback(async () => {
    if (
      isLoadingMore ||
      !hasMore ||
      !nextCursor ||
      data.length >= maxRecords ||
      isLoadMoreInProgressRef.current
    )
      return

    try {
      isLoadMoreInProgressRef.current = true
      setIsLoadingMore(true)
      setError(null)

      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      const result = await getPaginatedData({
        pageSize,
        lastUpdated: nextCursor,
      })

      if (abortControllerRef.current.signal.aborted) return

      const newData = [...data, ...result.data]
      setData(newData)
      setHasMore(result.hasMore)
      setNextCursor(result.nextCursor)

      panelDataStore.updateData(
        panelId,
        resourceType,
        result.data as WorklistPatient[] | WorklistTask[],
        {
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
        },
      )
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) return
      setError(
        err instanceof Error ? err : new Error('Failed to load more data'),
      )
    } finally {
      setIsLoadingMore(false)
      isLoadMoreInProgressRef.current = false
    }
  }, [
    isLoadingMore,
    hasMore,
    nextCursor,
    data,
    maxRecords,
    getPaginatedData,
    pageSize,
    panelId,
    resourceType,
  ])

  // Load all data
  const loadAll = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore || data.length >= maxRecords)
      return

    try {
      setIsLoadingMore(true)
      setError(null)

      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      let currentCursor = nextCursor
      let allData = [...data]
      let hasMoreData = hasMore as boolean

      while (hasMoreData && allData.length < maxRecords && currentCursor) {
        const result = await getPaginatedData({
          pageSize,
          lastUpdated: currentCursor,
        })

        if (abortControllerRef.current.signal.aborted) return

        allData = [...allData, ...result.data]
        hasMoreData = result.hasMore as boolean
        currentCursor = result.nextCursor

        // Update state incrementally for better UX
        setData(allData)
        setHasMore(hasMoreData === true)
        setNextCursor(currentCursor)

        panelDataStore.updateData(
          panelId,
          resourceType,
          result.data as WorklistPatient[] | WorklistTask[],
          {
            nextCursor: currentCursor,
            hasMore: hasMoreData,
          },
        )

        // Small delay to prevent overwhelming the UI
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) return
      setError(
        err instanceof Error ? err : new Error('Failed to load all data'),
      )
    } finally {
      setIsLoadingMore(false)
    }
  }, [
    isLoading,
    isLoadingMore,
    hasMore,
    data,
    maxRecords,
    nextCursor,
    getPaginatedData,
    pageSize,
    panelId,
    resourceType,
  ])

  // Refresh data
  const refresh = useCallback(async () => {
    isInitialLoadRef.current = false
    setData([])
    setHasMore(true)
    setNextCursor(undefined)
    setError(null)

    panelDataStore.removeData(panelId, resourceType)

    await loadInitialData()
  }, [loadInitialData, panelId, resourceType])

  const reset = useCallback(() => {
    isInitialLoadRef.current = false
    setData([])
    setHasMore(true)
    setNextCursor(undefined)
    setError(null)
    setIsLoading(false)
    setIsLoadingMore(false)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    panelDataStore.removeData(panelId, resourceType)
  }, [panelId, resourceType])

  // Load initial data on mount
  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    data,
    isLoading,
    isLoadingMore,
    hasMore,
    loadedCount: data.length,
    error,
    dataAfter: nextCursor,
    loadMore,
    loadAll,
    refresh,
    reset,
  }
}
