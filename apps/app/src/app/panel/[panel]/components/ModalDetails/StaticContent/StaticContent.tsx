import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'
import { Fragment, useState } from 'react'
import ExpandableCard from './ExpandableCard'
import SearchInput from './SearchInput'
import ContentCards from './ContentCards/ContentCards'
import CardRowItem from './CardRowItem'

interface ExtensionItem {
  id?: string
  url?: string
  extension?: Array<{
    url: string
    valueString: string | unknown[]
  }>
}

interface StaticContentProps {
  task?: WorklistTask
  patient?: WorklistPatient
}

const StaticContent = ({ task, patient }: StaticContentProps) => {
  const getTitle = (url: string) => {
    return url?.split('/').pop()?.toUpperCase()
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [expandAll, setExpandAll] = useState({
    wellpath: true,
    encompass: true,
    waypoint: true,
    default: true,
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

    return <CardRowItem label={key} value={value} searchQuery={searchQuery} />
  }

  const renderExtensionData = (data: ExtensionItem[]) => {
    if (Array.isArray(data)) {
      return (
        <>
          {data.map((item, index) => (
            <ExpandableCard
              key={`${item.id || 'ext'}-${index}`}
              title={getTitle(item?.url || '') || 'Extension'}
              defaultExpanded={searchQuery.length > 0 || expandAll.extension}
              summary={`Show ${item?.extension?.length || 0} items`}
            >
              <div className="flex flex-col gap-2">
                <div className="text-gray-700 space-y-2 mt-3">
                  {item?.extension?.map((ext, extIndex) => {
                    const { valueString, url } = ext

                    if (Array.isArray(valueString)) {
                      return renderExtensionData(valueString as ExtensionItem[])
                    }

                    return (
                      // biome-ignore lint/suspicious/noArrayIndexKey: There can be multiple extensions with the same url and possibly the same value
                      <Fragment key={`${url}-${extIndex}`}>
                        {renderKeyValue(url, String(valueString))}
                      </Fragment>
                    )
                  })}
                </div>
              </div>
            </ExpandableCard>
          ))}
        </>
      )
    }
  }
  const extension = (task?.extension ??
    patient?.extension ??
    []) as ExtensionItem[]

  const handleExpandAll = () => {
    if (expandAll.wellpath || expandAll.encompass || expandAll.extension) {
      setExpandAll({
        wellpath: false,
        encompass: false,
        waypoint: false,
        default: false,
        extension: false,
      })
    } else {
      setExpandAll({
        wellpath: true,
        encompass: true,
        waypoint: true,
        default: true,
        extension: true,
      })
    }
  }

  return (
    <div className="">
      <SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery}>
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
        <div
          className="text-blue-600 cursor-pointer text-xs underline"
          onClick={handleExpandAll}
        >
          {expandAll.wellpath || expandAll.encompass || expandAll.extension
            ? 'Collapse all'
            : 'Expand all'}
        </div>
      </SearchInput>

      <div className="space-y-3">
        <ContentCards
          task={task}
          patient={task?.patient ?? patient}
          searchQuery={searchQuery}
          expanded={expandAll.encompass}
        />
        {renderExtensionData(extension)}
      </div>
    </div>
  )
}

export default StaticContent
