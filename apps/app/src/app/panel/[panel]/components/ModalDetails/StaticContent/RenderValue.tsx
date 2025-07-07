import type { FC } from 'react'
import { RenderWithCopy } from './RenderWithCopy'
import HighlightText from './HighlightContent'
import ExpandableCard from './ExpandableCard'
import { hasSearchQuery, isJSON } from './utils'
import { isObject } from 'lodash'

interface Props {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  value: string | Record<string, any> | Array<Record<string, any>>
  searchQuery?: string
}

const RenderValue: FC<Props> = ({ value, searchQuery = '' }) => {
  if (!value) {
    return '-'
  }

  const haseSearchTerm =
    searchQuery.length > 0 && hasSearchQuery(JSON.stringify(value), searchQuery)

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const rederArrayValue = (value: any[]) => {
    return (
      <div className="mb-4 mt-1">
        <ExpandableCard
          title={`Show ${value.length} items`}
          defaultExpanded={haseSearchTerm}
        >
          <div className="space-y-2">
            {value.map((item, index) => (
              <div key={`${item.id}-${index}`}>
                <RenderValue value={item} searchQuery={searchQuery} />
              </div>
            ))}
          </div>
        </ExpandableCard>
      </div>
    )
  }

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const renderObjectValue = (value: Record<string, any>) => {
    const keysLength = Object.keys(value).length
    const visibleObject = 5

    if (keysLength === 0) {
      return '-'
    }

    const renderKeyValue = (key: string, value: string) => {
      return (
        <div>
          <strong>
            <RenderWithCopy text={key}>
              <HighlightText text={key} searchQuery={searchQuery} />
            </RenderWithCopy>
          </strong>
          <RenderValue value={value} searchQuery={searchQuery} />
        </div>
      )
    }

    return (
      <div className="mb-4 mt-1 border-l pl-3 pb-2 border-b border-gray-200 space-y-2">
        {Object.keys(value)
          .slice(0, visibleObject)
          .map((key) => renderKeyValue(key, value[key]))}
        {keysLength > visibleObject && (
          <div className="mt-2">
            <ExpandableCard
              title={`Show ${keysLength - visibleObject} more items`}
              defaultExpanded={haseSearchTerm}
            >
              <div className="space-y-2 my-2">
                {Object.keys(value)
                  .slice(visibleObject)
                  .map((key) => renderKeyValue(key, value[key]))}
              </div>
            </ExpandableCard>
          </div>
        )}
      </div>
    )
  }

  if (value === '[object Object]') {
    return 'unknown'
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '-'
    }

    return rederArrayValue(value)
  }

  if (isObject(value)) {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    return renderObjectValue(value as Record<string, any>)
  }

  if (isJSON(value as string)) {
    const jsonValue = JSON.parse(value as string)
    const jsonValueKeys = Object.keys(jsonValue)

    if (jsonValueKeys.length === 0) {
      return <RenderValue value={jsonValue} searchQuery={searchQuery} />
    }

    return renderObjectValue(jsonValue)
  }

  const containsHTML = (str: string) => /<[a-z][\s\S]*>/i.test(str)

  if (containsHTML(value as string)) {
    let htmlContent = value?.replaceAll('\n', '<br />') ?? ''

    if (searchQuery) {
      htmlContent = htmlContent.replaceAll(
        searchQuery,
        `<span class="bg-yellow-200">${searchQuery}</span>`,
      )
    }

    return (
      <div
        className="text-sm "
        // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
        dangerouslySetInnerHTML={{
          __html: htmlContent,
        }}
      />
    )
  }

  return (
    <RenderWithCopy text={value}>
      {value && <HighlightText text={value} searchQuery={searchQuery} />}
    </RenderWithCopy>
  )
}

export default RenderValue
