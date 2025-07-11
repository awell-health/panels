'use client'

import type { Extension } from '@medplum/fhirtypes'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { JsonViewer, SimplifiedJsonViewer } from '@/components/JsonViewer'
import { isFeatureEnabled } from '@/utils/featureFlags'
import { useDateTimeFormat } from '@/hooks/use-date-time-format'

export type SearchableExtensionDetailsProps = {
  extensions: Extension[]
  title?: string
  enableSearch?: boolean
}

type SearchMode = 'key' | 'value' | 'both'

const SEARCH_MODE_LABELS = {
  key: 'Keys',
  value: 'Values',
  both: 'Both',
} as const

// Fast JSON detection using regex patterns
function isJsonString(value: string): boolean {
  // Quick check for common JSON patterns
  const trimmed = value.trim()

  // Check if it starts with { or [ and ends with } or ]
  if (!/^[{[]/.test(trimmed) || !/^[{[]/.test(trimmed)) {
    return false
  }

  // Check for balanced braces/brackets
  let stack = 0
  let inString = false
  let escaped = false

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"' && !escaped) {
      inString = !inString
      continue
    }

    if (!inString) {
      if (char === '{' || char === '[') {
        stack++
      } else if (char === '}' || char === ']') {
        stack--
        if (stack < 0) return false
      }
    }
  }

  return stack === 0
}

// Extract text content for searching (no JSX)
const getExtensionTextValue = (ext: Extension): string => {
  if (ext.extension && ext.extension.length > 0) {
    // For nested extensions, concatenate all text values
    return ext.extension
      .map((nestedExt) => getExtensionTextValue(nestedExt))
      .join(' ')
  }

  // Handle different value types
  const value =
    ext.valueString ||
    ext.valueBoolean ||
    ext.valueInteger ||
    ext.valueDecimal ||
    ext.valueDate ||
    ext.valueDateTime ||
    ext.valueTime ||
    ext.valueCode ||
    ext.valueReference?.reference

  if (value === undefined || value === null) {
    return 'No value'
  }

  // Handle the case where value is literally "[object Object]" string
  if (typeof value === 'string' && value === '[object Object]') {
    return 'Complex object (details not available)'
  }

  // If it's already an object, stringify it
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  // If it's a string that looks like JSON, parse and re-stringify it
  if (typeof value === 'string' && isJsonString(value)) {
    try {
      const jsonValue = JSON.parse(value)
      return JSON.stringify(jsonValue, null, 2)
    } catch (e) {
      return value
    }
  }

  // Format date values
  if (ext.valueDate || ext.valueDateTime || ext.valueTime) {
    // TODO: Decide if we want to format dates here. If so this will need to be refactored.
    return String(value)
  }

  return String(value)
}

// Helper function to check if an extension contains JSON data
const isJsonExtension = (ext: Extension): boolean => {
  if (ext.extension && ext.extension.length > 0) {
    // For nested extensions, check if any nested extension is JSON
    return ext.extension.some((nestedExt) => isJsonExtension(nestedExt))
  }

  // Handle different value types - exactly matching renderExtensionValue logic
  const value =
    ext.valueString ||
    ext.valueBoolean ||
    ext.valueInteger ||
    ext.valueDecimal ||
    ext.valueDate ||
    ext.valueDateTime ||
    ext.valueTime ||
    ext.valueCode ||
    ext.valueReference?.reference

  if (value === undefined || value === null) {
    return false
  }

  // Handle the case where value is literally "[object Object]" string
  if (typeof value === 'string' && value === '[object Object]') {
    return false // This is not treated as JSON in renderExtensionValue
  }

  // If it's already an object, it's JSON (matches renderExtensionValue)
  if (typeof value === 'object') {
    return true
  }

  // If it's a string that looks like JSON, it's JSON (matches renderExtensionValue)
  if (typeof value === 'string' && isJsonString(value)) {
    return true
  }

  return false
}

// Helper function to sort extensions with JSON first
const sortExtensionsWithJsonFirst = (extensions: Extension[]): Extension[] => {
  return [...extensions].sort((a, b) => {
    const aIsJson = isJsonExtension(a)
    const bIsJson = isJsonExtension(b)

    if (aIsJson && !bIsJson) return -1 // a comes first
    if (!aIsJson && bIsJson) return 1 // b comes first
    return 0 // maintain original order within groups
  })
}

// Helper function to check if an extension matches the search criteria
const extensionMatchesSearch = (
  ext: Extension,
  searchTerm: string,
  searchMode: SearchMode,
): boolean => {
  const normalizedSearchTerm = searchTerm.toLowerCase().trim()
  const key = ext.url.split('/').pop() || ext.url
  const value = getExtensionTextValue(ext)

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
      return false
  }
}

// Helper function to recursively search through extensions
const searchExtensions = (
  extensions: Extension[],
  searchTerm: string,
  searchMode: SearchMode,
): Extension[] => {
  if (!searchTerm.trim()) return extensions

  return extensions.filter((ext) => {
    // Check if current extension matches
    const currentMatches = extensionMatchesSearch(ext, searchTerm, searchMode)

    // If current extension has nested extensions, search through them
    if (ext.extension && ext.extension.length > 0) {
      const nestedMatches = searchExtensions(
        ext.extension,
        searchTerm,
        searchMode,
      )
      // If any nested extension matches, include the parent
      if (nestedMatches.length > 0) {
        // Create a new extension object with only the matching nested extensions
        return {
          ...ext,
          extension: nestedMatches,
        }
      }
    }

    return currentMatches
  })
}

export function SearchableExtensionDetails({
  extensions,
  title = 'Additional Information',
  enableSearch = true,
}: SearchableExtensionDetailsProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('both')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  )
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { formatDateTime } = useDateTimeFormat()

  // Initialize all sections as expanded
  useEffect(() => {
    const initialExpanded = new Set(
      extensions.map((_, index) => `section-${index}`),
    )
    setExpandedSections(initialExpanded)
  }, [extensions])

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  if (!extensions || extensions.length === 0) return null

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

  // Filter extensions based on search using the new recursive search
  const filteredExtensions = searchExtensions(
    extensions,
    searchTerm,
    searchMode,
  )

  // Sort extensions with JSON first
  const sortedExtensions = sortExtensionsWithJsonFirst(filteredExtensions)

  const hasActiveSearch = searchTerm.trim().length > 0

  const renderExtensionValue = (
    ext: Extension,
    parentIndex?: number,
  ): React.ReactNode => {
    if (ext.extension && ext.extension.length > 0) {
      // Only render if there are filtered extensions
      const filteredNestedExtensions = ext.extension.filter((nestedExt) => {
        if (!searchTerm.trim()) return true
        return extensionMatchesSearch(nestedExt, searchTerm, searchMode)
      })

      if (filteredNestedExtensions.length === 0) {
        // If no nested extensions match, render the value directly
        return getExtensionTextValue(ext)
      }

      // Sort nested extensions with JSON first
      const sortedNestedExtensions = sortExtensionsWithJsonFirst(
        filteredNestedExtensions,
      )

      return (
        <div className="space-y-2">
          {sortedNestedExtensions.map(
            (nestedExt: Extension, nestedIndex: number) => {
              const shouldRenderAsKeyValue =
                !isJsonExtension(nestedExt) &&
                (!nestedExt.extension || nestedExt.extension.length === 0)

              if (shouldRenderAsKeyValue) {
                const nestedKey =
                  nestedExt.url.split('/').pop() || nestedExt.url
                const nestedValue = getExtensionTextValue(nestedExt)
                const isKeyLong = nestedKey.length > 30
                const isValueLong = String(nestedValue).length > 40

                if (!isKeyLong && !isValueLong) {
                  // One-line layout
                  return (
                    <div
                      key={`${parentIndex}-${nestedIndex}-${nestedExt.url}`}
                      className="flex items-start w-full space-x-2 text-sm"
                    >
                      <span
                        className="font-medium min-w-0 flex-shrink-0 truncate max-w-[40%] text-sm text-gray-500"
                        title={nestedKey}
                      >
                        {nestedKey}:
                      </span>
                      <span className="text-sm break-words whitespace-pre-wrap flex-1">
                        {nestedValue}
                      </span>
                    </div>
                  )
                }
                // Stacked layout
                return (
                  <div
                    key={`${parentIndex}-${nestedIndex}-${nestedExt.url}`}
                    className="flex flex-col w-full text-sm"
                  >
                    <span className="font-medium text-sm mb-0.5 text-gray-500">
                      {nestedKey}:
                    </span>
                    <span className="text-sm break-words whitespace-pre-wrap pl-2">
                      {nestedValue}
                    </span>
                  </div>
                )
              }

              // Use the original layout for JSON objects and nested extensions
              return (
                <div
                  key={`${parentIndex}-${nestedIndex}-${nestedExt.url}`}
                  className="flex flex-col w-full text-sm"
                >
                  {' '}
                  {/* bg-gray-50 p-3 rounded */}
                  <div
                    className="text-sm font-medium text-gray-500"
                    title={`FHIR Path: extension${parentIndex !== undefined ? `[${parentIndex}]` : ''}.extension[${nestedIndex}]`}
                  >
                    {nestedExt.url.split('/').pop() || nestedExt.url}:
                  </div>
                  <div className="text-sm">
                    {renderExtensionValue(nestedExt, nestedIndex)}
                  </div>
                </div>
              )
            },
          )}
        </div>
      )
    }

    // Handle different value types
    const value =
      ext.valueString ||
      ext.valueBoolean ||
      ext.valueInteger ||
      ext.valueDecimal ||
      ext.valueDate ||
      ext.valueDateTime ||
      ext.valueTime ||
      ext.valueCode ||
      ext.valueReference?.reference

    if (value === undefined || value === null) {
      return 'No value'
    }

    // Handle the case where value is literally "[object Object]" string
    if (typeof value === 'string' && value === '[object Object]') {
      return (
        <div className="text-gray-500 italic">
          Complex object (details not available)
        </div>
      )
    }

    // If it's already an object, use appropriate JSON viewer
    if (typeof value === 'object') {
      const hasActiveSearch = searchTerm.trim().length > 0
      const isJson = isJsonExtension(ext)
      const useEnhancedHighlighting = isFeatureEnabled(
        'USE_ENHANCED_JSON_SEARCH_HIGHLIGHTING',
      )

      // Use enhanced JSON viewer with search highlighting
      const JsonViewerComponent = isFeatureEnabled('USE_SIMPLIFIED_JSON_VIEWER')
        ? SimplifiedJsonViewer
        : JsonViewer
      return (
        <JsonViewerComponent
          data={value}
          title="a"
          className="mt-0"
          isExpanded={false}
          searchTerm={
            hasActiveSearch && isJson && useEnhancedHighlighting
              ? searchTerm
              : undefined
          }
          searchMode={
            hasActiveSearch && isJson && useEnhancedHighlighting
              ? searchMode
              : undefined
          }
          highlightMatches={
            hasActiveSearch && isJson && useEnhancedHighlighting
          }
          autoCollapse={hasActiveSearch && isJson && useEnhancedHighlighting}
        />
      )
    }

    // If it's a string that looks like JSON, use appropriate JSON viewer
    if (typeof value === 'string' && isJsonString(value)) {
      const hasActiveSearch = searchTerm.trim().length > 0
      const isJson = isJsonExtension(ext)
      const useEnhancedHighlighting = isFeatureEnabled(
        'USE_ENHANCED_JSON_SEARCH_HIGHLIGHTING',
      )

      // Use enhanced JSON viewer with search highlighting
      const JsonViewerComponent = isFeatureEnabled('USE_SIMPLIFIED_JSON_VIEWER')
        ? SimplifiedJsonViewer
        : JsonViewer
      return (
        <JsonViewerComponent
          data={value}
          title=" "
          className="mt-0"
          isExpanded={false}
          searchTerm={
            hasActiveSearch && isJson && useEnhancedHighlighting
              ? searchTerm
              : undefined
          }
          searchMode={
            hasActiveSearch && isJson && useEnhancedHighlighting
              ? searchMode
              : undefined
          }
          highlightMatches={
            hasActiveSearch && isJson && useEnhancedHighlighting
          }
          autoCollapse={hasActiveSearch && isJson && useEnhancedHighlighting}
        />
      )
    }

    // Format date values
    if (ext.valueDate || ext.valueDateTime || ext.valueTime) {
      return formatDateTime(String(value))
    }

    return String(value)
  }

  return (
    <div>
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
                {sortedExtensions.length === 0
                  ? `No results found for "${searchTerm}"`
                  : `Showing ${sortedExtensions.length} of ${extensions.length} results`}
              </span>
              {sortedExtensions.length > 0 && (
                <span className="text-blue-600">
                  Searching in {SEARCH_MODE_LABELS[searchMode].toLowerCase()}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {sortedExtensions.map((ext, index) => {
          const sectionId = `section-${index}`
          const isExpanded = expandedSections.has(sectionId)

          return (
            <div key={`${index}-${ext.url}`} className="bg-gray-50 p-3 rounded">
              <button
                type="button"
                onClick={() => toggleSection(sectionId)}
                className="w-full flex items-center gap-2 text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
                <div
                  className="text-xs font-medium text-gray-500"
                  title={`FHIR Path: extension[${index}]`}
                >
                  {ext.url.split('/').pop() || ext.url}
                </div>
              </button>
              {isExpanded && (
                <div className="mt-2">{renderExtensionValue(ext, index)}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
