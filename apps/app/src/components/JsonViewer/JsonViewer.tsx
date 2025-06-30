'use client'

import type { JsonViewerProps, JsonViewerMode } from './types'
import { cn } from '@/lib/utils'
import { JsonToggle } from './JsonToggle'
import { JsonViewMode } from './JsonViewMode'
import { JsonRawMode } from './JsonRawMode'
import { useState, useEffect } from 'react'

export function JsonViewer({
  data,
  title,
  defaultMode = 'view',
  onModeChange,
  className,
  isExpanded = true,
  // Search highlighting props
  searchTerm,
  searchMode = 'both',
  highlightMatches = false,
  autoCollapse = false,
}: JsonViewerProps) {
  const [mode, setMode] = useState<JsonViewerMode>(defaultMode)
  const [parsedData, setParsedData] = useState<object | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data
      setParsedData(parsed)
      setError(null)
    } catch (err) {
      setError('Invalid JSON data')
      setParsedData(null)
    }
  }, [data])

  const handleModeChange = (newMode: JsonViewerMode) => {
    setMode(newMode)
    onModeChange?.(newMode)
  }

  if (error) {
    return (
      <div
        className={cn('p-4 bg-red-50 text-red-600 rounded text-sm', className)}
      >
        {error}
      </div>
    )
  }

  if (!parsedData) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        {title && (
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        )}
        <JsonToggle mode={mode} onChange={handleModeChange} />
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {mode === 'view' ? (
          <div className="p-4">
            <JsonViewMode
              data={parsedData}
              isExpanded={isExpanded}
              searchTerm={searchTerm}
              searchMode={searchMode}
              highlightMatches={highlightMatches}
              autoCollapse={autoCollapse}
            />
          </div>
        ) : (
          <JsonRawMode
            data={parsedData}
            searchTerm={searchTerm}
            searchMode={searchMode}
            highlightMatches={highlightMatches}
          />
        )}
      </div>
    </div>
  )
}
