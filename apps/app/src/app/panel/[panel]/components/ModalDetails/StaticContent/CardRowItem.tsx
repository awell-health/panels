import type { FC } from 'react'
import HighlightText from './HighlightContent'
import { RenderWithCopy } from './RenderWithCopy'

interface Props {
  label: string
  value: string | undefined
  searchQuery?: string
}

const CardRowItem: FC<Props> = ({ label, value, searchQuery = '' }) => {
  const renderValue = (val: string) => {
    const containsHTML = (str: string) => /<[a-z][\s\S]*>/i.test(str)

    if (containsHTML(value as string)) {
      return (
        <div
          className="text-sm "
          // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
          dangerouslySetInnerHTML={{
            __html: value?.replaceAll('\n', '<br />') ?? '',
          }}
        />
      )
    }

    return (
      <RenderWithCopy text={value}>
        <HighlightText text={value} searchQuery={searchQuery} />
      </RenderWithCopy>
    )
  }

  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}:</span>
      <span className="text-gray-900 font-normal max-w-[60%]">
        {value && renderValue(value)}
        {!value && <span className="text-gray-900 mr-4">-</span>}
      </span>
    </div>
  )
}

export default CardRowItem
