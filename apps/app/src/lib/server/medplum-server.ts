'use server'

import { MedplumClient } from '@medplum/core'
import type {
  Patient,
  Task,
  Observation,
  Composition,
  Encounter,
  DetectedIssue,
  DocumentReference,
  Practitioner,
  Appointment,
  Location,
  Bundle,
} from '@medplum/fhirtypes'
import { getRuntimeConfig } from '@/lib/config'
import type { PaginatedAppointmentBundleResult } from '@/types/appointment'

export interface PaginationOptions {
  pageSize?: number
  lastUpdated?: string
}

export interface PaginatedResult<T> {
  data: T[]
  hasMore: boolean
  nextCursor?: string
  totalCount?: number
}

// Singleton client instance
let serverClient: MedplumClient | null = null

/**
 * Get or create the server-side Medplum client
 */
async function getServerClient(): Promise<MedplumClient> {
  if (serverClient?.isAuthenticated()) {
    return serverClient
  }

  const config = await getRuntimeConfig()

  if (!config.medplumBaseUrl) {
    throw new Error('Medplum base URL is not configured')
  }

  const clientId = process.env.MEDPLUM_CLIENT_ID
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      'Medplum credentials are not configured for server-side usage',
    )
  }

  serverClient = new MedplumClient({
    baseUrl: config.medplumBaseUrl,
    cacheTime: 300000, // 5 minutes
  })

  await serverClient.startClientLogin(clientId, clientSecret)
  return serverClient
}

/**
 * Get all patients with pagination
 */
export async function getPatientsPaginated(
  options: PaginationOptions = {},
): Promise<PaginatedResult<Patient>> {
  const client = await getServerClient()

  try {
    const pageSize = options.pageSize || 1000
    const searchParams: Record<string, string> = {
      _count: String(pageSize),
      _sort: '-_lastUpdated',
    }

    if (options.lastUpdated) {
      searchParams._lastUpdated = `lt${options.lastUpdated}`
    }

    const bundle = await client.search('Patient', searchParams)
    const data = (bundle.entry || []).map((entry) => entry.resource as Patient)
    const hasMore = data.length === pageSize

    let nextCursor: string | undefined
    if (hasMore && data.length > 0) {
      const lastRecord = data[data.length - 1]
      nextCursor = lastRecord.meta?.lastUpdated
    }

    let totalCount = bundle.total
    if (totalCount === undefined && data.length > 0) {
      totalCount = hasMore ? data.length + 1 : data.length
    }

    return {
      data,
      hasMore,
      nextCursor,
      totalCount,
    }
  } catch (error) {
    console.error('Error fetching paginated patients:', error)
    throw error
  }
}

/**
 * Get all tasks with pagination
 */
export async function getTasksPaginated(
  options: PaginationOptions = {},
): Promise<PaginatedResult<Task>> {
  const client = await getServerClient()

  try {
    const pageSize = options.pageSize || 1000
    const searchParams: Record<string, string> = {
      _count: String(pageSize),
      _sort: '-_lastUpdated',
    }

    if (options.lastUpdated) {
      searchParams._lastUpdated = `lt${options.lastUpdated}`
    }

    const bundle = await client.search('Task', searchParams)
    const data = (bundle.entry || []).map((entry) => entry.resource as Task)
    const hasMore = data.length === pageSize

    let nextCursor: string | undefined
    if (hasMore && data.length > 0) {
      const lastRecord = data[data.length - 1]
      nextCursor = lastRecord.meta?.lastUpdated
    }

    let totalCount = bundle.total
    if (totalCount === undefined && data.length > 0) {
      totalCount = hasMore ? data.length + 1 : data.length
    }

    return {
      data,
      hasMore,
      nextCursor,
      totalCount,
    }
  } catch (error) {
    console.error('Error fetching paginated tasks:', error)
    throw error
  }
}

/**
 * Get patients by their IDs
 */
export async function getPatientsFromReferences(
  patientRefList: string[],
): Promise<Patient[]> {
  const client = await getServerClient()

  if (patientRefList.length === 0) {
    return []
  }

  try {
    const patients: Patient[] = []

    // Process in batches to avoid URL length limits
    const batchSize = 50
    for (let i = 0; i < patientRefList.length; i += batchSize) {
      const batch = patientRefList.slice(i, i + batchSize)
      const searchParams = {
        _id: batch.join(','),
      }

      const bundle = await client.search('Patient', searchParams)
      const batchPatients = (bundle.entry || []).map(
        (entry) => entry.resource as Patient,
      )
      patients.push(...batchPatients)
    }

    return patients
  } catch (error) {
    console.error('Error fetching patients from references:', error)
    throw error
  }
}

/**
 * Get tasks for specific patients
 */
