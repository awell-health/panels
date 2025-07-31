import type { WorklistPatient } from '@/lib/fhir-to-table-data'
import { useEffect, useState } from 'react'

interface PatientConnectorsSectionProps {
  patient: WorklistPatient
}

const PatientConnectorsSection = ({
  patient,
}: PatientConnectorsSectionProps) => {
  const [connectors, setConnectors] = useState<
    { name: string; code: string; url: string }[]
  >([])

  useEffect(() => {
    // Generate connectors from patient identifiers
    const generatedConnectors: { name: string; code: string; url: string }[] =
      []

    if (patient.identifier && Array.isArray(patient.identifier)) {
      for (const identifier of patient.identifier) {
        if (identifier.system && identifier.value) {
          // Check for Awell identifier
          if (identifier.system.includes('awell')) {
            generatedConnectors.push({
              name: 'Awell',
              code: 'awell',
              url: `https://care.sandbox.awellhealth.com/patients/${identifier.value}`,
            })
          }
          // Check for Elation identifier
          else if (identifier.system?.includes('elation')) {
            generatedConnectors.push({
              name: 'Elation',
              code: 'elation',
              url: `https://sandbox.elationemr.com/patient/${identifier.value}`,
            })
          }
        }
      }
    }

    setConnectors(generatedConnectors)
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
