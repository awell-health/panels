'use client'

import type {
  JsonViewModeProps,
  JsonValue,
  JsonObject,
  JsonArray,
} from './types'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import {
  findSearchMatches,
  pathContainsMatches,
  shouldAutoExpand,
} from './search-utils'

function formatValue(value: JsonValue): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value.toString()
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return `Array(${value.length})`
  return `Object(${Object.keys(value as JsonObject).length})`
}

// Helper function to highlight text with search term
const highlightText = (
  text: string,
  searchTerm: string,
  type: 'key' | 'value' | 'both',
): React.ReactNode => {
  if (!searchTerm.trim() || type === 'key') {
    return <span>{text}</span>
  }

  const normalizedSearchTerm = searchTerm.toLowerCase().trim()
  const normalizedText = text.toLowerCase()
  const index = normalizedText.indexOf(normalizedSearchTerm)

  if (index === -1) {
    return <span>{text}</span>
  }

  const before = text.slice(0, index)
  const match = text.slice(index, index + searchTerm.length)
  const after = text.slice(index + searchTerm.length)

  return (
    <span>
      {before}
      <span className="bg-green-100 text-green-800 px-1 rounded">{match}</span>
      {after}
    </span>
  )
}

// Helper function to get highlight classes for keys
const getKeyHighlightClasses = (
  key: string,
  searchTerm: string,
  searchMode: 'key' | 'value' | 'both',
): string => {
  if (!searchTerm.trim() || searchMode === 'value') {
    return ''
  }

  const normalizedSearchTerm = searchTerm.toLowerCase().trim()
  const normalizedKey = key.toLowerCase()

  if (normalizedKey.includes(normalizedSearchTerm)) {
    return 'bg-blue-100 text-blue-800 px-1 rounded'
  }

  return ''
}

export function SimplifiedJsonViewMode({
  data,
  level = 0,
  isExpanded = true,
  onToggle,
  // Search highlighting props
  searchTerm,
  searchMode = 'both',
  highlightMatches = false,
  autoCollapse = false,
  path = [],
}: JsonViewModeProps) {
  const [expanded, setExpanded] = useState(isExpanded)
  const [hasBeenManuallyToggled, setHasBeenManuallyToggled] = useState(false)

  const isObject =
    typeof data === 'object' && data !== null && !Array.isArray(data)
  const isArray = Array.isArray(data)

  // Memoize matches calculation to prevent infinite loops
  const matches = useMemo(() => {
    if (!highlightMatches || !searchTerm?.trim()) {
      return []
    }
    return findSearchMatches(data, searchTerm, searchMode, path)
  }, [data, searchTerm, searchMode, highlightMatches, path])

  // Auto-expand/collapse based on search matches - only run when necessary
  useEffect(() => {
    if (
      highlightMatches &&
      searchTerm &&
      autoCollapse &&
      !hasBeenManuallyToggled
    ) {
      const shouldExpand = shouldAutoExpand(path, matches, autoCollapse)
      if (shouldExpand !== expanded) {
        setExpanded(shouldExpand)
      }
    }
  }, [
    matches,
    searchTerm,
    highlightMatches,
    autoCollapse,
    path,
    expanded,
    hasBeenManuallyToggled,
  ])

  const handleToggle = () => {
    setExpanded(!expanded)
    setHasBeenManuallyToggled(true)
    onToggle?.()
  }

  if (!isObject && !isArray) {
    const valueStr = formatValue(data as JsonValue)
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm">
          {highlightMatches && searchTerm
            ? highlightText(valueStr, searchTerm, searchMode)
            : valueStr}
        </span>
      </div>
    )
  }

  const items = isArray ? data : Object.entries(data as JsonObject)
  const hasMatches = pathContainsMatches(path, matches)

  return (
    <div className={cn('space-y-1', level > 0 && 'pl-4')}>
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center space-x-2 text-sm hover:bg-gray-50 rounded px-1 py-0.5 w-full text-left"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-gray-500" />
        ) : (
          <ChevronRight className="h-3 w-3 text-gray-500" />
        )}
        <span className="font-medium">
          {isArray ? `Array(${items.length})` : `Object(${items.length})`}
        </span>
        {hasMatches && highlightMatches && searchTerm && (
          <span className="text-xs bg-green-100 text-green-800 px-1 rounded">
            has matches
          </span>
        )}
      </button>

      {expanded && (
        <div className="space-y-1">
          {items.map((item, index) => {
            const [key, value] = isArray ? [index, item] : item
            // Calculate path directly to avoid Rules of Hooks violation
            const currentPath = [...path, key.toString()]
            const keyMatches = getKeyHighlightClasses(
              key.toString(),
              searchTerm || '',
              searchMode,
            )

            return (
              <div key={key} className="flex items-start space-x-2">
                <div className="flex items-center space-x-1 text-gray-500">
                  <span className={cn('text-sm', keyMatches)}>
                    {highlightMatches && searchTerm
                      ? highlightText(key.toString(), searchTerm, searchMode)
                      : key}
                    :
                  </span>
                </div>
                <div className="flex-1">
                  {typeof value === 'object' && value !== null ? (
                    <SimplifiedJsonViewMode
                      data={value as JsonObject | JsonArray}
                      level={level + 1}
                      isExpanded={false}
                      searchTerm={searchTerm}
                      searchMode={searchMode}
                      highlightMatches={highlightMatches}
                      autoCollapse={autoCollapse}
                      path={currentPath}
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">
                        {highlightMatches && searchTerm
                          ? highlightText(
                              formatValue(value as JsonValue),
                              searchTerm,
                              searchMode,
                            )
                          : formatValue(value as JsonValue)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
