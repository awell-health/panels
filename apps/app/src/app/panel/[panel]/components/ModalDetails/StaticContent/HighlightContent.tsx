import { isString } from 'lodash'
import { Fragment } from 'react'

const HighlightText = ({
  text,
  searchQuery,
}: { text: string | undefined; searchQuery: string }) => {
  const shouldHighlight = text && searchQuery.length > 2

  if (shouldHighlight && isString(text)) {
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'))
    return parts.map((part, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
      <Fragment key={`${part}-${index}`}>
        {part.toLowerCase() === searchQuery.toLowerCase() ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
          <span key={`${part}-${index}`} className="bg-yellow-200">
            {part}
          </span>
        ) : (
          part
        )}
      </Fragment>
    ))
  }

  return text
}

export default HighlightText
