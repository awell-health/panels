'use client'

import { ChevronDown, Search } from 'lucide-react'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'

interface TaskInput {
  type?: {
    coding?: Array<{
      system?: string
      code?: string
      display?: string
    }>
  }
  valueString?: string
  valueUrl?: string
}

interface SearchableAdditionalInfoProps {
  input?: TaskInput[]
  enableSearch?: boolean
}

type SearchMode = 'key' | 'value' | 'both'

const SEARCH_MODE_LABELS = {
  key: 'Keys',
  value: 'Values',
  both: 'Both',
} as const

export function SearchableAdditionalInfo({
  input,
  enableSearch = true,
}: SearchableAdditionalInfoProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('both')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  if (!input || input.length === 0) return null

  // Debug: Log the input data structure
  console.log('SearchableAdditionalInfo input:', input)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter input based on search
  const filteredInput = input.filter((item) => {
    if (!searchTerm.trim()) return true

    const normalizedSearchTerm = searchTerm.toLowerCase().trim()
    const key = item.type?.coding?.[0]?.display || 'Unknown Field'

    // Use the same simple logic as the original component
    const value = String(item.valueString || '')

    switch (searchMode) {
      case 'key':
        return key.toLowerCase().includes(normalizedSearchTerm)
      case 'value':
        return value.toLowerCase().includes(normalizedSearchTerm)
      case 'both':
        return (
          key.toLowerCase().includes(normalizedSearchTerm) ||
          value.toLowerCase().includes(normalizedSearchTerm)
        )
      default:
        return (
          key.toLowerCase().includes(normalizedSearchTerm) ||
          value.toLowerCase().includes(normalizedSearchTerm)
        )
    }
  })

  const highlightMatch = (
    text: string,
    searchTerm: string,
  ): React.ReactElement => {
    if (!searchTerm || !enableSearch) {
      return <span>{text}</span>
    }

    const regex = new RegExp(
      `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi',
    )
    const parts = text.split(regex)

    return (
      <span>
        {parts.map((part, index) => {
          const keyId = `${text.slice(0, 10)}-${part}-${index}`
          return regex.test(part) ? (
            <mark
              key={keyId}
              className="bg-yellow-200 text-yellow-900 rounded px-0.5"
            >
              {part}
            </mark>
          ) : (
            <span key={keyId}>{part}</span>
          )
        })}
      </span>
    )
  }

  const shouldHighlightKey = searchMode === 'key' || searchMode === 'both'
  const shouldHighlightValue = searchMode === 'value' || searchMode === 'both'
  const hasActiveSearch = searchTerm.trim().length > 0

  return (
    <div className="bg-gray-50 p-3 rounded">
      {/* Debug indicator */}
      <div className="mb-2 text-xs text-red-600 font-bold">
        🔍 SEARCHABLE VERSION ACTIVE
      </div>
      {enableSearch && (
        <div className="mb-3 space-y-2">
          {/* Search Input */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search additional information..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-20 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />

              {/* Search Mode Dropdown */}
              <div
                className="absolute right-1 top-1/2 transform -translate-y-1/2"
                ref={dropdownRef}
              >
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                >
                  {SEARCH_MODE_LABELS[searchMode]}
                  <ChevronDown className="ml-1 h-3 w-3" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-20 bg-white border border-gray-200 rounded shadow-lg z-50">
                    {Object.entries(SEARCH_MODE_LABELS).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setSearchMode(mode as SearchMode)
                          setIsDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${
                          searchMode === mode
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search Results Counter */}
          {hasActiveSearch && (
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>
                {filteredInput.length === 0
                  ? 'No results found'
                  : `Showing ${filteredInput.length} of ${input.length} results`}
              </span>
              {filteredInput.length > 0 && (
                <span className="text-blue-600">
                  Searching in {SEARCH_MODE_LABELS[searchMode].toLowerCase()}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-xs font-medium text-gray-500 mb-2">
        Additional Information
      </p>
      <div className="space-y-2">
        {filteredInput.length > 0 ? (
          filteredInput.map((item: TaskInput, index: number) => (
            <div
              key={`${item.type?.coding?.[0]?.display}-${index}`}
              className="border-b border-gray-200 pb-2 last:border-0"
            >
              <p className="text-xs text-gray-500">
                {shouldHighlightKey
                  ? highlightMatch(
                      item.type?.coding?.[0]?.display || 'Unknown Field',
                      searchTerm,
                    )
                  : item.type?.coding?.[0]?.display || 'Unknown Field'}
              </p>
              <p className="text-sm">
                {(() => {
                  // Debug: Log each item to see its structure
                  console.log(
                    'Item valueString:',
                    item.valueString,
                    'Type:',
                    typeof item.valueString,
                  )

                  // Use the exact same logic as the original TaskDetails component
                  const displayValue = String(item.valueString || '')

                  return shouldHighlightValue
                    ? highlightMatch(displayValue, searchTerm)
                    : displayValue
                })()}
              </p>
            </div>
          ))
        ) : hasActiveSearch ? (
          <div className="text-xs text-gray-500 text-center py-4">
            No results found for "{searchTerm}"
          </div>
        ) : input.length === 0 ? (
          <p className="text-xs text-gray-500">
            No additional information available
          </p>
        ) : null}
      </div>
    </div>
  )
}
