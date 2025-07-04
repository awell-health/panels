import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface FramePanelProps {
  url: string
}

const FramePanel = ({ url }: FramePanelProps) => {
  const [loadingFrame, setLoadingFrame] = useState(true)

  if (!url) {
    return (
      <div className="flex items-center justify-center h-full mt-10 gap-2">
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
          console.log('Frame loaded')
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
