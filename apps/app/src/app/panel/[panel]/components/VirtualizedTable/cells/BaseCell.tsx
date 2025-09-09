'use client'

import { cn } from '@/lib/utils'
import { shouldTruncateContent } from '../constants'
import type { BaseCellProps } from './types'

export function BaseCell({
  value,
  column,
  style,
  className,
  children,
  columnWidth,
}: BaseCellProps & { children?: React.ReactNode }) {
  const getDisplayValue = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const displayValue = getDisplayValue(value)

  const truncationInfo = columnWidth
    ? shouldTruncateContent(displayValue, columnWidth)
    : { shouldTruncate: true, maxLength: 30 }

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text
    return `${text.substring(0, maxLength)}...`
  }

  const finalDisplayValue =
    truncationInfo.shouldTruncate && truncationInfo.maxLength
      ? truncateText(displayValue, truncationInfo.maxLength)
      : displayValue

  return (
    <div
      style={style}
      className={cn(
        'flex items-center px-2 text-xs overflow-hidden h-full',
        className,
      )}
      title={displayValue}
    >
      {children || <div className="flex-1">{finalDisplayValue}</div>}
    </div>
  )
}
