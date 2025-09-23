import clsx from 'clsx'
import RenderValue, {
  type RenderableValue,
} from '../../StaticContent/RenderValue'
import { ArrowDown } from 'lucide-react'
import type { WorklistTask } from '../../../../../../../lib/fhir-to-table-data'
import type { Coding } from '@medplum/fhirtypes'
import type { TaskInput } from '@medplum/fhirtypes'

interface Props {
  task: WorklistTask
}

const MatchData = ({ task }: Props) => {
  console.log(task.input)
  const matchedDataPayload = task.input?.find((input: TaskInput) =>
    input.type?.coding?.some(
      (coding: Coding) => coding.code === 'matched-patient-summary',
    ),
  )
  const incomingDataPayload = task.input?.find((input: TaskInput) =>
    input.type?.coding?.some(
      (coding: Coding) => coding.code === 'incoming-payload',
    ),
  )

  const matchedData = JSON.parse(matchedDataPayload?.valueString || '{}')
  const incomingData = JSON.parse(incomingDataPayload?.valueString || '{}')

  const renderData = (
    title: string,
    data: Record<string, unknown>,
    keysMatch: string[],
  ) => {
    return (
      <div className="flex flex-col gap-2 border border-gray-200 rounded-md">
        <div className="p-3 border-b border-gray-200">{title}</div>
        <div className="flex flex-col gap-2 p-3">
          {Object.keys(data).map((key) => {
            const hasKeyMatch = keysMatch.includes(key)
            return (
              <div
                key={key}
                className={clsx('flex justify-between gap-2 text-xs')}
              >
                <span
                  className={clsx(
                    !hasKeyMatch && 'text-gray-600',
                    hasKeyMatch && 'text-accent font-medium',
                  )}
                >
                  {key}
                </span>
                <RenderValue value={data[key] as RenderableValue} />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      {Object.keys(matchedData).length > 0 && (
        <>
          {renderData('Incoming Data', incomingData, Object.keys(matchedData))}
          <div className="flex items-center justify-center">
            <ArrowDown className="h-4 w-4 text-accent" />
          </div>
        </>
      )}
      {Object.keys(incomingData).length > 0 &&
        renderData('Matched Data', matchedData, Object.keys(incomingData))}
    </>
  )
}

export default MatchData
