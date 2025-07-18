import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useMedplum } from '@/contexts/MedplumClientProvider'
import type { PaginationOptions } from '@/lib/medplum-client'
import type { WorklistTask, WorklistPatient } from '@/lib/fhir-to-table-data'
import { panelDataStore } from '@/lib/reactive/panel-medplum-data-store'
import { useTable } from 'tinybase/ui-react'
import type { Patient, Task } from '@medplum/fhirtypes'

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
  const { pageSize = 1000, maxRecords = 100000 } = options

  const {
    getPatientsPaginated,
    getTasksPaginated,
    getPatientsFromReferences,
    getTasksForPatients,
    isLoading: isMedplumLoading,
  } = useMedplum()

  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)

  const isInitialLoadRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isLoadMoreInProgressRef = useRef(false)
  const previousResourceTypeRef = useRef<T>(resourceType)

  // Get the reactive subscription from the store
  const { store, table } = useMemo(() => {
    return panelDataStore.getDataReactiveTableSubscription(resourceType)
  }, [resourceType])

  const {
    store: paginationStore,
    table: paginationTable,
    key: paginationKey,
  } = useMemo(() => {
    return panelDataStore.getPaginationReactiveSubscription(resourceType)
  }, [resourceType])

  const resourceTable = useTable(table, store)
  const paginationTableData = useTable(paginationTable, paginationStore)

  // Parse the cached data from the store
  const cachedData = useMemo(() => {
    if (!resourceTable) {
      return null
    }
    return panelDataStore.getData(resourceType)
  }, [resourceTable, resourceType])

  useMemo(() => {
    if (!paginationTableData || !paginationKey) {
      return null
    }

    const pagination = panelDataStore.getPagination(resourceType)
    setHasMore(pagination?.hasMore ?? false)
    setNextCursor(pagination?.nextCursor)
  }, [paginationTableData, paginationKey, resourceType])

  // Use local state for loading states and additional data management

  const data = useMemo(() => {
    if (!cachedData) {
      return []
    }
    return panelDataStore.getWorklistDataByResourceType(resourceType) ?? []
  }, [resourceType, cachedData])

  // Get the appropriate paginated method
  const getPaginatedData = useCallback(
    async (
      paginationOptions: PaginationOptions,
    ): Promise<{
      hasMore: boolean
      nextCursor?: string
      totalCount?: number
      patients: Patient[]
      tasks: Task[]
    }> => {
      if (resourceType === 'Patient') {
        const result = await getPatientsPaginated(paginationOptions)
        const tasks = await getTasksForPatients(
          result.data.map((patient) => patient.id ?? ''),
        )
        return {
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
          totalCount: result.totalCount,
          patients: result.data,
          tasks,
        }
      }
      const result = await getTasksPaginated(paginationOptions)
      const patients = await getPatientsFromReferences(
        result.data.map((task) => task.for?.reference ?? ''),
      )
      return {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        totalCount: result.totalCount,
        patients,
        tasks: result.data,
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
        setIsLoadingMore(true)
      }

      const result = await getPaginatedData({ pageSize })

      if (abortControllerRef.current.signal.aborted) {
        return
      }

      panelDataStore.updateData('Patient', result.patients)
      panelDataStore.updateData('Task', result.tasks)
      panelDataStore.updatePagination(resourceType, {
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      })

      isInitialLoadRef.current = true
    } catch (err) {
      console.error('Failed to load initial data', err)
      if (abortControllerRef.current?.signal.aborted) return
      setError(
        err instanceof Error ? err : new Error('Failed to load initial data'),
      )
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [
    isMedplumLoading,
    isLoading,
    getPaginatedData,
    pageSize,
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

      const result = await getPaginatedData({
        pageSize,
        lastUpdated: nextCursor,
      })

      if (abortControllerRef.current.signal.aborted) return

      // Update the store with new data
      panelDataStore.updateData('Patient', result.patients)
      panelDataStore.updateData('Task', result.tasks)
      panelDataStore.updatePagination(resourceType, {
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      })
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
    resourceType,
  ])

  // Refresh data
  const refresh = useCallback(async () => {
    isInitialLoadRef.current = false
    setError(null)

    panelDataStore.clearData(resourceType)

    await loadInitialData()
  }, [loadInitialData, resourceType])

  const reset = useCallback(() => {
    isInitialLoadRef.current = false
    setError(null)
    setIsLoading(false)
    setIsLoadingMore(false)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    panelDataStore.clearData(resourceType)
  }, [resourceType])

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
    data: data as (T extends 'Patient' ? WorklistPatient : WorklistTask)[],
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
