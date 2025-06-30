'use client'

import { BaseCell } from './BaseCell'
import type { BaseCellProps } from './types'

export function ArrayCell(props: BaseCellProps) {
  const { value, rowIndex, columnIndex } = props

  return (
    <BaseCell {...props}>
      <div className="flex flex-wrap gap-1">
        {Array.isArray(value) ? (
          value.map((item: unknown, index: number) => {
            const itemKey =
              typeof item === 'object' ? JSON.stringify(item) : String(item)
            return (
              <span
                key={`${rowIndex}-${columnIndex}-${itemKey}`}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
              >
                {typeof item === 'object'
                  ? Object.values(item as Record<string, unknown>).join(', ')
                  : String(item)}
              </span>
            )
          })
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </div>
    </BaseCell>
  )
}
