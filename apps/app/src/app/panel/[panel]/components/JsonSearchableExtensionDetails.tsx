"use client"

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import type { Extension } from "@medplum/fhirtypes"
import { EnhancedJsonViewer } from '@/components/EnhancedJsonViewer'
import { isFeatureEnabled } from '@/utils/featureFlags'

interface JsonSearchableExtensionDetailsProps {
    extensions: Extension[]
    title?: string
    enableSearch?: boolean
}

type SearchMode = 'all' | 'keys' | 'values'

interface SearchResult {
    extension: Extension
    filteredData: unknown
    matchCount: number
    hasExtensionLevelMatch: boolean
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

// Helper function to get clean label from URL
function getCleanLabel(url: string): string {
    const parts = url.split('/')
    return parts[parts.length - 1] || url
}

// Helper to extract the value from an Extension
function getExtensionValue(ext: Extension): unknown {
    const valueKey = Object.keys(ext).find((k) => k.startsWith('value') && k !== 'valueSet');
    // @ts-ignore
    return valueKey ? ext[valueKey] : '';
}

// Helper function to get text representation of extension value for searching
function getExtensionTextValue(ext: Extension): string {
    if (ext.extension && ext.extension.length > 0) {
        // For nested extensions, concatenate all text values
        return ext.extension.map(nestedExt => getExtensionTextValue(nestedExt)).join(' ')
    }

    const value = getExtensionValue(ext)

    if (value === undefined || value === null) {
        return 'No value'
    }

    // If it's already an object, stringify it
    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2)
    }

    return String(value)
}

// Helper function to check if an extension matches the search criteria at extension level
function extensionMatchesSearch(ext: Extension, searchTerm: string, searchMode: SearchMode): boolean {
    if (!searchTerm.trim()) return true

    const searchLower = searchTerm.toLowerCase()
    const key = ext.url.split('/').pop() || ext.url
    const value = getExtensionTextValue(ext)

    switch (searchMode) {
        case 'keys':
            return key.toLowerCase().includes(searchLower)
        case 'values':
            return value.toLowerCase().includes(searchLower)
        default:
            return key.toLowerCase().includes(searchLower) || value.toLowerCase().includes(searchLower)
    }
}

// Enhanced function to filter JSON content based on search criteria
function filterJsonContent(
    obj: unknown,
    searchTerm: string,
    searchMode: SearchMode,
    path = ''
): { matches: boolean; matchCount: number; filteredData: unknown } {
    const searchLower = searchTerm.toLowerCase()
    let matchCount = 0
    let hasMatches = false

    if (typeof obj === 'string') {
        const matches = searchMode === 'keys' ? false : obj.toLowerCase().includes(searchLower)
        if (matches) {
            matchCount = 1
            hasMatches = true
        }
        return { matches: hasMatches, matchCount, filteredData: hasMatches ? obj : null }
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
        const matches = searchMode === 'keys' ? false : String(obj).toLowerCase().includes(searchLower)
        if (matches) {
            matchCount = 1
            hasMatches = true
        }
        return { matches: hasMatches, matchCount, filteredData: hasMatches ? obj : null }
    }

    if (Array.isArray(obj)) {
        const filteredArray: unknown[] = []
        let totalMatchCount = 0

        for (let i = 0; i < obj.length; i++) {
            const result = filterJsonContent(obj[i], searchTerm, searchMode, `${path}[${i}]`)

            if (result.matches) {
                filteredArray.push(result.filteredData)
                totalMatchCount += result.matchCount
                hasMatches = true
            }
        }

        return {
            matches: hasMatches,
            matchCount: totalMatchCount,
            filteredData: hasMatches ? filteredArray : null
        }
    }

    if (typeof obj === 'object' && obj !== null) {
        const filteredObj: Record<string, unknown> = {}
        let totalMatchCount = 0

        for (const [key, value] of Object.entries(obj)) {
            const keyMatches = searchMode === 'values' ? false : key.toLowerCase().includes(searchLower)
            const valueResult = filterJsonContent(value, searchTerm, searchMode, path ? `${path}.${key}` : key)

            if (keyMatches || valueResult.matches) {
                // If key matches, include the full value
                // If value matches, include the filtered value
                filteredObj[key] = keyMatches ? value : valueResult.filteredData
                totalMatchCount += (keyMatches ? 1 : 0) + valueResult.matchCount
                hasMatches = true
            }
        }

        return {
            matches: hasMatches,
            matchCount: totalMatchCount,
            filteredData: hasMatches ? filteredObj : null
        }
    }

    return { matches: false, matchCount: 0, filteredData: null }
}

