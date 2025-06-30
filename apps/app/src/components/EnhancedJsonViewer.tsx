'use client'

import { useState, useEffect } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Package,
  List,
  Key,
  Hash,
  FileText,
  Check,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { JsonToggle } from './JsonViewer/JsonToggle'

// Types
export type JsonViewerMode = 'view' | 'json'

export interface EnhancedJsonViewerProps {
  data: string | object
  title?: string
  defaultMode?: JsonViewerMode
  onModeChange?: (mode: JsonViewerMode) => void
  className?: string
  isExpanded?: boolean
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray
export interface JsonObject {
  [key: string]: JsonValue
}
export type JsonArray = JsonValue[]

// Helper function to check if a string is valid JSON
function isJsonString(value: string): boolean {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

// Helper function to parse JSON strings recursively
function parseJsonRecursively(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'object' && parsed !== null) {
        if (Array.isArray(parsed)) {
          return parsed.map((item) => parseJsonRecursively(item))
        }
        const result: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(parsed)) {
          result[key] = parseJsonRecursively(val)
        }
        return result
      }
      return parsed
    } catch {
      return value
    }
  }
  if (Array.isArray(value)) {
    return value.map((item) => parseJsonRecursively(item))
  }
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = parseJsonRecursively(val)
    }
    return result
  }
  return value
}

// Helper function to format the value for display
function formatValue(value: JsonValue): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value.toString()
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return `Array(${value.length})`
  return `Object(${Object.keys(value as JsonObject).length})`
}

// Helper function to get the icon for a value
function getValueIcon(value: JsonValue) {
  if (value === null) return <X className="h-3 w-3 text-gray-400" />
  if (typeof value === 'boolean')
    return <Check className="h-3 w-3 text-green-500" />
  if (typeof value === 'number')
    return <Hash className="h-3 w-3 text-blue-500" />
  if (typeof value === 'string')
    return <FileText className="h-3 w-3 text-purple-500" />
  if (Array.isArray(value)) return <List className="h-3 w-3 text-orange-500" />
  return <Package className="h-3 w-3 text-indigo-500" />
}

// JsonViewMode component
function JsonViewMode({
  data,
  level = 0,
  isExpanded = true,
  onToggle,
}: {
  data: JsonValue
  level?: number
  isExpanded?: boolean
  onToggle?: () => void
}) {
  const [expanded, setExpanded] = useState(isExpanded)
  const isObject =
    typeof data === 'object' && data !== null && !Array.isArray(data)
  const isArray = Array.isArray(data)

  const handleToggle = () => {
    setExpanded(!expanded)
    onToggle?.()
  }

  if (!isObject && !isArray) {
    return (
      <div className="flex items-center space-x-1">
        {getValueIcon(data as JsonValue)}
        <span className="text-sm">{formatValue(data as JsonValue)}</span>
      </div>
    )
  }

  const itemCount = isArray
    ? (data as JsonArray).length
    : Object.keys(data as JsonObject).length

  return (
    <div className={cn('space-y-1', level > 0 && 'pl-4')}>
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-0.5 text-sm hover:bg-gray-50 rounded px-1 py-0.5 w-full text-left"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-gray-500" />
        ) : (
          <ChevronRight className="h-3 w-3 text-gray-500" />
        )}
        {getValueIcon(data as JsonValue)}
        <span className="font-medium">
          {isArray ? `Array(${itemCount})` : `Object(${itemCount})`}
        </span>
      </button>

      {expanded && (
        <div className="space-y-1">
          {isArray
            ? (data as JsonArray).map((value, index) => (
                <div
                  key={`array-${index}-${JSON.stringify(value)}`}
                  className="flex items-start gap-0.5"
                >
                  <div className="flex items-center gap-0.5 text-gray-500">
                    <Key className="h-3 w-3" />
                    <span className="text-xs">{index}:</span>
                  </div>
                  <div className="flex-1">
                    {typeof value === 'object' && value !== null ? (
                      <JsonViewMode
                        data={value}
                        level={level + 1}
                        isExpanded={false}
                      />
                    ) : (
                      <div className="flex items-center gap-0.5">
                        {getValueIcon(value)}
                        <span className="text-sm">{formatValue(value)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            : Object.entries(data as JsonObject).map(([key, value]) => (
                <div
                  key={`object-${key}-${JSON.stringify(value)}`}
                  className="flex items-start gap-0.5"
                >
                  <div className="flex items-center gap-0.5 text-gray-500">
                    <Key className="h-3 w-3" />
                    <span className="text-xs">{key}:</span>
                  </div>
                  <div className="flex-1">
                    {typeof value === 'object' && value !== null ? (
                      <JsonViewMode
                        data={value}
                        level={level + 1}
                        isExpanded={false}
                      />
                    ) : (
                      <div className="flex items-center gap-0.5">
                        {getValueIcon(value)}
                        <span className="text-sm">{formatValue(value)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
        </div>
      )}
    </div>
  )
}

// JsonRawMode component
function JsonRawMode({
  data,
  className,
}: { data: object; className?: string }) {
  return (
    <pre className={cn('p-4 bg-gray-50 text-xs overflow-auto', className)}>
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

// Main EnhancedJsonViewer component
export function EnhancedJsonViewer({
  data,
  title,
  defaultMode = 'view',
  onModeChange,
  className,
  isExpanded = true,
}: EnhancedJsonViewerProps) {
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
              data={parsedData as JsonValue}
              isExpanded={isExpanded}
            />
          </div>
        ) : (
          <JsonRawMode data={parsedData} />
        )}
      </div>
    </div>
  )
}
