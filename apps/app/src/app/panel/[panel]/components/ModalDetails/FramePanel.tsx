import { Loader2, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import TaskStatusBadge from './TaskDetails/TaskStatusBadge'

interface FramePanelProps {
  url: string
  status: string
}

const FramePanel = ({ url, status }: FramePanelProps) => {
  const [loadingFrame, setLoadingFrame] = useState(true)
  const isCompleted = status === 'completed'
  const containerHeight = 'h-full'

  return (
    <>
      {isCompleted ? (
        <div
          className={`flex items-center justify-center gap-2 ${containerHeight}`}
        >
          <CheckCircle className="h-8 w-8 text-gray-500" />
          <span className=" text-gray-500">Task completed</span>
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
