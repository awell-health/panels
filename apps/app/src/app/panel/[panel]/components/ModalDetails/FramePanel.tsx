import { Loader2, CheckCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface FramePanelProps {
  url: string
  status: string
}

const FramePanel = ({ url, status }: FramePanelProps) => {
  const [loadingFrame, setLoadingFrame] = useState(true)

  if (status === 'completed') {
    return (
      <div className="flex items-center justify-center h-full gap-2">
        <CheckCircle className="h-8 w-8 text-gray-500" />
        <span className=" text-gray-500">Task completed</span>
      </div>
    )
  }

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full gap-2">
        <span className="text-sm text-gray-500">No URL provided</span>
      </div>
    )
  }

  return (
    <>
      <iframe
        hidden={loadingFrame}
        src={url}
        className="w-full h-full"
        title="AHP"
        onLoad={() => {
          setLoadingFrame(false)
        }}
      />
      {loadingFrame && (
        <div className="flex items-center justify-center h-full gap-2">
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
