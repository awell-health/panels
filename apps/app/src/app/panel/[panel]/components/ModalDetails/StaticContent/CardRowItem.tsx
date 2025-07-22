import type { FC } from 'react'
import HighlightText from './HighlightContent'
import { RenderWithCopy } from './RenderWithCopy'
import RenderValue from './RenderValue'
import { hasSearchQuery, isISODate } from './utils'
import { useDateTimeFormat } from '../../../../../../hooks/use-date-time-format'

interface Props {
  label: string
  value: string | undefined
  searchQuery?: string
}

const CardRowItem: FC<Props> = ({ label, value, searchQuery = '' }) => {
  const { formatDate, formatDateTime } = useDateTimeFormat()

  if (searchQuery) {
    if (
      !hasSearchQuery(label, searchQuery) &&
      !hasSearchQuery(value ?? '', searchQuery)
    ) {
      return null
    }
  }

  // Check if this is a birth date field that should be formatted as date-only
  const isBirthDateField = (label: string): boolean => {
    const lowerLabel = label.toLowerCase()
    return (
      lowerLabel.includes('birth') ||
      lowerLabel.includes('dob') ||
      lowerLabel.includes('date of birth') ||
      lowerLabel.includes('born')
    )
  }

  // Format the value if it's a date and we know the context
  const getDisplayValue = (): string => {
    if (!value || !isISODate(value)) {
      return value || ''
    }

    // Use date-only formatting for birth dates, datetime for everything else
    return isBirthDateField(label) ? formatDate(value) : formatDateTime(value)
  }

  const displayValue = getDisplayValue()

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="font-medium text-gray-700">
        <HighlightText text={label} searchQuery={searchQuery} />
      </div>
      <div className="text-gray-900">
        <RenderValue value={displayValue} searchQuery={searchQuery} />
      </div>
    </div>
  )
}

export default CardRowItem
