import type { FC } from 'react'
import HighlightText from './HighlightContent'
import { RenderWithCopy } from './RenderWithCopy'
import RenderValue from './RenderValue'
import { hasSearchQuery } from './utils'

interface Props {
  label: string
  value: string | undefined
  searchQuery?: string
}

const CardRowItem: FC<Props> = ({ label, value, searchQuery = '' }) => {
  if (searchQuery) {
    if (
      !hasSearchQuery(label, searchQuery) &&
      !hasSearchQuery(value ?? '', searchQuery)
    ) {
      return null
    }
  }

  return (
    <div className="flex justify-between">
      <span className="text-gray-600">
        <HighlightText text={label} searchQuery={searchQuery} />
      </span>
      <span className="text-gray-900 font-normal max-w-[70%]">
        {value && <RenderValue value={value} searchQuery={searchQuery} />}
        {!value && <span className="text-gray-900 mr-4">-</span>}
      </span>
    </div>
  )
}

export default CardRowItem
