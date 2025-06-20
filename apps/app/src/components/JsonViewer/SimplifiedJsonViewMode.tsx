'use client';

import type { JsonViewModeProps, JsonValue, JsonObject, JsonArray } from './types';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

function formatValue(value: JsonValue): string {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return `Array(${value.length})`;
    return `Object(${Object.keys(value as JsonObject).length})`;
}

export function SimplifiedJsonViewMode({ data, level = 0, isExpanded = true, onToggle }: JsonViewModeProps) {
    const [expanded, setExpanded] = useState(isExpanded);
    const isObject = typeof data === 'object' && data !== null && !Array.isArray(data);
    const isArray = Array.isArray(data);

    const handleToggle = () => {
        setExpanded(!expanded);
        onToggle?.();
    };

    if (!isObject && !isArray) {
        return (
            <div className="flex items-center space-x-2">
                <span className="text-sm">{formatValue(data as JsonValue)}</span>
            </div>
        );
    }

    const items = isArray ? data : Object.entries(data as JsonObject);

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
            </button>

            {expanded && (
                <div className="space-y-1">
                    {items.map((item, index) => {
                        const [key, value] = isArray ? [index, item] : item;
                        return (
                            <div key={key} className="flex items-start space-x-2">
                                <div className="flex items-center space-x-1 text-gray-500">
                                    <span className="text-sm">{key}:</span>
                                </div>
                                <div className="flex-1">
                                    {typeof value === 'object' && value !== null ? (
                                        <SimplifiedJsonViewMode
                                            data={value as JsonObject | JsonArray}
                                            level={level + 1}
                                            isExpanded={false}
                                        />
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm">{formatValue(value as JsonValue)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
} 