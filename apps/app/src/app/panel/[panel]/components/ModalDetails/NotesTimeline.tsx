import { useEffect, useState, type FC } from 'react'
import {
  useMedplumStore,
  type WorklistTask,
} from '../../../../../hooks/use-medplum-store'
import { useDateTimeFormat } from '../../../../../hooks/use-date-time-format'
import type { Encounter, Observation } from '@medplum/fhirtypes'
import { CircleSmall, Loader2 } from 'lucide-react'
import { sortBy } from 'lodash'

interface TimelineDatItem {
  type: 'observation' | 'encounter' | 'note' | 'thread'
  title: string
  datetime: string
  description?: string
  status?: string
  author?: string
  notes?: WorklistTask['note']
}
interface Props {
  notes?: WorklistTask['note']
  patientId: string
  thread?: {
    text: string
    time: string
    notes: WorklistTask['note']
  }[]
}

const mapNotes = (data: WorklistTask['note']): TimelineDatItem[] => {
  return data.map((item: WorklistTask['note']) => {
    return {
      type: 'note',
      title: item.text,
      datetime: item.time ?? '',
      author: item.author ?? '  ',
    }
  })
}

const mapTimelineObservations = (data: Observation[]): TimelineDatItem[] => {
  return data.map((item) => {
    const codingDisplay = item.code?.coding?.[0]?.display
    return {
      type: 'observation',
      title: `${codingDisplay}, ${item.valueQuantity?.value} ${item.valueQuantity?.unit}`,
      datetime: item.effectiveDateTime ?? '',
      status: item.status,
    }
  })
}

const mapTimelineEncounters = (data: Encounter[]): TimelineDatItem[] => {
  return data.map((item) => {
    return {
      type: 'encounter',
      title: item.class?.display ?? '',
      datetime: item.period?.start ?? '',
      status: item.status,
    }
  })
}

const mapThread = (
  data: {
    text: string
    time: string
    notes: WorklistTask['note']
  }[],
): TimelineDatItem[] => {
  return data.map((item) => ({
    type: 'thread',
    title: item.text,
    datetime: item.time,
    notes: item.notes,
  }))
}

const NotesTimeline: FC<Props> = ({ notes, thread, patientId }) => {
  const { formatDateTime } = useDateTimeFormat()
  const { getPatientObservations, getPatientEncounters } = useMedplumStore()
  const [isLoading, setIsLoading] = useState(false)

  const [timelineData, setTimelineData] = useState<TimelineDatItem[]>([
    ...mapNotes(notes ?? []),
    ...mapThread(thread ?? []),
  ])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const filteredTimelineNotes = timelineData.filter(
      (item) => item.type !== 'note',
    )

    setTimelineData([...filteredTimelineNotes, ...mapNotes(notes ?? [])])
  }, [notes, thread])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const fetchTimelineData = async () => {
      if (!patientId) {
        return
      }

      setIsLoading(true)
      const encounters = await getPatientEncounters(patientId)
      const observations = await getPatientObservations(patientId)

      const updatedTimelineData = [
        ...mapTimelineObservations(observations),
        ...mapTimelineEncounters(encounters),
      ]

      setTimelineData([...timelineData, ...updatedTimelineData])
      setIsLoading(false)
    }

    fetchTimelineData()
  }, [getPatientObservations, getPatientEncounters, patientId])

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'final':
        return 'badge-primary'
      case 'preliminary':
        return 'badge-secondary'
      default:
        return 'badge-default'
    }
  }

  const getIndicatorColor = (type: string) => {
    switch (type) {
      case 'observation':
        return 'bg-blue-400'
      case 'encounter':
        return 'bg-green-400'
      default:
        return 'bg-gray-400'
    }
  }

  const sortedTimelineData = sortBy(timelineData, 'datetime')

  return (
    <div className="h-full">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <div className="max-w-xl mx-auto p-2">
          <div className="flow-root">
            <ul className="-mb-4">
              {sortedTimelineData.map(
                (item: TimelineDatItem, index: number) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  <li className="group" key={index}>
                    <div className="relative pb-4">
                      <span className="absolute top-1.5 left-1.5 -ml-px h-full w-0.5 bg-gray-200 group-last:hidden" />
                      <div className="relative flex items-start space-x-2">
                        <div className="mt-1">
                          <div
                            className={`h-3 w-3 rounded-full ${getIndicatorColor(
                              item.type || '',
                            )}`}
                          />
                        </div>
                        <div>
                          <div className="min-w-0 flex-1 py-0 flex gap-2 items-center">
                            <span className="font-base text-gray-900 text-sm">
                              {item.title}
                            </span>
                          </div>
                          {item.type === 'thread' && (
                            <div className="flex flex-col gap-2 mt-1 text-gray-700 text-sm">
                              {item.notes?.map((note: WorklistTask['note']) => {
                                return (
                                  <div
                                    key={note.time}
                                    className="flex flex-col gap-1"
                                  >
                                    <span>{note.text}</span>
                                    <span className="text-xs text-gray-500">
                                      {formatDateTime(note.time)}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            {item.status && (
                              <div
                                className={`badge badge-outline badge-xs ${getBadgeColor(item.status)}`}
                              >
                                {item.status}
                              </div>
                            )}
                            {item.author && <span>{item.author}</span>}
                            <span>{formatDateTime(item.datetime)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotesTimeline
