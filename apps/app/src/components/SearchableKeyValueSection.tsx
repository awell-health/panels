"use client"

import { type KeyValueItem, type SearchMode, useKeyValueSearch } from '@/hooks/useKeyValueSearch'
import { ChevronDown, Search } from 'lucide-react'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { JsonViewer } from './JsonViewer'

interface SearchableKeyValueSectionProps {
    title: string
    data: KeyValueItem[]
    className?: string
    enableSearch?: boolean // Feature flag for easy reversion
}

const SEARCH_MODE_LABELS = {
    key: 'Keys',
    value: 'Values',
    both: 'Both'
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

export function SearchableKeyValueSection({
    title,
    data,
    className = '',
    enableSearch = true
}: SearchableKeyValueSectionProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const {
        searchTerm,
        setSearchTerm,
        searchMode,
        setSearchMode,
        filteredData,
        totalCount,
        filteredCount,
        hasActiveSearch
    } = useKeyValueSearch({ data })

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const highlightMatch = (text: string, searchTerm: string): React.ReactElement => {
        if (!searchTerm || !enableSearch) {
            return <span>{text}</span>
        }

        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        const parts = text.split(regex)

        return (
            <span>
                {parts.map((part, index) => {
                    const keyId = `${text.slice(0, 10)}-${part}-${index}-${Date.now()}`
                    return regex.test(part) ? (
                        <mark key={keyId} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
                            {part}
                        </mark>
                    ) : (
                        <span key={keyId}>{part}</span>
                    )
                })}
            </span>
        )
    }

    const shouldHighlightKey = (searchMode === 'key' || searchMode === 'both')
    const shouldHighlightValue = (searchMode === 'value' || searchMode === 'both')

    return (
        <div className={className}>
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
                            <div className="absolute right-1 top-1/2 transform -translate-y-1/2" ref={dropdownRef}>
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
                                                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${searchMode === mode ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                                {filteredCount === 0
                                    ? 'No results found'
                                    : `Showing ${filteredCount} of ${totalCount} results`
                                }
                            </span>
                            {filteredCount > 0 && (
                                <span className="text-blue-600">
                                    Searching in {SEARCH_MODE_LABELS[searchMode].toLowerCase()}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs font-medium text-gray-500 mb-2">{title}</p>
                <div className="space-y-2">
                    {filteredData.length > 0 ? (
                        filteredData.map((item) => (
                            <div key={item.originalIndex} className="border-b border-gray-200 pb-2 last:border-0">
                                <p className="text-xs text-gray-500">
                                    {shouldHighlightKey ? highlightMatch(item.key, searchTerm) : item.key}
                                </p>
                                {typeof item.value === 'string' && isJsonString(item.value) ? (
                                    <JsonViewer
                                        data={item.value}
                                        title={item.key}
                                        className="mt-1"
                                    />
                                ) : (
                                    <p className="text-sm">
                                        {shouldHighlightValue ? highlightMatch(item.value.toString(), searchTerm) : item.value.toString()}
                                    </p>
                                )}
                            </div>
                        ))
                    ) : hasActiveSearch ? (
                        <p className="text-xs text-gray-500 text-center py-4">
                            No results found for "{searchTerm}"
                        </p>
                    ) : totalCount === 0 ? (
                        <p className="text-xs text-gray-500">No additional information available</p>
                    ) : (
                        <p className="text-xs text-gray-500 text-center py-4">
                            All {totalCount} items filtered out
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
} 