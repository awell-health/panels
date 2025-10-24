import { useCallback, useEffect, useState } from 'react'
import { useDebounce } from './use-debounce'
import { useFHIRStore, useFilteredAndSortedBundles } from '@/lib/fhir-store'
import type { Column } from '@/types/panel'

type SearchMode = 'text' | 'fhirpath'

export interface FHIRSearchOptions {
  searchMode?: SearchMode
  debounceMs?: number
  caseSensitive?: boolean
  searchColumns?: string[] // Specific column IDs to search in, if empty searches all columns
}

export function useFHIRSearch(options: FHIRSearchOptions = {}) {
  const {
    searchMode = 'text',
    debounceMs = 500,
    caseSensitive = false,
    searchColumns = [],
  } = options

  const [searchTerm, setSearchTerm] = useState('')
  const [searchModeState, setSearchModeState] = useState<SearchMode>(searchMode)

  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs)

  const { setCrossColumnSearchTerm } = useFHIRStore()
  const filteredAndSortedBundles = useFilteredAndSortedBundles()

  // Apply search term to the store
  useEffect(() => {
    setCrossColumnSearchTerm(debouncedSearchTerm)
  }, [debouncedSearchTerm, setCrossColumnSearchTerm])

  // Get the final filtered data
  const getFilteredData = useCallback(() => {
    return filteredAndSortedBundles
  }, [filteredAndSortedBundles])

  const clearSearch = useCallback(() => {
    setSearchTerm('')
  }, [])

  return {
    searchTerm,
    setSearchTerm,
    searchMode: searchModeState,
    setSearchMode: setSearchModeState,
    filteredData: getFilteredData(),
    clearSearch,
    isSearching: debouncedSearchTerm.trim().length > 0,
  }
}

// Hook for backward compatibility that mimics the old useSearch interface
export function useFHIRSearchLegacy<T extends Record<string, unknown>>(
  data: T[],
  options: FHIRSearchOptions = {},
) {
  const fhirSearch = useFHIRSearch(options)

  // Convert FHIR bundles back to the expected format if needed
  const convertedData = fhirSearch.filteredData.map(
    (bundle) => bundle.resource as unknown as T,
  ) as T[]

  return {
    searchTerm: fhirSearch.searchTerm,
    setSearchTerm: fhirSearch.setSearchTerm,
    searchMode: fhirSearch.searchMode,
    setSearchMode: fhirSearch.setSearchMode,
    filteredData: convertedData,
    clearSearch: fhirSearch.clearSearch,
    isSearching: fhirSearch.isSearching,
  }
}
