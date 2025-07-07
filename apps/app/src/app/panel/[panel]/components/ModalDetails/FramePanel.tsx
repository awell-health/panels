import { Loader2, CheckCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import TaskStatusBadge from './TaskDetails/TaskStatusBadge'

interface FramePanelProps {
  url: string
  status: string
  taskName: string
}

const FramePanel = ({ url, status, taskName }: FramePanelProps) => {
  const [loadingFrame, setLoadingFrame] = useState(true)
  const isCompleted = status === 'completed'

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full gap-2">
        <span className="text-sm text-gray-500">No URL provided</span>
      </div>
    )
  }

  const headerHeight = 'h-[45px]'
  const containerHeight = 'h-[calc(100%-45px)]'

  return (
    <>
      <div
        className={`flex justify-between items-center px-4 py-2 -mx-2 border-b border-gray-200 sticky top-0 bg-white ${headerHeight}`}
      >
        <div className="text-lg text-gray-900">{taskName}</div>
        <div className="flex items-center gap-2">
          <TaskStatusBadge status={status} />
        </div>
      </div>
      {isCompleted ? (
        <div
          className={`flex items-center justify-center gap-2 ${containerHeight}`}
        >
          <CheckCircle className="h-8 w-8 text-gray-500" />
          <span className="text-sm text-gray-500">Task completed</span>
        </div>
      ) : (
        <iframe
          hidden={loadingFrame}
          src={url}
          className={`w-full ${containerHeight}`}
          title="AHP"
          onLoad={() => {
            setLoadingFrame(false)
          }}
        />
      )}
      {!isCompleted && loadingFrame && (
        <div
          className={`flex items-center justify-center ${containerHeight} gap-2`}
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-gray-500">
            Loading External Frame...
          </span>
        </div>
      )}
    </>
  )
}

export default FramePanel
