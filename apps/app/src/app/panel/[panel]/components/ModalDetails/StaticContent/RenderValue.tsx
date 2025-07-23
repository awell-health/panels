import type { FC } from 'react'
import { RenderWithCopy } from './RenderWithCopy'
import HighlightText from './HighlightContent'
import ExpandableCard from './ExpandableCard'
import { hasSearchQuery, isISODate, isJSON } from './utils'
import { isObject } from 'lodash'
import { useDateTimeFormat } from '../../../../../../hooks/use-date-time-format'

interface Props {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  value: string | Record<string, any> | Array<Record<string, any>>
  searchQuery?: string
}

const RenderValue: FC<Props> = ({ value, searchQuery = '' }) => {
  const emptyValue = <span>-</span>

  if (!value) {
    return emptyValue
  }

  const { formatDateTime } = useDateTimeFormat()

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
      return emptyValue
    }

    const renderKeyValue = (key: string, value: string) => {
      return (
        <div key={key}>
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

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const renderTable = (list: any[]) => {
    if (list.length === 0) {
      return <span className="pr-2">-</span>
    }

    const columns = Object.keys(list[0])

    return (
      <div className="overflow-x-auto w-full max-h-[500px] overflow-y-auto">
        <table className="table table-xs table-pin-rows table-zebra">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} className="text-xs">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((item, index) => (
              <tr key={`${item.id}-${index}`}>
                {columns.map((column) => (
                  <td key={column}>
                    <RenderValue
                      value={item[column]}
                      searchQuery={searchQuery}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (value === '[object Object]') {
    return 'unknown'
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return emptyValue
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

    // is array after parsing json
    if (Array.isArray(jsonValue)) {
      return renderTable(jsonValue)
    }

    if (jsonValueKeys.length === 0) {
      return <RenderValue value={jsonValue} searchQuery={searchQuery} />
    }

    return renderObjectValue(jsonValue)
  }

  if (value && isISODate(value as string)) {
    // Use formatDate for birth dates, formatDateTime for everything else
    const formattedValue = formatDateTime(value as string)
    return (
      <RenderWithCopy text={formattedValue}>
        <HighlightText text={formattedValue} searchQuery={searchQuery} />
      </RenderWithCopy>
    )
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
        className="text-xs"
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