export async function getTasksForPatients(
  patientIDs: string[],
  limit?: number,
): Promise<Task[]> {
  const client = await getServerClient()

  if (patientIDs.length === 0) {
    return []
  }

  try {
    const searchParams: Record<string, string> = {
      for: patientIDs.map((id) => `Patient/${id}`).join(','),
      _sort: '-_lastUpdated',
    }

    if (limit) {
      searchParams._count = String(limit)
    }

    const bundle = await client.search('Task', searchParams)
    return (bundle.entry || []).map((entry) => entry.resource as Task)
  } catch (error) {
    console.error('Error fetching tasks for patients:', error)
    throw error
  }
}

/**
 * Get patient observations
 */
export async function getPatientObservations(
  patientId: string,
): Promise<Observation[]> {
  const client = await getServerClient()

  try {
    const bundle = await client.search('Observation', {
      subject: `Patient/${patientId}`,
      _sort: '-_lastUpdated',
    })
    return (bundle.entry || []).map((entry) => entry.resource as Observation)
  } catch (error) {
    console.error('Error fetching patient observations:', error)
    throw error
  }
}

/**
 * Get patient compositions
 */
export async function getPatientCompositions(
  patientId: string,
): Promise<Composition[]> {
  const client = await getServerClient()

  try {
    const bundle = await client.search('Composition', {
      subject: `Patient/${patientId}`,
      _sort: '-_lastUpdated',
    })
    return (bundle.entry || []).map((entry) => entry.resource as Composition)
  } catch (error) {
    console.error('Error fetching patient compositions:', error)
    throw error
  }
}

/**
 * Get patient encounters
 */
export async function getPatientEncounters(
  patientId: string,
): Promise<Encounter[]> {
  const client = await getServerClient()

  try {
    const bundle = await client.search('Encounter', {
      subject: `Patient/${patientId}`,
      _sort: '-_lastUpdated',
    })
    return (bundle.entry || []).map((entry) => entry.resource as Encounter)
  } catch (error) {
    console.error('Error fetching patient encounters:', error)
    throw error
  }
}

/**
 * Get patient detected issues
 */
export async function getPatientDetectedIssues(
  patientId: string,
): Promise<DetectedIssue[]> {
  const client = await getServerClient()

  try {
    const bundle = await client.search('DetectedIssue', {
      patient: `Patient/${patientId}`,
      _sort: '-_lastUpdated',
    })
    return (bundle.entry || []).map((entry) => entry.resource as DetectedIssue)
  } catch (error) {
    console.error('Error fetching patient detected issues:', error)
    throw error
  }
}

/**
 * Read a document reference
 */
export async function readDocumentReference(
  documentReferenceId: string,
): Promise<DocumentReference> {
  const client = await getServerClient()

  try {
    return await client.readResource('DocumentReference', documentReferenceId)
  } catch (error) {
    console.error('Error reading document reference:', error)
    throw error
  }
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  taskId: string,
  status: 'completed' | 'cancelled',
): Promise<Task> {
  const client = await getServerClient()

  try {
    const task = await client.readResource('Task', taskId)
    const updatedTask = {
      ...task,
      status,
      lastModified: new Date().toISOString(),
    }
    return await client.updateResource(updatedTask)
  } catch (error) {
    console.error('Error updating task status:', error)
    throw error
  }
}

/**
 * Add notes to a task
 */
export async function addNotesToTask(
  taskId: string,
  notes: string,
): Promise<Task> {
  const client = await getServerClient()

  try {
    const task = await client.readResource('Task', taskId)
    const updatedTask = {
      ...task,
      note: [
        ...(task.note || []),
        {
          text: notes,
          time: new Date().toISOString(),
        },
      ],
      lastModified: new Date().toISOString(),
    }
    return await client.updateResource(updatedTask)
  } catch (error) {
    console.error('Error adding notes to task:', error)
    throw error
  }
}

/**
 * Toggle task owner
 */
export async function toggleTaskOwner(taskId: string): Promise<Task> {
  const client = await getServerClient()

  try {
    const task = await client.readResource('Task', taskId)
    const updatedTask = {
      ...task,
      owner: task.owner ? undefined : task.requester,
      lastModified: new Date().toISOString(),
    }
    return await client.updateResource(updatedTask)
  } catch (error) {
    console.error('Error toggling task owner:', error)
    throw error
  }
}

/**
 * Delete a patient
 */
export async function deletePatient(patientId: string): Promise<void> {
  const client = await getServerClient()

  try {
    await client.deleteResource('Patient', patientId)
  } catch (error) {
    console.error('Error deleting patient:', error)
    throw error
  }
}

/**
 * Get patient count
 */
export async function getPatientCount(): Promise<number> {
  const client = await getServerClient()

  try {
    const bundle = await client.search('Patient', {
      _summary: 'count',
    })
    return bundle.total || 0
  } catch (error) {
    console.error('Error getting patient count:', error)
    throw error
  }
}

