import type React from 'react'
import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { HighlightedJsonProps } from './types'
import {
    findSearchMatches,
    pathContainsMatches,
    pathHasDirectMatches,
    getMatchesForPath,
    shouldAutoExpand,
    highlightText,
    getHighlightClasses
} from './search-utils'

export const HighlightedJsonViewer: React.FC<HighlightedJsonProps> = ({
    data,
    searchTerm = '',
    searchMode = 'both',
    highlightMatches = false,
    autoCollapse = false,
    className = '',
    isExpanded: initialExpanded = false,
    onToggle,
    level = 0,
    path = []
}) => {
    const [isExpanded, setIsExpanded] = useState(initialExpanded)
    const [matches, setMatches] = useState<ReturnType<typeof findSearchMatches>>([])
    const hasBeenManuallyToggled = useRef(false)

    // Find matches when search term or data changes
    useEffect(() => {
        if (highlightMatches && searchTerm) {
            const foundMatches = findSearchMatches(data, searchTerm, searchMode, path)
            setMatches(foundMatches)
        } else {
            setMatches([])
        }
    }, [data, searchTerm, searchMode, highlightMatches, path])

    // Auto-expand/collapse based on search matches
    useEffect(() => {
        if (highlightMatches && searchTerm && !hasBeenManuallyToggled.current) {
            const shouldExpand = shouldAutoExpand(path, matches, autoCollapse)
            setIsExpanded(shouldExpand)
        }
    }, [matches, searchTerm, highlightMatches, autoCollapse, path])

    const handleToggle = () => {
        const newExpanded = !isExpanded
        setIsExpanded(newExpanded)
        hasBeenManuallyToggled.current = true
        onToggle?.()
    }

    const renderValue = (value: unknown, currentPath: string[]): React.ReactNode => {
        if (value === null) {
            return <span className="text-gray-500">null</span>
        }

        if (typeof value === 'boolean') {
            return <span className="text-purple-600">{String(value)}</span>
        }

        if (typeof value === 'number') {
            return <span className="text-blue-600">{value}</span>
        }

        if (typeof value === 'string') {
            const { isHighlighted } = highlightText(value, searchTerm, searchMode)
            const highlightClasses = getHighlightClasses(searchMode, isHighlighted)

            return (
                <span className={`text-green-600 ${highlightClasses}`}>
                    "{value}"
                </span>
            )
        }

        if (Array.isArray(value)) {
            if (value.length === 0) {
                return <span className="text-gray-500">[]</span>
            }

            const hasMatches = pathContainsMatches(currentPath, matches)
            const shouldExpand = shouldAutoExpand(currentPath, matches, autoCollapse)
            const isExpanded = shouldExpand || !autoCollapse

            return (
                <div className="ml-4">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-0.5 hover:bg-gray-100 rounded"
                        >
                            {isExpanded ? (
                                <ChevronDown className="h-3 w-3 text-gray-500" />
                            ) : (
                                <ChevronRight className="h-3 w-3 text-gray-500" />
                            )}
                        </button>
                        <span className="text-gray-600">[</span>
                        {!isExpanded && (
                            <span className="text-gray-500 text-sm">
                                {value.length} item{value.length !== 1 ? 's' : ''}
                                {hasMatches && (
                                    <span className="ml-1 text-xs bg-green-100 text-green-800 px-1 rounded">
                                        has matches
                                    </span>
                                )}
                            </span>
                        )}
                        {!isExpanded && <span className="text-gray-600">]</span>}
                    </div>

                    {isExpanded && (
                        <div className="ml-4">
                            {value.map((item, index) => (
                                <div key={`${currentPath.join('.')}-${index}`} className="flex items-start gap-1">
                                    <span className="text-gray-500 text-xs w-4 text-right">{index}:</span>
                                    <div className="flex-1">
                                        {renderValue(item, [...currentPath, index.toString()])}
                                    </div>
                                </div>
                            ))}
                            <span className="text-gray-600">]</span>
                        </div>
                    )}
                </div>
            )
        }

        if (typeof value === 'object' && value !== null) {
            const entries = Object.entries(value)
            if (entries.length === 0) {
                return <span className="text-gray-500">{'{}'}</span>
            }

            const hasMatches = pathContainsMatches(currentPath, matches)
            const shouldExpand = shouldAutoExpand(currentPath, matches, autoCollapse)
            const isExpanded = shouldExpand || !autoCollapse

            return (
                <div className="ml-4">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-0.5 hover:bg-gray-100 rounded"
                        >
                            {isExpanded ? (
                                <ChevronDown className="h-3 w-3 text-gray-500" />
                            ) : (
                                <ChevronRight className="h-3 w-3 text-gray-500" />
                            )}
                        </button>
                        <span className="text-gray-600">{'{'}</span>
                        {!isExpanded && (
                            <span className="text-gray-500 text-sm">
                                {entries.length} propert{entries.length !== 1 ? 'ies' : 'y'}
                                {hasMatches && (
                                    <span className="ml-1 text-xs bg-green-100 text-green-800 px-1 rounded">
                                        has matches
                                    </span>
                                )}
                            </span>
                        )}
                        {!isExpanded && <span className="text-gray-600">{'}'}</span>}
                    </div>

                    {isExpanded && (
                        <div className="ml-4">
                            {entries.map(([key, val]) => {
                                const keyPath = [...currentPath, key]
                                const keyMatches = getMatchesForPath(keyPath, matches)
                                const { isHighlighted: keyHighlighted } = highlightText(key, searchTerm, searchMode)
                                const keyHighlightClasses = getHighlightClasses('key', keyHighlighted)

                                return (
                                    <div key={key} className="flex items-start gap-1">
                                        <span className={`text-blue-600 ${keyHighlightClasses}`}>
                                            "{key}":
                                        </span>
                                        <div className="flex-1">
                                            {renderValue(val, keyPath)}
                                        </div>
                                        {keyMatches.length > 0 && (
                                            <span className="text-xs bg-green-100 text-green-800 px-1 rounded ml-1">
                                                {keyMatches.length}
                                            </span>
                                        )}
                                    </div>
                                )
                            })}
                            <span className="text-gray-600">{'}'}</span>
                        </div>
                    )}
                </div>
            )
        }

        return <span className="text-gray-600">{String(value)}</span>
    }

    // For top-level component, wrap in a container
    if (level === 0) {
        return (
            <div className={`font-mono text-sm ${className}`}>
                {renderValue(data, path)}
            </div>
        )
    }

    // For nested components, render directly
    return <>{renderValue(data, path)}</>
} 