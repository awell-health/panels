'use client'

import { cn } from '@/lib/utils'
import type { BaseCellProps } from './types'

export function BaseCell({
  value,
  column,
  style,
  className,
  children,
}: BaseCellProps & { children?: React.ReactNode }) {
  const getDisplayValue = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const truncateText = (text: string, maxLength = 30): string => {
    if (text.length <= maxLength) return text
    return `${text.substring(0, maxLength)}...`
  }

  const displayValue = getDisplayValue(value)

  return (
    <div
      style={style}
      className={cn(
        'flex items-center px-2 text-xs overflow-hidden h-full',
        className,
      )}
      title={displayValue}
    >
      {children || (
        <div className="truncate flex-1">{truncateText(displayValue)}</div>
      )}
    </div>
  )
}
