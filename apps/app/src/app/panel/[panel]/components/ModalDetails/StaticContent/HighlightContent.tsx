import { isString } from 'lodash'
import { Fragment } from 'react'
import { handleError } from './utils'

const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const HighlightText = ({
  text,
  searchQuery,
}: { text: string | undefined; searchQuery: string }) => {
  const shouldHighlight = text && searchQuery.length > 2

  if (shouldHighlight && isString(text)) {
    try {
      const escapedQuery = escapeRegExp(searchQuery)
      const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'))
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
    } catch (error) {
      handleError(error, 'HighlightText.regexSplit')
      return text
    }
  }

  return text
}

export default HighlightText
