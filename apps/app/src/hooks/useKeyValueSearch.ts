import { useMemo, useState } from 'react'

export type SearchMode = 'key' | 'value' | 'both'

export interface KeyValueItem {
  key: string
  value: string
  originalIndex: number
}

export interface UseKeyValueSearchProps {
  data: KeyValueItem[]
  defaultSearchMode?: SearchMode
  debounceMs?: number
}

export interface UseKeyValueSearchReturn {
  searchTerm: string
  setSearchTerm: (term: string) => void
  searchMode: SearchMode
  setSearchMode: (mode: SearchMode) => void
  filteredData: KeyValueItem[]
  totalCount: number
  filteredCount: number
  hasActiveSearch: boolean
}

export function useKeyValueSearch({
  data,
  defaultSearchMode = 'both',
  debounceMs = 300,
}: UseKeyValueSearchProps): UseKeyValueSearchReturn {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>(defaultSearchMode)

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) {
      return data
    }

    const normalizedSearchTerm = searchTerm.toLowerCase().trim()

    return data.filter((item) => {
      const normalizedKey = item.key.toLowerCase()
      const normalizedValue = item.value.toLowerCase()

      switch (searchMode) {
        case 'key':
          return normalizedKey.includes(normalizedSearchTerm)
        case 'value':
          return normalizedValue.includes(normalizedSearchTerm)
        case 'both':
          return (
            normalizedKey.includes(normalizedSearchTerm) ||
            normalizedValue.includes(normalizedSearchTerm)
          )
        default:
          return (
            normalizedKey.includes(normalizedSearchTerm) ||
            normalizedValue.includes(normalizedSearchTerm)
          )
      }
    })
  }, [data, searchTerm, searchMode])

  return {
    searchTerm,
    setSearchTerm,
    searchMode,
    setSearchMode,
    filteredData,
    totalCount: data.length,
    filteredCount: filteredData.length,
    hasActiveSearch: searchTerm.trim().length > 0,
  }
}
