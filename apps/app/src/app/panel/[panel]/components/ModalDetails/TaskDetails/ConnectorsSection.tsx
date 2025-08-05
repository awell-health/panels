import type { WorklistTask } from '@/lib/fhir-to-table-data'
import { useEffect, useState } from 'react'
import {
  getFirstCodingDisplay,
  getFirstCodingCode,
  getFirstCodingSystem,
} from '@/lib/fhir-utils'

interface ConnectorsSectionProps {
  task: WorklistTask
  showAhpConnector: boolean
}

const ConnectorsSection = ({
  task,
  showAhpConnector,
}: ConnectorsSectionProps) => {
  const [connectors, setConnectors] = useState<
    { name: string; code: string; url: string }[]
  >([])

  useEffect(() => {
    // Extract connectors from task input
    const extractedConnectors =
      task.input
        ?.filter(
          // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
          (input: any) =>
            getFirstCodingSystem(input.type) ===
            'http://awellhealth.com/fhir/connector-type',
        )
        // biome-ignore lint/suspicious/noExplicitAny: Not sure if we have a better type
        .map((input: any) => ({
          name: getFirstCodingDisplay(input.type),
          code: getFirstCodingCode(input.type),
          url: input.valueUrl,
        }))
        .filter((connector: { code: string; url: string }) => {
          // If AHP frame is shown, filter out Awell Hosted Pages connectors as redundant
          if (showAhpConnector && connector.code === 'awell-hosted-pages') {
            return false
          }
          return true
        }) || []

    setConnectors(extractedConnectors)
  }, [task, showAhpConnector])

  return (
    <div className="">
      <div className="space-y-2">
        {connectors.length > 0 ? (
          connectors.map((connector, index) => (
            <button
              key={`connector-${connector.code}-${index}`}
              type="button"
              onClick={() => {
                window.open(connector.url, '_blank')
              }}
              className="btn btn-sm btn-default w-full justify-start"
            >
              Complete the task in {connector.name}
            </button>
          ))
        ) : (
          <p className="text-xs text-gray-500">No connectors available</p>
        )}
      </div>
    </div>
  )
}

export default ConnectorsSection
