import { ChevronDown, ChevronUp } from 'lucide-react'
import { type FC, useEffect, useState } from 'react'
import { formatDateTime } from '@medplum/core'

interface Props {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  summary?: string
  date?: string
}

const ExpandableCard: FC<Props> = (props) => {
  const { title, children, defaultExpanded = false, summary, date } = props
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  useEffect(() => {
    setIsExpanded(defaultExpanded)
  }, [defaultExpanded])

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="btn btn-sm btn-ghost w-full justify-between h-auto min-h-8 p-3"
        type="button"
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title}`}
      >
        <div className="flex-1 text-left cursor-pointer">
          <h4 className="font-medium text-medium text-gray-900 truncate">
            {title}
          </h4>
          {date && (
            <div className="text-xs text-gray-500 mt-1">
              {formatDateTime(date)}
            </div>
          )}
          {summary && !isExpanded && (
            <p className="text-xs text-gray-600 mt-1">{summary}</p>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100">{children}</div>
      )}
    </div>
  )
}

export default ExpandableCard
