import type { FC } from 'react'
import HighlightText from './HighlightContent'
import RenderValue from './RenderValue'
import { createSearchFilter, isISODate, handleError } from './utils'
import { useDateTimeFormat } from '../../../../../../hooks/use-date-time-format'
import { RenderWithCopy } from './RenderWithCopy'

interface Props {
  label: string
  value: string | undefined
  searchQuery?: string
  fhirPath?: string
}

const CardRowItem: FC<Props> = ({
  label,
  value,
  searchQuery = '',
  fhirPath,
}) => {
  const { formatDate, formatDateTime } = useDateTimeFormat()

  if (searchQuery) {
    const searchFilter = createSearchFilter(searchQuery)
    if (!searchFilter.matchesAnyText(label, value)) {
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
      return value ?? ''
    }

    // Use date-only formatting for birth dates, datetime for everything else
    try {
      return isBirthDateField(label) ? formatDate(value) : formatDateTime(value)
    } catch (error) {
      handleError(error, 'CardRowItem.formatDate')
      return value
    }
  }

  const displayValue = getDisplayValue()

  return (
    <div className="flex justify-between">
      <div className="text-gray-600 max-w-[32%] break-words">
        <RenderWithCopy text={fhirPath ?? label}>
          <HighlightText text={label} searchQuery={searchQuery} />
        </RenderWithCopy>
      </div>
      <div className="text-gray-900 max-w-[65%] text-right pr-1.5 break-words">
        <RenderValue value={displayValue} searchQuery={searchQuery} />
      </div>
    </div>
  )
}

export default CardRowItem
