import type { FC } from 'react'
import type { WorklistTask } from '../../../../../hooks/use-medplum-store'
import { useDateTimeFormat } from '../../../../../hooks/use-date-time-format'

interface Props {
  notes: WorklistTask['note']
}

const NotesTimeline: FC<Props> = ({ notes }) => {
  const { formatDateTime } = useDateTimeFormat()

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'Feature':
        return 'badge-primary'
      case 'Enhancement':
        return 'badge-secondary'
      case 'Hotfix':
        return 'badge-error'
      case 'Release':
        return 'badge-success'
    }
  }

  const getIndicatorColor = (type: string) => {
    switch (type) {
      case 'Feature':
        return 'bg-blue-400'
      case 'Enhancement':
        return 'bg-green-400'
      case 'Hotfix':
        return 'bg-red-400'
      case 'Release':
        return 'bg-green-400'
      default:
        return 'bg-gray-400'
    }
  }
  return (
    <div>
      {notes && notes.length > 0 && (
        <div>
          <div className="max-w-xl mx-auto p-2">
            <div className="flow-root">
              <ul className="-mb-4">
                {notes.map((comment: WorklistTask['note'], index: number) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  <li className="group" key={index}>
                    <div className="relative pb-4">
                      <span className="absolute top-1.5 left-1.5 -ml-px h-full w-0.5 bg-gray-200 group-last:hidden" />
                      <div className="relative flex items-start space-x-2">
                        <div className="mt-1">
                          <div
                            className={`h-3 w-3 rounded-full ${getIndicatorColor(
                              comment.type || '',
                            )}`}
                          />
                        </div>
                        <div>
                          <div className="min-w-0 flex-1 py-0 flex gap-2 items-center">
                            <span className="font-base text-gray-900 text-sm">
                              {comment.text}
                            </span>
                            {comment.type && (
                              <div
                                className={`badge badge-outline badge-xs ${getBadgeColor(comment.type)}`}
                              >
                                {comment.type}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            {comment.author && <span>{comment.author}</span>}
                            <span>{formatDateTime(comment.time)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotesTimeline
