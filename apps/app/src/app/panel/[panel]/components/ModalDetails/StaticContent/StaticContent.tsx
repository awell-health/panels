import type { WorklistPatient, WorklistTask } from '@/hooks/use-medplum-store'
import { Loader2, Search } from 'lucide-react'
import { Fragment, useState, useEffect } from 'react'
import { RenderWithCopy } from './RenderWithCopy'
import ExpandableCard from './ExpandableCard'
import WellpathContent from './WellpathContent/WellpathContent'
import HighlightText from './HighlightContent'
import { useAuthentication } from '../../../../../../hooks/use-authentication'
import EncompassContent from './EncompassContent/EncompassContent'
import RenderValue from './RenderValue'
import SearchInput from './SearchInput'
import WaypointContent from './WaypointContent'
import { take } from 'lodash'

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
  const [expandAll, setExpandAll] = useState({
    wellpath: true,
    encompass: true,
    extension: false,
  })

  const renderKeyValue = (key: string, value: string) => {
    if (searchQuery) {
      const containString =
        key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        value.toLowerCase().includes(searchQuery.toLowerCase())

      if (!containString) {
        return null
      }
    }

    return (
      <div className="flex justify-between">
        <span className="">
          <RenderWithCopy text={key}>
            <HighlightText text={key} searchQuery={searchQuery} />
          </RenderWithCopy>
        </span>
        <span className="text-gray-900 font-normal max-w-[60%]">
          <RenderValue value={value} searchQuery={searchQuery} />
        </span>
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
              defaultExpanded={searchQuery.length > 0 || expandAll.extension}
              summary={`Show ${item?.extension?.length} items`}
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
      {task && (
        <>
          <WellpathContent
            task={task}
            searchQuery={searchQuery}
            expanded={expandAll.wellpath}
          />
          <EncompassContent
            task={task}
            searchQuery={searchQuery}
            expanded={expandAll.encompass}
          />
          <WaypointContent
            task={task}
            searchQuery={searchQuery}
            expanded={expandAll.encompass}
          />
        </>
      )}
    </>
  )

  const extension = task?.extension ?? patient?.extension ?? []

  const handleExpandAll = () => {
    if (expandAll.wellpath || expandAll.encompass || expandAll.extension) {
      setExpandAll({
        wellpath: false,
        encompass: false,
        extension: false,
      })
    } else {
      setExpandAll({
        wellpath: true,
        encompass: true,
        extension: true,
      })
    }
  }

  return (
    <div className="overflow-y-auto h-full">
      <SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery}>
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
        <div
          className="text-blue-600 cursor-pointer text-xs"
          onClick={handleExpandAll}
        >
          {expandAll.wellpath || expandAll.encompass || expandAll.extension
            ? 'Collapse all'
            : 'Expand all'}
        </div>
      </SearchInput>

      <div className="space-y-3">
        {task && (
          <>
            {organizationSlug === 'wellpath' && (
              <WellpathContent
                task={task}
                searchQuery={searchQuery}
                expanded={expandAll.wellpath}
              />
            )}
            {organizationSlug === 'encompass-health' && (
              <EncompassContent
                task={task}
                searchQuery={searchQuery}
                expanded={expandAll.encompass}
              />
            )}
            {organizationSlug === 'waypoint' && (
              <WaypointContent
                task={task}
                searchQuery={searchQuery}
                expanded={expandAll.encompass}
              />
            )}

            {organizationSlug === 'awell-dev' && <DevData />}
          </>
        )}
        {renderExtensionData(extension)}
      </div>
    </div>
  )
}

export default StaticContent
