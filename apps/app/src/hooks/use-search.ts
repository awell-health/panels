import { isMatchingFhirPathCondition } from '@/lib/fhir-path'
import { useCallback, useEffect, useState } from 'react'
import { useDebounce } from './use-debounce'

type SearchMode = 'text' | 'fhirpath'

// TODO: Needs to be revisited soon
// We are allowing two types of search text and fhirpath
// Likely fhirpath would just be useful for AI to be able to apply filters or for column filters
// We are allowing both for demo purposes only
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function useSearch<T extends Record<string, any>>(data: T[]) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('text')
  const debouncedSearchTerm = useDebounce(searchTerm, 1000) // 500ms delay

  const filteredData = useCallback(() => {
    if (!debouncedSearchTerm) return data

    if (searchMode === 'text') {
      // Recursive function to search through nested objects
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const searchInValue = (value: any): boolean => {
        if (typeof value === 'string') {
          return value.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        }
        if (typeof value === 'number') {
          return value.toString().includes(debouncedSearchTerm)
        }
        if (Array.isArray(value)) {
          return value.some((v) => searchInValue(v))
        }
        if (value && typeof value === 'object') {
          return Object.values(value).some((v) => searchInValue(v))
        }
        return false
      }

      // Simple text search across all fields
      return data.filter((item) => {
        return Object.values(item).some((value) => searchInValue(value))
      })
    }
    // FHIRPath search
    try {
      return data.filter((item) => {
        return isMatchingFhirPathCondition(item, debouncedSearchTerm)
      })
    } catch (error) {
      console.error('Error evaluating FHIRPath:', error)
      return data
    }
  }, [data, debouncedSearchTerm, searchMode])

  return {
    searchTerm,
    setSearchTerm,
    searchMode,
    setSearchMode,
    filteredData: filteredData(),
  }
}
