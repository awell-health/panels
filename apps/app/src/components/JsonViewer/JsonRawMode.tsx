'use client';

import type { JsonRawModeProps } from './types';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function JsonRawMode({ data, className }: JsonRawModeProps) {
    const [copied, setCopied] = useState(false);
    const jsonString = JSON.stringify(data, null, 2);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(jsonString);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy JSON:', err);
        }
    };

    return (
        <div className={cn('relative', className)}>
            <button
                type="button"
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100"
                aria-label="Copy JSON to clipboard"
            >
                {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                ) : (
                    <Copy className="h-4 w-4" />
                )}
            </button>
            <pre className="p-4 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                <code>{jsonString}</code>
            </pre>
        </div>
    );
} 