import type { Patient, Task } from '@medplum/fhirtypes'
import type { WorklistPatient, WorklistTask } from '@/lib/fhir-to-table-data'

/**
 * Server-side utilities for Medplum data transformation
 * These functions can be used in Server Components and API routes
 */

/**
 * Transform FHIR Patient to WorklistPatient format
 */
export function transformPatientToWorklist(patient: Patient): WorklistPatient {
  const name = patient.name?.[0]
  const givenName = name?.given?.join(' ') || ''
  const familyName = name?.family || ''
  const fullName = [givenName, familyName].filter(Boolean).join(' ')

  return {
    id: patient.id || '',
    name: fullName || 'Unknown',
    birthDate: patient.birthDate || '',
    gender: patient.gender || '',
    identifier: patient.identifier?.[0]?.value || '',
    lastUpdated: patient.meta?.lastUpdated || '',
    tasks: [], // Initialize empty tasks array
    // Add other fields as needed based on your WorklistPatient type
  } as WorklistPatient
}

/**
 * Transform FHIR Task to WorklistTask format
 */
export function transformTaskToWorklist(task: Task): WorklistTask {
  // Extract patient ID from the 'for' reference
  const patientId = task.for?.reference?.replace('Patient/', '') || ''

  return {
    id: task.id || '',
    description: task.description || '',
    status: task.status || 'unknown',
    priority: task.priority || 'normal',
    for: task.for?.reference || '',
    owner: task.owner?.reference || '',
    requester: task.requester?.reference || '',
    created: task.authoredOn || '',
    lastModified: task.meta?.lastUpdated || '',
    patientId,
    patientName: '', // Will be populated when patient data is available
    // Add other fields as needed based on your WorklistTask type
  } as WorklistTask
}

/**
 * Transform array of FHIR Patients to WorklistPatients
 */
export function transformPatientsToWorklist(
  patients: Patient[],
): WorklistPatient[] {
  return patients.map(transformPatientToWorklist)
}

/**
 * Transform array of FHIR Tasks to WorklistTasks
 */
export function transformTasksToWorklist(tasks: Task[]): WorklistTask[] {
  return tasks.map(transformTaskToWorklist)
}

/**
 * Get patient initials from name
 */
export function getPatientInitials(patient: Patient): string {
  const name = patient.name?.[0]
  if (!name) return '??'

  const given = name.given?.[0] || ''
  const family = name.family || ''

  return [given.charAt(0), family.charAt(0)]
    .filter(Boolean)
    .join('')
    .toUpperCase()
}

/**
 * Get task status color for UI
 */
export function getTaskStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'green'
    case 'in-progress':
      return 'blue'
    case 'cancelled':
      return 'red'
    case 'on-hold':
      return 'yellow'
    default:
      return 'gray'
  }
}

/**
 * Get task priority color for UI
 */
export function getTaskPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return 'red'
    case 'high':
      return 'orange'
    case 'normal':
      return 'blue'
    case 'low':
      return 'gray'
    default:
      return 'gray'
  }
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  if (!dateString) return ''

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

/**
 * Format datetime for display
 */
export function formatDateTime(dateString: string): string {
  if (!dateString) return ''

  try {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null

  try {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--
    }

    return age
  } catch {
    return null
  }
}

/**
 * Extract resource ID from reference string
 */
export function extractResourceId(reference: string): string | null {
  if (!reference) return null

  const parts = reference.split('/')
  return parts.length > 1 ? parts[1] : null
}

/**
 * Build reference string from resource type and ID
 */
export function buildReference(resourceType: string, id: string): string {
  return `${resourceType}/${id}`
}

/**
 * Check if a date is recent (within last 24 hours)
 */
export function isRecentDate(dateString: string): boolean {
  if (!dateString) return false

  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    return diffInHours <= 24
  } catch {
    return false
  }
}

/**
 * Sort patients by last updated date
 */
export function sortPatientsByLastUpdated(patients: Patient[]): Patient[] {
  return [...patients].sort((a, b) => {
    const dateA = new Date(a.meta?.lastUpdated || 0)
    const dateB = new Date(b.meta?.lastUpdated || 0)
    return dateB.getTime() - dateA.getTime()
  })
}

/**
 * Sort tasks by last updated date
 */
export function sortTasksByLastUpdated(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const dateA = new Date(a.meta?.lastUpdated || 0)
    const dateB = new Date(b.meta?.lastUpdated || 0)
    return dateB.getTime() - dateA.getTime()
  })
}
