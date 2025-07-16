import { useEffect, useState, type FC } from 'react'
import { useMedplumStore } from '../../../../../hooks/use-medplum-store'
import type { WorklistTask } from '@/lib/fhir-to-table-data'
import { useDateTimeFormat } from '../../../../../hooks/use-date-time-format'
import type { DetectedIssue, Encounter, Observation } from '@medplum/fhirtypes'
import { Loader2 } from 'lucide-react'
import { sortBy } from 'lodash'

export interface TimelineDatItem {
  type: 'observation' | 'encounter' | 'note' | 'detected-issue' | 'task'
  title: string
  datetime: string
  description?: string
  author?: string
  notes?: WorklistTask['note']
}
interface Props {
  notes: WorklistTask['note']
  patientId: string
  timelineItems?: TimelineDatItem[]
}

const mapNotes = (data: WorklistTask['note']): TimelineDatItem[] => {
  return data.map((item: WorklistTask['note']) => {
    return {
      type: 'note',
      title: `Note: ${item.text}`,
      datetime: item.time ?? '',
      author: item.authorString ?? '  ',
    }
  })
}

const mapDetectedIssues = (data: DetectedIssue[]): TimelineDatItem[] => {
  return data.map((item) => {
    return {
      type: 'detected-issue',
      title: `Issue detected: ${item.code?.text} [${item.severity}]`,
      datetime: item.identifiedDateTime ?? '',
    }
  })
}

const mapTimelineObservations = (data: Observation[]): TimelineDatItem[] => {
  return data.map((item) => {
    const codingDisplay = item.code?.coding?.[0]?.display
    const itemsToDisplay = []
    let value = ''

    if (codingDisplay) {
      itemsToDisplay.push(codingDisplay)
    } else if (item.code?.text) {
      itemsToDisplay.push(item.code.text)
    }

    if (item.valueQuantity) {
      value = Object.values(item.valueQuantity).join(' ')
    } else if (item.valueString) {
      value = item.valueString
    }

    return {
      type: 'observation',
      title: `Observation: ${itemsToDisplay.join(', ')}`,
      datetime: item.effectiveDateTime ?? '',
      description: value,
    }
  })
}

const mapTimelineEncounters = (data: Encounter[]): TimelineDatItem[] => {
  return data.map((item) => {
    return {
      type: 'encounter',
      title: `Encounter: ${item.type?.[0]?.text}`,
      datetime: item.period?.start ?? '',
    }
  })
}

const NotesTimeline: FC<Props> = ({ notes, patientId, timelineItems = [] }) => {
  const { formatDateTime } = useDateTimeFormat()
  const {
    getPatientObservations,
    getPatientEncounters,
    getPatientDetectedIssues,
  } = useMedplumStore()
  const [isLoading, setIsLoading] = useState(false)

  const [timelineData, setTimelineData] = useState<TimelineDatItem[]>([
    ...(timelineItems ?? []),
    ...mapNotes(notes ?? []),
  ])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const filteredTimelineNotes = timelineData.filter(
      (item) => item.type !== 'note',
    )

    setTimelineData([...filteredTimelineNotes, ...mapNotes(notes ?? [])])
  }, [notes])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const fetchTimelineData = async () => {
      if (!patientId) {
        return
      }

      setIsLoading(true)
      const encounters = await getPatientEncounters(patientId)
      const observations = await getPatientObservations(patientId)
      const detectedIssues = await getPatientDetectedIssues(patientId)

      const updatedTimelineData = [
        ...mapTimelineObservations(observations),
        ...mapTimelineEncounters(encounters),
        ...mapDetectedIssues(detectedIssues),
      ]

      setTimelineData([...timelineData, ...updatedTimelineData])
      setIsLoading(false)
    }

    fetchTimelineData()
  }, [getPatientObservations, getPatientEncounters, patientId])

  const getIndicatorColor = (type: string) => {
    switch (type) {
      case 'observation':
        return 'bg-blue-400'
      case 'encounter':
        return 'bg-green-400'
      case 'detected-issue':
        return 'bg-red-400'
      case 'task':
        return 'bg-cyan-400'
      default:
        return 'bg-gray-400'
    }
  }

  const sortedTimelineData = sortBy(timelineData, 'datetime')

  return (
    <div className="h-full">
      {isLoading ? (
        <div className="flex justify-center items-center gap-2 h-64 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading timeline...
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
                            <span className=" text-gray-700 text-xs font-normal">
                              {item.title}
                            </span>
                          </div>
                          {item.description && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <span>{item.description}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
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
