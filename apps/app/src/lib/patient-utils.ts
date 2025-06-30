import type { Patient } from '@medplum/fhirtypes'

export function getPatientName(patient: Patient): string {
  if (!patient.name || patient.name.length === 0) return 'Unknown'
  const name = patient.name[0]
  return `${name.given?.join(' ') || ''} ${name.family || ''}`.trim()
}
