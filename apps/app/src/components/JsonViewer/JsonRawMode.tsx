'use client'

import type { JsonRawModeProps } from './types'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

// Helper function to highlight text with search term
const highlightText = (
  text: string,
  searchTerm: string,
  type: 'key' | 'value' | 'both',
): React.ReactNode => {
  if (!searchTerm.trim()) {
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
      <span className="bg-yellow-200 text-yellow-900 px-1 rounded">
        {match}
      </span>
      {after}
    </span>
  )
}

export function JsonRawMode({
  data,
  className,
  searchTerm,
  searchMode = 'both',
  highlightMatches = false,
}: JsonRawModeProps) {
  const [copied, setCopied] = useState(false)
  const jsonString = JSON.stringify(data, null, 2)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy JSON:', err)
    }
  }

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
        <code>
          {highlightMatches && searchTerm
            ? highlightText(jsonString, searchTerm, searchMode)
            : jsonString}
        </code>
      </pre>
    </div>
  )
}
