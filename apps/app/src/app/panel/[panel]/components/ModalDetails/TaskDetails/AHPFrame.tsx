import type { WorklistTask } from '@/lib/fhir-to-table-data'
import FramePanel from '../FramePanel'

interface AHPFrameProps {
  task: WorklistTask
  url: string | null
  isNonAssignableTask: boolean
}

const AHPFrame = ({ task, url, isNonAssignableTask }: AHPFrameProps) => {
  if (!url) return null

  return (
    <FramePanel
      url={url}
      status={task.status}
      taskName={task.description}
      isNonAssignableTask={isNonAssignableTask}
    />
  )
}

export default AHPFrame
