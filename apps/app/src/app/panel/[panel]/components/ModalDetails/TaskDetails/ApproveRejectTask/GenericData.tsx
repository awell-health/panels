import { ChevronDownIcon, ChevronUpIcon, ExternalLink } from 'lucide-react'
import type { WorklistTask } from '../../../../../../../lib/fhir-to-table-data'
import type { Coding, TaskInput } from '@medplum/fhirtypes'
import Link from 'next/link'
import { useState } from 'react'
import type { HumanName } from '@medplum/fhirtypes'
import type { Quantity } from '@medplum/fhirtypes'

interface Props {
  task: WorklistTask
}

const GenericData = (props: Props) => {
  const { task } = props

  const renderSourceDocument = (): React.ReactNode => {
    console.log(task.input)
    const data = task.input?.find((input: TaskInput) =>
      input.type?.coding?.some(
        (coding: Coding) => coding.code === 'source-document',
      ),
    )

    const { reference } = data.valueReference
    const isDocument = reference?.includes('DocumentReference')
    console.log(isDocument)

    if (!reference || !isDocument) return null

    const documentId = reference?.split('/')[1]

    return (
      <div className="space-y-3">
        <Link
          target="_blank"
          href={`/document-reference/${documentId}`}
          className="text-xs text-primary flex items-center gap-1 border border-gray-200 rounded-md px-2 py-1"
        >
          <ExternalLink className="h-4 w-4" /> View Original Document
        </Link>
      </div>
    )
  }

  const keys = ['display-summary', 'parsed-medical-data']
  const jsonData: Record<string, unknown> = {}

  for (const input of task.input || []) {
    for (const coding of input.type?.coding || []) {
      if (coding.code && keys.includes(coding.code)) {
        console.log(input)
        jsonData[coding.code] = JSON.parse(input.valueString || '{}')
      }
    }
  }

  // Common box structure with collapsible content
  const renderDataBox = (
    title: string,
    children: React.ReactNode,
    defaultCollapsed = false,
  ) => {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

    return (
      <div
        className="flex flex-col gap-2 border border-gray-200 rounded-md"
        key={title}
      >
        <div
          className="p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsCollapsed(!isCollapsed)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsCollapsed(!isCollapsed)
            }
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">{title}</h3>
            <span className="text-gray-500 text-sm">
              {isCollapsed ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronUpIcon className="h-4 w-4" />
              )}
            </span>
          </div>
        </div>
        {!isCollapsed && <div className="p-3">{children}</div>}
      </div>
    )
  }

  // Common chips renderer
  const renderChips = (chips: string[]) => {
    return (
      <div className="flex flex-wrap gap-2 mb-3">
        {chips.map((chip: string, index: number) => (
          <span key={chip} className="badge badge-soft badge-primary badge-xs">
            {chip}
          </span>
        ))}
      </div>
    )
  }

  // Common key-value pairs renderer
  const renderKeyValuePairs = (pairs: Array<[string, string]>) => {
    return (
      <div className="space-y-2">
        {pairs.map(([key, value]) => (
          <div key={key} className="flex flex-col gap-1 text-xs">
            <div className="font-medium text-gray-900">{key}</div>
            <div className="text-xs text-gray-600">{value}</div>
          </div>
        ))}
      </div>
    )
  }

  const renderDisplaySummary = (
    summary: Record<string, unknown>,
  ): React.ReactNode => {
    const chips = summary.chips ? renderChips(summary.chips as string[]) : null
    const details = summary.details
      ? renderKeyValuePairs(summary.details as Array<[string, string]>)
      : null

    return renderDataBox(
      summary.headline as string,
      <>
        {chips}
        {details}
      </>,
    )
  }

  const renderParsedMedicalData = (
    data: Record<string, unknown>,
  ): React.ReactNode => {
    const sections: React.ReactNode[] = []

    // Patient info
    if (data.patient) {
      const patient = data.patient as Record<string, unknown>
      const patientName = patient.name
        ? `${(patient.name as HumanName).given?.join(' ')} ${(patient.name as HumanName).family}`
        : 'Unknown'

      sections.push(
        renderDataBox(
          'Patient Information',
          renderKeyValuePairs([
            ['Name', patientName],
            ['Age', patient.age ? `${patient.age} years` : 'Unknown'],
            ['Gender', (patient.gender as string) || 'Unknown'],
          ]),
        ),
      )
    }

    // Practitioner info
    if (data.practitioner) {
      const practitioner = data.practitioner as Record<string, unknown>
      sections.push(
        renderDataBox(
          'Practitioner',
          renderKeyValuePairs([
            ['Name', (practitioner.name as string) || 'Unknown'],
            ['Role', (practitioner.role as string) || 'Unknown'],
          ]),
        ),
      )
    }

    // Encounter info
    if (data.encounter) {
      const encounter = data.encounter as Record<string, unknown>
      sections.push(
        renderDataBox(
          'Encounter',
          renderKeyValuePairs([
            ['Date', (encounter.date as string) || 'Unknown'],
            ['Type', (encounter.type as string) || 'Unknown'],
          ]),
        ),
      )
    }

    // Conditions
    if (data.conditions && Array.isArray(data.conditions)) {
      const conditions = data.conditions as Array<Record<string, unknown>>
      const conditionPairs = conditions.map((condition) => [
        condition.display as string,
        `${condition.clinicalStatus} (${condition.verificationStatus})`,
      ])

      sections.push(
        renderDataBox(
          `Conditions (${conditions.length})`,
          renderKeyValuePairs(conditionPairs as Array<[string, string]>),
        ),
      )
    }

    // Allergies
    if (data.allergies && Array.isArray(data.allergies)) {
      const allergies = data.allergies as Array<Record<string, unknown>>
      const allergyPairs = allergies.map((allergy) => [
        allergy.substance as string,
        `${allergy.criticality} - ${allergy.clinicalStatus}`,
      ])

      sections.push(
        renderDataBox(
          `Allergies (${allergies.length})`,
          renderKeyValuePairs(allergyPairs as Array<[string, string]>),
        ),
      )
    }

    // Medications
    if (data.medications && Array.isArray(data.medications)) {
      const medications = data.medications as Array<Record<string, unknown>>
      const medicationPairs = medications.map((med) => [
        med.medication as string,
        `${med.dosage} ${med.frequency} (${med.status})`,
      ])

      sections.push(
        renderDataBox(
          `Medications (${medications.length})`,
          renderKeyValuePairs(medicationPairs as Array<[string, string]>),
        ),
      )
    }

    // Observations
    if (data.observations && Array.isArray(data.observations)) {
      const observations = data.observations as Array<Record<string, unknown>>
      const observationPairs = observations.map((obs) => {
        const value = obs.valueQuantity
          ? `${(obs.valueQuantity as Quantity).value} ${(obs.valueQuantity as Quantity).unit}`
          : (obs.valueString as string)
        return [obs.display as string, value]
      })

      sections.push(
        renderDataBox(
          `Observations (${observations.length})`,
          renderKeyValuePairs(observationPairs as Array<[string, string]>),
        ),
      )
    }

    // Service Requests
    if (data.serviceRequests && Array.isArray(data.serviceRequests)) {
      const serviceRequests = data.serviceRequests as Array<
        Record<string, unknown>
      >
      const servicePairs = serviceRequests.map((sr) => [
        sr.description as string,
        `${sr.intent} - ${sr.status}`,
      ])

      sections.push(
        renderDataBox(
          `Service Requests (${serviceRequests.length})`,
          renderKeyValuePairs(servicePairs as Array<[string, string]>),
        ),
      )
    }

    // Future Appointments
    if (data.futureAppointments && Array.isArray(data.futureAppointments)) {
      const appointments = data.futureAppointments as Array<
        Record<string, unknown>
      >
      const appointmentPairs = appointments.map((apt) => [
        `${apt.date} at ${apt.time}`,
        `${apt.practitioner} - ${apt.specialty} (${apt.appointmentType})`,
      ])

      sections.push(
        renderDataBox(
          `Future Appointments (${appointments.length})`,
          renderKeyValuePairs(appointmentPairs as Array<[string, string]>),
        ),
      )
    }

    return <div className="space-y-3">{sections}</div>
  }

  return (
    <>
      {renderDisplaySummary(
        jsonData['display-summary'] as Record<string, unknown>,
      )}
      {renderParsedMedicalData(
        jsonData['parsed-medical-data'] as Record<string, unknown>,
      )}
      {renderSourceDocument()}
    </>
  )
}

export default GenericData
