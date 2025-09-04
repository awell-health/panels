import { Loader2, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import TaskStatusBadge from './TaskDetails/TaskStatusBadge'

interface FramePanelProps {
  url: string
  status: string
  taskName: string
  isNonAssignableTask: boolean
}

const FramePanel = ({
  url,
  status,
  taskName,
  isNonAssignableTask,
}: FramePanelProps) => {
  const [loadingFrame, setLoadingFrame] = useState(true)
  const isCompleted = status === 'completed'
  const headerHeight = 'h-[45px]'
  const containerHeight = 'h-[calc(100%-45px)]'

  return (
    <>
      <div
        className={`flex justify-between items-center px-4 py-2 -mx-2 border-b border-gray-200 sticky top-0 bg-white ${headerHeight}`}
      >
        <div className="font-medium text-gray-900">{taskName}</div>
        <div className="flex items-center gap-2">
          <TaskStatusBadge status={status} />
        </div>
      </div>
      {isCompleted ? (
        <div
          className={`flex items-center justify-center gap-2 ${containerHeight}`}
        >
          <CheckCircle className="h-8 w-8 text-gray-500" />
          <span className=" text-gray-500">Task completed</span>
        </div>
      ) : isNonAssignableTask ? (
        <div
          className={`flex items-center justify-center ${containerHeight} gap-2`}
        >
          <span className=" text-gray-500">
            This task cannot be completed through panels.
          </span>
        </div>
      ) : !url ? (
        <div className="flex items-center justify-center h-full gap-2">
          <span className="text-xs text-gray-500">No URL provided</span>
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
          <span className=" text-gray-500">Loading External Frame...</span>
        </div>
      )}
    </>
  )
}

export default FramePanel
