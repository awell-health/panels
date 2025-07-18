import { ChevronDown, ChevronUp } from 'lucide-react'
import { type FC, useEffect, useState } from 'react'

interface Props {
  title: string
  children: React.ReactNode
  defaultExpanded?: boolean
  summary?: string
}

const ExpandableCard: FC<Props> = (props) => {
  const { title, children, defaultExpanded = false, summary } = props
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  useEffect(() => {
    setIsExpanded(defaultExpanded)
  }, [defaultExpanded])

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between  hover:bg-gray-100 transition-colors"
        type="button"
      >
        <div className="flex-1 text-left cursor-pointer">
          <h4 className="font-medium text-medium text-gray-900 truncate">
            {title}
          </h4>
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
