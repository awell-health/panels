import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useMedplum } from '@/contexts/MedplumClientProvider'
import type { PaginationOptions } from '@/lib/medplum-client'
import type { WorklistTask, WorklistPatient } from '@/lib/fhir-to-table-data'
import { panelDataStoreZustand as panelDataStore } from '@/lib/reactive/panel-medplum-data-store-zustand'
import {
  usePatientsArray,
  useTasksArray,
  usePaginationState,
} from './use-zustand-store'
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

  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const isInitialLoadRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const previousResourceTypeRef = useRef<T>(resourceType)

  // Use Zustand hooks for reactive data
  const patientsArray = usePatientsArray()
  const tasksArray = useTasksArray()
  const patientPagination = usePaginationState('Patient')
  const taskPagination = usePaginationState('Task')

  // Parse the cached data from the store
  const cachedData = useMemo(() => {
    if (resourceType === 'Patient') {
      return patientsArray.length > 0 ? { data: patientsArray } : null
    }
    return tasksArray.length > 0 ? { data: tasksArray } : null
  }, [patientsArray, tasksArray, resourceType])

  const pagination = useMemo(() => {
    return resourceType === 'Patient' ? patientPagination : taskPagination
  }, [patientPagination, taskPagination, resourceType])

  const hasMore = pagination?.hasMore ?? true
  const nextCursor = pagination?.nextCursor

  // Use local state for loading states and additional data management

  const data = useMemo(() => {
    if (resourceType === 'Patient') {
      return patientsArray.length > 0
        ? (panelDataStore.getWorklistDataByResourceType('Patient') ?? [])
        : []
    }
    return tasksArray.length > 0
      ? (panelDataStore.getWorklistDataByResourceType('Task') ?? [])
      : []
  }, [resourceType, patientsArray, tasksArray])

  // Get the appropriate paginated method
  const fetchAndUpdateCachedData = useCallback(
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
        const patients = await getPatientsPaginated(paginationOptions)
        panelDataStore.updateData('Patient', patients.data)
        panelDataStore.updatePagination('Patient', {
          nextCursor: patients.nextCursor,
          hasMore: patients.hasMore,
        })
        const tasks = await getTasksForPatients(
          patients.data.map((patient) => patient.id ?? ''),
        )
        panelDataStore.updateData('Task', tasks)

        return {
          hasMore: patients.hasMore,
          nextCursor: patients.nextCursor,
          totalCount: patients.totalCount,
          patients: patients.data,
          tasks,
        }
      }
      const tasks = await getTasksPaginated(paginationOptions)
      panelDataStore.updateData('Task', tasks.data)
      panelDataStore.updatePagination('Task', {
        nextCursor: tasks.nextCursor,
        hasMore: tasks.hasMore,
      })
      const patients = await getPatientsFromReferences(
        tasks.data.map((task) => task.for?.reference ?? ''),
      )
      panelDataStore.updateData('Patient', patients)
      return {
        hasMore: tasks.hasMore,
        nextCursor: tasks.nextCursor,
        totalCount: tasks.totalCount,
        patients,
        tasks: tasks.data,
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
    if (isMedplumLoading) return

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
      }

      if (hasMore) {
        setIsLoadingMore(true)
        await fetchAndUpdateCachedData({ pageSize, lastUpdated: nextCursor })
        if (abortControllerRef.current.signal.aborted) {
          return
        }
        isInitialLoadRef.current = true
      }
    } catch (err) {
      console.error('Failed to load initial data', err)
      if (abortControllerRef.current?.signal.aborted) return
      setError(
        err instanceof Error ? err : new Error('Failed to load initial data'),
      )
    } finally {
      setIsLoadingMore(false)
    }
  }, [
    isMedplumLoading,
    fetchAndUpdateCachedData,
    pageSize,
    resourceType,
    cachedData,
    hasMore,
    nextCursor,
  ])

  // Load more data
  const loadMore = useCallback(async () => {
    // Don't load more if Medplum is still loading
    if (isMedplumLoading) return

    if (isLoadingMore || !hasMore || !nextCursor || data.length >= maxRecords)
      return

    try {
      setIsLoadingMore(true)
      setError(null)

      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      await fetchAndUpdateCachedData({
        pageSize,
        lastUpdated: nextCursor,
      })

      if (abortControllerRef.current.signal.aborted) return
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) return
      setError(
        err instanceof Error ? err : new Error('Failed to load more data'),
      )
    } finally {
      setIsLoadingMore(false)
    }
  }, [
    isMedplumLoading,
    isLoadingMore,
    hasMore,
    nextCursor,
    data,
    maxRecords,
    fetchAndUpdateCachedData,
    pageSize,
  ])

  // Refresh data
  const refresh = useCallback(async () => {
    isInitialLoadRef.current = false
    setError(null)

    panelDataStore.clearData(resourceType)
    if (data.length > 0) {
      fetchAndUpdateCachedData({ pageSize: data.length })
    } else {
      fetchAndUpdateCachedData({ pageSize })
    }
  }, [resourceType, data, fetchAndUpdateCachedData, pageSize])

  const reset = useCallback(() => {
    isInitialLoadRef.current = false
    setError(null)
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
    isLoading: isMedplumLoading,
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
