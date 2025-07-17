import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useMedplum } from '@/contexts/MedplumClientProvider'
import type { PaginationOptions } from '@/lib/medplum-client'
import type { WorklistTask, WorklistPatient } from '@/lib/fhir-to-table-data'
import {
  mapPatientsToWorklistPatients,
  mapTasksToWorklistTasks,
} from '@/lib/fhir-to-table-data'
import { panelDataStore } from '@/lib/reactive/panel-medplum-data-store'
import { useRow } from 'tinybase/ui-react'

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

  const {
    getPatientsPaginated,
    getTasksPaginated,
    getPatientsFromReferences,
    getTasksForPatients,
    isLoading: isMedplumLoading,
  } = useMedplum()

  // Get the reactive subscription from the store
  const { store, table, key } = useMemo(() => {
    return panelDataStore.getReactiveSubscription(panelId, resourceType)
  }, [panelId, resourceType])

  const storeRow = useRow(table, key, store)

  // Parse the cached data from the store
  const cachedData = useMemo(() => {
    if (!storeRow || !storeRow.data) {
      return null
    }

    try {
      const parsed = JSON.parse(storeRow.data as string) as {
        data: WorklistPatient[] | WorklistTask[]
        pagination: { nextCursor?: string; hasMore: boolean }
        lastUpdated: string
        panelId: string
        resourceType: 'Patient' | 'Task'
      }
      return parsed
    } catch (error) {
      console.warn('Failed to parse cached data:', error)
      return null
    }
  }, [storeRow])

  // Use local state for loading states and additional data management
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [additionalData, setAdditionalData] = useState<
    (T extends 'Patient' ? WorklistPatient : WorklistTask)[]
  >([])

  const isInitialLoadRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isLoadMoreInProgressRef = useRef(false)
  const previousResourceTypeRef = useRef<T>(resourceType)

  // Combine cached data with additional data
  const data = useMemo(() => {
    const cached = cachedData?.data || []
    return [...cached, ...additionalData] as (T extends 'Patient'
      ? WorklistPatient
      : WorklistTask)[]
  }, [cachedData, additionalData])

  // Get pagination state from cached data
  const hasMore = cachedData?.pagination.hasMore ?? true
  const nextCursor = cachedData?.pagination.nextCursor

  // Get the appropriate paginated method
  const getPaginatedData = useCallback(
    async (
      paginationOptions: PaginationOptions,
    ): Promise<{
      hasMore: boolean
      nextCursor?: string
      totalCount?: number
      mappedPatients: WorklistPatient[]
      mappedTasks: WorklistTask[]
    }> => {
      if (resourceType === 'Patient') {
        const result = await getPatientsPaginated(paginationOptions)
        const tasks = await getTasksForPatients(
          result.data.map((patient) => patient.id ?? ''),
        )
        const mappedPatients = mapPatientsToWorklistPatients(result.data, tasks)
        const mappedTasks = mapTasksToWorklistTasks(result.data, tasks)
        return {
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
          totalCount: result.totalCount,
          mappedPatients,
          mappedTasks,
        }
      }
      const result = await getTasksPaginated(paginationOptions)
      const patients = await getPatientsFromReferences(
        result.data.map((task) => task.for?.reference ?? ''),
      )
      const mappedTasks = mapTasksToWorklistTasks(patients, result.data)
      const mappedPatients = mapPatientsToWorklistPatients(
        patients,
        result.data,
      )
      return {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        totalCount: result.totalCount,
        mappedPatients,
        mappedTasks,
      }
    },
    [
      resourceType,
      getPatientsPaginated,
      getTasksPaginated,
      getPatientsFromReferences,
      getTasksForPatients,
    ],
  )

  // Load initial data
  const loadInitialData = useCallback(async () => {
    // Don't load if Medplum is still loading or if we're already loading
    if (isMedplumLoading || isLoading) return

    // Check if resource type has changed
    if (previousResourceTypeRef.current !== resourceType) {
      // Resource type changed, reset the initial load flag
      isInitialLoadRef.current = false
      previousResourceTypeRef.current = resourceType
    }

    if (isInitialLoadRef.current) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      // Check if we already have cached data

      if (
        cachedData &&
        Array.isArray(cachedData.data) &&
        cachedData.data.length > 0
      ) {
        isInitialLoadRef.current = true
        setIsLoading(false)
        return
      }

      const result = await getPaginatedData({ pageSize })

      if (abortControllerRef.current.signal.aborted) {
        return
      }

      // Store the data in the panelDataStore
      panelDataStore.setData(
        panelId,
        'Patient',
        result.mappedPatients as WorklistPatient[],
        {
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
        },
      )

      panelDataStore.setData(
        panelId,
        'Task',
        result.mappedTasks as WorklistTask[],
        {
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
        },
      )

      isInitialLoadRef.current = true
    } catch (err) {
      console.error('Failed to load initial data', err)
      if (abortControllerRef.current?.signal.aborted) return
      setError(
        err instanceof Error ? err : new Error('Failed to load initial data'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [
    isMedplumLoading,
    isLoading,
    getPaginatedData,
    pageSize,
    panelId,
    resourceType,
    cachedData,
  ])

  // Load more data
  const loadMore = useCallback(async () => {
    // Don't load more if Medplum is still loading
    if (isMedplumLoading) return

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

      console.log('getPaginatedData - Loading more data')
      const result = await getPaginatedData({
        pageSize,
        lastUpdated: nextCursor,
      })

      if (abortControllerRef.current.signal.aborted) return

      // Update the store with new data
      panelDataStore.updateData(
        panelId,
        'Patient',
        result.mappedPatients as WorklistPatient[],
        {
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
        },
      )
      panelDataStore.updateData(
        panelId,
        'Task',
        result.mappedTasks as WorklistTask[],
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
    isMedplumLoading,
    isLoadingMore,
    hasMore,
    nextCursor,
    data,
    maxRecords,
    getPaginatedData,
    pageSize,
    panelId,
  ])

  // Refresh data
  const refresh = useCallback(async () => {
    isInitialLoadRef.current = false
    setAdditionalData([])
    setError(null)

    panelDataStore.removeData(panelId, resourceType)

    await loadInitialData()
  }, [loadInitialData, panelId, resourceType])

  const reset = useCallback(() => {
    isInitialLoadRef.current = false
    setAdditionalData([])
    setError(null)
    setIsLoading(false)
    setIsLoadingMore(false)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    panelDataStore.removeData(panelId, resourceType)
  }, [panelId, resourceType])

  // Load initial data on mount or when Medplum finishes loading
  useEffect(() => {
    if (!isMedplumLoading) {
      loadInitialData()
    }
  }, [loadInitialData, isMedplumLoading])

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
    isLoading: isLoading || isMedplumLoading,
    isLoadingMore,
    hasMore,
    loadedCount: data.length,
    error,
    dataAfter: nextCursor,
    loadMore,
    refresh,
    reset,
  }
}
