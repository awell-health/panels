import type { WorklistPatient } from '@/lib/fhir-to-table-data'
import type { Extension } from '@medplum/fhirtypes'
import { useEffect, useState } from 'react'

interface PatientConnectorsSectionProps {
  patient: WorklistPatient
}

interface PatientConnector {
  name: string
  code: string
  url: string
}

const AWELL_PATIENT_CONNECTORS_EXTENSION_URL =
  'https://awellhealth.com/fhir/StructureDefinition/awell-patient-connectors'

const PatientConnectorsSection = ({
  patient,
}: PatientConnectorsSectionProps) => {
  const [connectors, setConnectors] = useState<PatientConnector[]>([])

  useEffect(() => {
    const extractedConnectors: PatientConnector[] = []

    // Extract connectors from patient extensions
    if (patient.extension && Array.isArray(patient.extension)) {
      const connectorsExtension = patient.extension.find(
        (ext: Extension) => ext.url === AWELL_PATIENT_CONNECTORS_EXTENSION_URL,
      )

      if (connectorsExtension?.extension) {
        for (const connectorExt of connectorsExtension.extension) {
          if (connectorExt.extension) {
            const typeCode = connectorExt.extension.find(
              (ext: Extension) => ext.url === 'type-code',
            )?.valueString
            const typeDisplay = connectorExt.extension.find(
              (ext: Extension) => ext.url === 'type-display',
            )?.valueString
            const url = connectorExt.extension.find(
              (ext: Extension) => ext.url === 'url',
            )?.valueString

            if (typeCode && typeDisplay && url) {
              extractedConnectors.push({
                name: typeDisplay,
                code: typeCode,
                url: url,
              })
            }
          }
        }
      }
    }

    setConnectors(extractedConnectors)
  }, [patient])

  return (
    <div className="space-y-2 pb-4">
      {connectors.length > 0 ? (
        connectors.map((connector, index) => (
          <a
            key={`patient-connector-${connector.code}-${index}`}
            href={connector.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-primary w-full justify-start"
          >
            Open patient record in {connector.name}
          </a>
        ))
      ) : (
        <p className="text-xs text-gray-500">No patient connectors available</p>
      )}
    </div>
  )
}

export default PatientConnectorsSection