/**
 * Get task count
 */
export async function getTaskCount(): Promise<number> {
  const client = await getServerClient()

  try {
    const bundle = await client.search('Task', {
      _summary: 'count',
    })
    return bundle.total || 0
  } catch (error) {
    console.error('Error getting task count:', error)
    throw error
  }
}

/**
 * Get practitioner information
 */
export async function getPractitioner(
  practitionerId: string,
): Promise<Practitioner> {
  const client = await getServerClient()

  try {
    return await client.readResource('Practitioner', practitionerId)
  } catch (error) {
    console.error('Error getting practitioner:', error)
    throw error
  }
}

/**
 * Get a single appointment by ID
 */
export async function getAppointment(
  appointmentId: string,
): Promise<Appointment> {
  const client = await getServerClient()

  try {
    return await client.readResource('Appointment', appointmentId)
  } catch (error) {
    console.error('Error getting appointment:', error)
    throw error
  }
}

/**
 * Get appointments with pagination and resolved participant references as a FHIR Bundle
 * This allows using FHIR path expressions to navigate the data
 */
export async function getAppointmentsPaginated(
  options: PaginationOptions = {},
): Promise<PaginatedAppointmentBundleResult> {
  const client = await getServerClient()

  try {
    const pageSize = options.pageSize || 1000
    const searchParams: Record<string, string> = {
      _count: String(pageSize),
      _sort: '-_lastUpdated',
    }

    if (options.lastUpdated) {
      searchParams._lastUpdated = `lt${options.lastUpdated}`
    }

    // First, get the appointments
    const appointmentBundle = await client.search('Appointment', searchParams)
    const appointments = (appointmentBundle.entry || []).map(
      (entry) => entry.resource as Appointment,
    )

    // Collect all unique participant references from all appointments
    const allReferences = new Set<string>()
    appointments.forEach((appointment) => {
      appointment.participant?.forEach((participant) => {
        if (participant.actor?.reference) {
          allReferences.add(participant.actor.reference)
        }
      })
    })

    // Resolve all participant references in one batch request
    const resolvedResources = await resolveReferencesBatch(
      Array.from(allReferences),
    )

    // Create the combined bundle with appointments and resolved participants
    const combinedBundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: appointmentBundle.total,
      entry: [
        // Add all appointments
        ...(appointmentBundle.entry || []),
        // Add all resolved participant resources
        ...resolvedResources
          .filter((resource) => resource !== null)
          .map((resource) => ({
            resource: resource!,
          })),
      ],
    }

    const hasMore = appointments.length === pageSize

    let nextCursor: string | undefined
    if (hasMore && appointments.length > 0) {
      const lastRecord = appointments[appointments.length - 1]
      nextCursor = lastRecord.meta?.lastUpdated
    }

    let totalCount = appointmentBundle.total
    if (totalCount === undefined && appointments.length > 0) {
      totalCount = hasMore ? appointments.length + 1 : appointments.length
    }

    return {
      bundle: combinedBundle,
      hasMore,
      nextCursor,
      totalCount,
    }
  } catch (error) {
    console.error(
      'Error getting appointments with resolved participants:',
      error,
    )
    throw error
  }
}

/**
 * Resolve multiple FHIR references using batch requests
 */
export async function resolveReferencesBatch(
  references: string[],
): Promise<Array<Patient | Practitioner | Location | null>> {
  const client = await getServerClient()

  if (references.length === 0) {
    return []
  }

  try {
    // Create batch request
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'batch',
      entry: references.map((reference) => ({
        request: {
          method: 'GET',
          url: reference,
        },
      })),
    }

    const response = await client.executeBatch(bundle)
    return (response.entry || []).map(
      (entry) => entry.resource as Patient | Practitioner | Location | null,
    )
  } catch (error) {
    console.error('Error resolving references batch:', error)
    throw error
  }
}

/**
 * Get locations by their IDs
 */
export async function getLocationsFromReferences(
  locationRefList: string[],
): Promise<Location[]> {
  const client = await getServerClient()

  if (locationRefList.length === 0) {
    return []
  }

  try {
    const locations: Location[] = []

    // Process in batches to avoid URL length limits
    const batchSize = 50
    for (let i = 0; i < locationRefList.length; i += batchSize) {
      const batch = locationRefList.slice(i, i + batchSize)
      const searchParams = {
        _id: batch.join(','),
      }

      const bundle = await client.search('Location', searchParams)
      const batchLocations = (bundle.entry || []).map(
        (entry) => entry.resource as Location,
      )
      locations.push(...batchLocations)
    }

    return locations
  } catch (error) {
    console.error('Error fetching locations from references:', error)
    throw error
  }
}
