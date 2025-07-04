import type { WorklistPatient, WorklistTask } from '@/hooks/use-medplum-store'
import { Search } from 'lucide-react'
import { Fragment, useState } from 'react'
import { RenderWithCopy } from './RenderWithCopy'
import { calculateAge, isJSON } from './utils'
import ExpandableCard from './ExpandableCard'
import { isObject, isString } from 'lodash'
import WellpathContent from './WellpathContent/WellpathContent'
import HighlightText from './HighlightContent'
import { useAuthentication } from '../../../../../../hooks/use-authentication'
import EncompassContent from './EncompassContent/EncompassContent'

interface StaticContentProps {
  task?: WorklistTask
  patient?: WorklistPatient
}

const StaticContent = ({ task, patient }: StaticContentProps) => {
  const { organizationSlug } = useAuthentication()
  const getTitle = (url: string) => {
    return url?.split('/').pop()?.toUpperCase()
  }

  const [searchQuery, setSearchQuery] = useState('')

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const rederArrayValue = (value: any[]) => {
    return (
      <div className="mb-4 mt-1">
        <ExpandableCard title={`Show ${value.length} items`}>
          <div className="space-y-2">
            {value.map((item, index) => (
              <div key={`${item.id}-${index}`} className="">
                {renderValue(item)}
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

    return (
      <div className="mb-4 mt-1 border-l pl-3 pb-2 border-b border-gray-200 space-y-2">
        {Object.keys(value)
          .slice(0, visibleObject)
          .map((key) => renderKeyValue(key, value[key]))}
        {keysLength > visibleObject && (
          <div className="mt-2">
            <ExpandableCard
              title={`Show ${keysLength - visibleObject} more items`}
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
  const renderValue = (value: string | Record<string, any>, key?: string) => {
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
        return renderValue(jsonValue)
      }

      return renderObjectValue(jsonValue)
    }

    const containsHTML = (str: string) => /<[a-z][\s\S]*>/i.test(str)

    if (containsHTML(value as string)) {
      return (
        <div
          className="text-sm "
          // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
          dangerouslySetInnerHTML={{
            __html: value.replaceAll('\n', '<br />'),
          }}
        />
      )
    }

    if (value) {
      return (
        <RenderWithCopy text={value as string}>
          <HighlightText text={value as string} searchQuery={searchQuery} />
        </RenderWithCopy>
      )
    }

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
        {renderValue(value, key)}
      </div>
    )
  }

  const renderExtensionData = (
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    data: Record<string, any> | Array<Record<string, any>>,
  ) => {
    if (Array.isArray(data)) {
      return (
        <>
          {data.map((item, index) => (
            <ExpandableCard
              key={`${item.id}-${index}`}
              title={getTitle(item?.url) ?? ''}
              defaultExpanded={searchQuery.length > 0}
            >
              <div className="flex flex-col gap-2">
                <div className="text-sm text-gray-700 space-y-2 mt-3">
                  {item?.extension?.map(
                    (
                      ext: { url: string; valueString: string },
                      index: number,
                    ) => {
                      const { valueString, url } = ext

                      if (Array.isArray(valueString)) {
                        return renderExtensionData(valueString)
                      }

                      return (
                        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                        <Fragment key={`${url}-${index}`}>
                          {renderKeyValue(url, valueString)}
                        </Fragment>
                      )
                    },
                  )}
                </div>
              </div>
            </ExpandableCard>
          ))}
        </>
      )
    }
  }
  const DevData = () => (
    <>
      {task && <WellpathContent task={task} searchQuery={searchQuery} />}
      {task && <EncompassContent task={task} searchQuery={searchQuery} />}
    </>
  )

  const extension = task?.extension ?? patient?.extension ?? []

  return (
    <div className="p-4 overflow-y-auto h-full">
      {/* Search Box */}
      <div className="relative mb-4">
        <label className="input w-full">
          <Search className="text-gray-400" />
          <input
            type="search"
            required
            placeholder="Search context..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
        <div className="text-xs text-gray-500 mt-2">
          Type at least 3 characters to search
        </div>
      </div>

      <div className="space-y-3">
        {task && (
          <>
            {organizationSlug === 'wellpath' && (
              <WellpathContent task={task} searchQuery={searchQuery} />
            )}
            {organizationSlug === 'encompass-health' && (
              <EncompassContent task={task} searchQuery={searchQuery} />
            )}

            {organizationSlug === 'awell-dev' && <DevData />}
          </>
        )}

        {/* Extension Raw Data */}
        {renderExtensionData(extension)}
      </div>
    </div>
  )
}

export default StaticContent
