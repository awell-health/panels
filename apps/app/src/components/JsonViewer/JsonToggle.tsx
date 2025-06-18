'use client';

import type { JsonToggleProps } from './types';
import { cn } from '@/lib/utils';

export function JsonToggle({ mode, onChange, className }: JsonToggleProps) {
    return (
        <div className={cn('flex items-center space-x-2', className)}>
            <button
                type="button"
                onClick={() => onChange('view')}
                className={cn(
                    'px-2 py-1 text-xs rounded-l border border-gray-200',
                    mode === 'view'
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                )}
                aria-label="Switch to view mode"
            >
                View
            </button>
            <button
                type="button"
                onClick={() => onChange('json')}
                className={cn(
                    'px-2 py-1 text-xs rounded-r border border-gray-200',
                    mode === 'json'
                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                )}
                aria-label="Switch to JSON mode"
            >
                JSON
            </button>
        </div>
    );
} 