import type { FC } from 'react'
import { RenderWithCopy } from './RenderWithCopy'
import HighlightText from './HighlightContent'
import ExpandableCard from './ExpandableCard'
import { createSearchFilter, isISODate, isJSON, handleError } from './utils'
import { isObject } from 'lodash'
import { useDateTimeFormat } from '../../../../../../hooks/use-date-time-format'

// Type definitions for rendering values in the UI
export interface RenderableObject {
  [key: string]: RenderableValue
}

export type RenderableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | RenderableObject
  | RenderableValue[]

export interface TableRow {
  [key: string]: RenderableValue
  id?: string | number
}

interface Props {
  value: RenderableValue
  searchQuery?: string
}

const RenderValue: FC<Props> = ({ value, searchQuery = '' }) => {
  const emptyValue = <span>-</span>

  const { formatDateTime } = useDateTimeFormat()

  const searchFilter = createSearchFilter(searchQuery)
  const hasSearchTerm =
    searchQuery.length > 0 && searchFilter.matchesText(JSON.stringify(value))

  if (!value) {
    return emptyValue
  }

  const renderArrayValue = (value: RenderableValue[]) => {
    return (
      <div className="mb-4 mt-1">
        <ExpandableCard
          title={`Show ${value.length} items`}
          defaultExpanded={hasSearchTerm}
        >
          <div className="space-y-2">
            {value.map((item, index) => {
              const itemKey =
                item && typeof item === 'object' && 'id' in item
                  ? `${(item as { id: string | number }).id}-${index}`
                  : `item-${index}`
              return (
                <div key={itemKey}>
                  <RenderValue value={item} searchQuery={searchQuery} />
                </div>
              )
            })}
          </div>
        </ExpandableCard>
      </div>
    )
  }

  const renderObjectValue = (value: RenderableObject) => {
    if (!value || typeof value !== 'object') {
      return emptyValue
    }

    const keysLength = Object.keys(value).length
    const visibleObject = 5

    if (keysLength === 0) {
      return emptyValue
    }

    const renderKeyValue = (key: string, value: RenderableValue) => {
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
              defaultExpanded={hasSearchTerm}
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

  const renderTable = (list: TableRow[]) => {
    if (list.length === 0) {
      return <span className="pr-2">-</span>
    }

    if (!list[0] || typeof list[0] !== 'object') {
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

    return renderArrayValue(value)
  }

  if (isObject(value)) {
    return renderObjectValue(value)
  }

  if (isJSON(value as string)) {
    try {
      const jsonValue = JSON.parse(value as string)

      if (!jsonValue || typeof jsonValue !== 'object') {
        return <RenderValue value={jsonValue} searchQuery={searchQuery} />
      }

      const jsonValueKeys = Object.keys(jsonValue)

      // is array after parsing json
      if (Array.isArray(jsonValue)) {
        return renderTable(jsonValue)
      }

      if (jsonValueKeys.length === 0) {
        return <RenderValue value={jsonValue} searchQuery={searchQuery} />
      }

      return renderObjectValue(jsonValue)
    } catch (error) {
      handleError(error, 'RenderValue.parseJSON')
      return <span className="text-red-500">Invalid JSON</span>
    }
  }

  if (value && isISODate(value as string)) {
    try {
      // Use formatDate for birth dates, formatDateTime for everything else
      const formattedValue = formatDateTime(value as string)
      return (
        <RenderWithCopy text={formattedValue}>
          <HighlightText text={formattedValue} searchQuery={searchQuery} />
        </RenderWithCopy>
      )
    } catch (error) {
      handleError(error, 'RenderValue.formatDateTime')
      return <span>{value}</span>
    }
  }

  const containsHTML = (str: string) => /<[a-z][\s\S]*>/i.test(str)

  if (typeof value === 'string' && containsHTML(value)) {
    try {
      let htmlContent = value.replaceAll('\n', '<br />')

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
    } catch (error) {
      handleError(error, 'RenderValue.processHTML')
      return <span>{value}</span>
    }
  }

  return (
    <RenderWithCopy text={String(value)}>
      {value && (
        <HighlightText text={String(value)} searchQuery={searchQuery} />
      )}
    </RenderWithCopy>
  )
}

export default RenderValue
