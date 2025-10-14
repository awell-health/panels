import type { Patient } from '@medplum/fhirtypes'
import type { WorklistPatient } from './fhir-to-table-data'

export function getPatientName(patient: Patient | WorklistPatient): string {
  if (!patient.name || patient.name.length === 0) return 'Unknown'
  const name = patient.name[0]
  return `${name.given?.join(' ') || ''} ${name.family || ''}`.trim()
}
