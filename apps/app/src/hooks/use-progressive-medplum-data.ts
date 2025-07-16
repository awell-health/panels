import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMedplum } from '@/contexts/MedplumClientProvider'
import type { PaginationOptions, PaginatedResult } from '@/lib/medplum'
import type { WorklistTask, WorklistPatient } from './use-medplum-store'
import {
  mapPatientsToWorklistPatients,
  mapTasksToWorklistTasks,
} from '@/lib/fhir-to-table-data'

export interface ProgressiveLoadingOptions {
  pageSize?: number
  maxRecords?: number
  showLoadAll?: boolean
}

export interface ProgressiveLoadingState<T> {
  data: T[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  totalCount?: number
  loadedCount: number
  error: Error | null
  loadMore: () => Promise<void>
  loadAll: () => Promise<void>
  refresh: () => Promise<void>
  reset: () => void
  showLoadAllButton: boolean
  dataAfter?: string
}

export function useProgressiveMedplumData<T extends 'Patient' | 'Task'>(
  resourceType: T,
  options: ProgressiveLoadingOptions = {},
): ProgressiveLoadingState<
  T extends 'Patient' ? WorklistPatient : WorklistTask
> {
  const { pageSize = 1000, maxRecords = 100000, showLoadAll = true } = options

  const { getPatientsPaginated, getTasksPaginated } = useMedplum()

  // State management
  const [data, setData] = useState<
    (T extends 'Patient' ? WorklistPatient : WorklistTask)[]
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
  const [dataAfter, setDataAfter] = useState<string | undefined>(undefined)

  // Refs for tracking
  const isInitialLoadRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isLoadMoreInProgressRef = useRef(false)

  // Calculate if we should show load all button
  const showLoadAllButton = useMemo(() => {
    if (!showLoadAll) return false
    if (!hasMore) return false
    if (data.length >= maxRecords) return false
    return data.length >= 10000
  }, [showLoadAll, hasMore, data.length, maxRecords])

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
    if (isLoading || isInitialLoadRef.current) return

    try {
      setIsLoading(true)
      setError(null)

      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      const result = await getPaginatedData({ pageSize })

      if (abortControllerRef.current.signal.aborted) return

      setData(result.data)
      setHasMore(result.hasMore)
      setNextCursor(result.nextCursor)
      setDataAfter(result.nextCursor)
      setTotalCount(result.totalCount)
      isInitialLoadRef.current = true
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) return
      setError(
        err instanceof Error ? err : new Error('Failed to load initial data'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, getPaginatedData, pageSize])

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

      setData((prevData) => [...prevData, ...result.data])
      setHasMore(result.hasMore)
      setNextCursor(result.nextCursor)
      if (result.nextCursor) {
        setDataAfter(result.nextCursor)
      }
      if (result.totalCount !== undefined) {
        setTotalCount(result.totalCount)
      }
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
    data.length,
    maxRecords,
    getPaginatedData,
    pageSize,
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
        setDataAfter(currentCursor)
        if (result.totalCount !== undefined) {
          setTotalCount(result.totalCount)
        }

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
  ])

  // Refresh data
  const refresh = useCallback(async () => {
    isInitialLoadRef.current = false
    setData([])
    setHasMore(true)
    setNextCursor(undefined)
    setDataAfter(undefined)
    setTotalCount(undefined)
    setError(null)
    await loadInitialData()
  }, [loadInitialData])

  // Reset data
  const reset = useCallback(() => {
    isInitialLoadRef.current = false
    setData([])
    setHasMore(true)
    setNextCursor(undefined)
    setDataAfter(undefined)
    setTotalCount(undefined)
    setError(null)
    setIsLoading(false)
    setIsLoadingMore(false)

    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Note: Window scroll detection is disabled for VirtualizedTable compatibility
  // Scroll detection is handled by the VirtualizedTable component itself
  // This prevents conflicts between window scroll and table scroll events

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
    totalCount,
    loadedCount: data.length,
    error,
    loadMore,
    loadAll,
    refresh,
    reset,
    showLoadAllButton,
    dataAfter,
  }
}
