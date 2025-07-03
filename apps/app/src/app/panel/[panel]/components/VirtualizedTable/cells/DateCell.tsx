'use client'

import { useDateTimeFormat } from '@/hooks/use-date-time-format'
import { BaseCell } from './BaseCell'
import type { BaseCellProps } from './types'

export function DateCell(props: BaseCellProps) {
  const { formatDateIgnoringTimeZone } = useDateTimeFormat()
  const { value } = props

  return (
    <BaseCell {...props}>
      {value ? (
        formatDateIgnoringTimeZone(value as string | Date)
      ) : (
        <span className="text-gray-500">-</span>
      )}
    </BaseCell>
  )
}
