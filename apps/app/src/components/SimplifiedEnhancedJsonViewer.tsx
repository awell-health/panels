"use client"

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
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

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray
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
                    return parsed.map(item => parseJsonRecursively(item))
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
        return value.map(item => parseJsonRecursively(item))
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

// Simplified JsonViewMode component
function SimplifiedJsonViewMode({ data, level = 0, isExpanded = true, onToggle }: { data: JsonValue; level?: number; isExpanded?: boolean; onToggle?: () => void }) {
    const [expanded, setExpanded] = useState(isExpanded)
    const isObject = typeof data === 'object' && data !== null && !Array.isArray(data)
    const isArray = Array.isArray(data)

    const handleToggle = () => {
        setExpanded(!expanded)
        onToggle?.()
    }

    if (!isObject && !isArray) {
        return (
            <div className="flex items-center">
                <span className="text-sm text-gray-700">{formatValue(data as JsonValue)}</span>
            </div>
        )
    }

    const itemCount = isArray ? (data as JsonArray).length : Object.keys(data as JsonObject).length

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
                <span className="font-medium text-gray-900">
                    {isArray ? `Array(${itemCount})` : `Object(${itemCount})`}
                </span>
            </button>

            {expanded && (
                <div className="space-y-1">
                    {isArray
                        ? (data as JsonArray).map((value, index) => (
                            <div key={`array-${index}-${JSON.stringify(value)}`} className="flex items-start space-x-2">
                                <div className="flex items-center">
                                    <span className="text-sm font-medium text-blue-600">{index}:</span>
                                </div>
                                <div className="flex-1">
                                    {typeof value === 'object' && value !== null ? (
                                        <SimplifiedJsonViewMode
                                            data={value}
                                            level={level + 1}
                                            isExpanded={false}
                                        />
                                    ) : (
                                        <div className="flex items-center">
                                            <span className="text-sm text-gray-700">{formatValue(value)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                        : Object.entries(data as JsonObject).map(([key, value]) => (
                            <div key={`object-${key}-${JSON.stringify(value)}`} className="flex items-start space-x-2">
                                <div className="flex items-center">
                                    <span className="text-sm font-medium text-blue-600">{key}:</span>
                                </div>
                                <div className="flex-1">
                                    {typeof value === 'object' && value !== null ? (
                                        <SimplifiedJsonViewMode
                                            data={value}
                                            level={level + 1}
                                            isExpanded={false}
                                        />
                                    ) : (
                                        <div className="flex items-center">
                                            <span className="text-sm text-gray-700">{formatValue(value)}</span>
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
function JsonRawMode({ data, className }: { data: object; className?: string }) {
    return (
        <pre className={cn('p-4 bg-gray-50 text-xs overflow-auto', className)}>
            {JSON.stringify(data, null, 2)}
        </pre>
    )
}

// Main SimplifiedEnhancedJsonViewer component
export function SimplifiedEnhancedJsonViewer({
    data,
    title,
    defaultMode = 'view',
    onModeChange,
    className,
    isExpanded = true,
}: EnhancedJsonViewerProps) {
    const [mode, setMode] = useState<JsonViewerMode>(defaultMode)
    const [parsedData, setParsedData] = useState<JsonObject | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        try {
            let parsed: object
            if (typeof data === 'string') {
                parsed = JSON.parse(data)
            } else {
                parsed = data
            }

            // Apply recursive parsing for enhanced functionality
            const enhancedParsed = parseJsonRecursively(parsed) as JsonObject
            setParsedData(enhancedParsed)
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
            <div className={cn('p-4 bg-red-50 text-red-600 rounded text-sm', className)}>
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
                {title && <h3 className="text-sm font-medium text-gray-700">{title}</h3>}
                <JsonToggle mode={mode} onChange={handleModeChange} />
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                {mode === 'view' ? (
                    <div className="p-4">
                        <SimplifiedJsonViewMode data={parsedData} isExpanded={isExpanded} />
                    </div>
                ) : (
                    <JsonRawMode data={parsedData} />
                )}
            </div>
        </div>
    )
} 