// Enhanced search through extensions with JSON content filtering
function searchExtensionsWithJsonFilter(
    extensions: Extension[],
    searchTerm: string,
    searchMode: SearchMode
): SearchResult[] {
    // If no search term, return empty array (don't show anything)
    if (!searchTerm.trim()) {
        return []
    }

    const results: SearchResult[] = []

    for (const ext of extensions) {
        const hasExtensionLevelMatch = extensionMatchesSearch(ext, searchTerm, searchMode)
        const parsedData = parseJsonRecursively(ext)
        const jsonFilterResult = filterJsonContent(parsedData, searchTerm, searchMode)

        // Only include if there are actual matches (either extension level or JSON content)
        if (hasExtensionLevelMatch || jsonFilterResult.matches) {
            let finalData: unknown
            let finalMatchCount: number

            if (jsonFilterResult.matches) {
                // Use filtered JSON content
                finalData = jsonFilterResult.filteredData
                finalMatchCount = jsonFilterResult.matchCount
            } else {
                // Extension level matches but no JSON content matches - show full data
                finalData = parsedData
                finalMatchCount = 0
            }

            results.push({
                extension: ext,
                filteredData: finalData,
                matchCount: finalMatchCount,
                hasExtensionLevelMatch
            })
        }

        // Check nested extensions but don't add them to the same level
        // Instead, process them separately if needed
        if (ext.extension && ext.extension.length > 0) {
            // For now, we'll handle nested extensions by including them in the parent
            // This prevents the flat structure issue
        }
    }

    return results
}

export function JsonSearchableExtensionDetails({
    extensions,
    title = 'Extensions',
    enableSearch = true,
}: JsonSearchableExtensionDetailsProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [searchMode, setSearchMode] = useState<SearchMode>('all')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    const hasActiveSearch = searchTerm.trim().length > 0

    // Show all extensions when no search, filtered results when searching
    const searchResults = hasActiveSearch
        ? searchExtensionsWithJsonFilter(extensions, searchTerm, searchMode)
        : extensions.map(ext => ({
            extension: ext,
            filteredData: parseJsonRecursively(ext),
            matchCount: 0,
            hasExtensionLevelMatch: false
        }))

    const totalMatchCount = searchResults.reduce((sum, result) => sum + result.matchCount, 0)
    const uniqueExtensions = searchResults.length

    return (
        <div className="space-y-2">
            {enableSearch && (
                <div className="relative">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search extensions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                {searchMode === 'all' && 'All'}
                                {searchMode === 'keys' && 'Keys'}
                                {searchMode === 'values' && 'Values'}
                            </button>
                            {isDropdownOpen && (
                                <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-md border border-gray-200 bg-white shadow-lg">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchMode('all')
                                            setIsDropdownOpen(false)
                                        }}
                                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchMode('keys')
                                            setIsDropdownOpen(false)
                                        }}
                                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        Keys
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchMode('values')
                                            setIsDropdownOpen(false)
                                        }}
                                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        Values
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    {hasActiveSearch && (
                        <div className="mt-1 text-xs text-gray-500">
                            {totalMatchCount > 0 ? (
                                <>
                                    Found {totalMatchCount} {totalMatchCount === 1 ? 'property' : 'properties'}
                                    in {uniqueExtensions} {uniqueExtensions === 1 ? 'extension' : 'extensions'}
                                </>
                            ) : (
                                `No results found for "${searchTerm}"`
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-4">
                {searchResults.map((result) => {
                    const cleanLabel = getCleanLabel(result.extension.url)

                    return (
                        <div key={result.extension.url} className="rounded-md border border-gray-200 p-3">
                            <div className="mb-2">
                                <h4 className="text-sm font-medium text-gray-900">{cleanLabel}</h4>
                                <p className="text-xs text-gray-500">{result.extension.url}</p>
                                {hasActiveSearch && result.matchCount > 0 && (
                                    <p className="text-xs text-blue-600 mt-1">
                                        {result.matchCount} {result.matchCount === 1 ? 'property' : 'properties'} matched
                                    </p>
                                )}
                                {hasActiveSearch && result.hasExtensionLevelMatch && result.matchCount === 0 && (
                                    <p className="text-xs text-green-600 mt-1">
                                        Extension name matched
                                    </p>
                                )}
                            </div>
                            <EnhancedJsonViewer
                                data={result.filteredData as string | object}
                                isExpanded={true}
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    )
} 