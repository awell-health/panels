'use server'

import { MedplumClient } from '@medplum/core'
import type {
  Patient,
  Practitioner,
  Appointment,
  Location,
  Bundle,
  BundleEntry,
  ResourceType,
} from '@medplum/fhirtypes'
import { getRuntimeConfig } from '@/lib/config'
import type { Column, Filter } from '@/types/panel'
import { resolveDateFilter } from '@/lib/dynamic-date-filter'

export interface PaginationOptions {
  pageSize?: number
  lastUpdated?: string
  sort?: {
    columnId: string
    direction: 'asc' | 'desc'
  }
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
 * Convert panel sort configuration to FHIR search sort parameter
 */
function convertSortToFHIR(
  sort: { columnId: string; direction: 'asc' | 'desc' } | undefined,
  columns: Column[],
): string {
  if (!sort) {
    return '-_lastUpdated' // Default sort
  }

  const column = columns.find((col) => col.id === sort.columnId)
  if (!column?.sourceField) {
    return '-_lastUpdated' // Fallback to default if column not found
  }

  // Convert sourceField to FHIR search parameter
  // For example: "start" -> "start", "participant.actor.display" -> "participant"
  const fhirSortField = column.sourceField.split('.')[0]
  const direction = sort.direction === 'desc' ? '-' : ''

  return `${direction}${fhirSortField}`
}

/**
 * Convert panel filters to Medplum _filter parameter
 * Based on https://www.medplum.com/docs/search/filter-search-parameter
 */
function convertFiltersToFHIR(filters: Filter[], columns: Column[]): string {
  if (!filters || filters.length === 0) {
    return ''
  }

  const filterExpressions = filters
    .filter((filter) => filter.value && filter.value.trim() !== '')
    .map((filter) => {
      const column = columns.find((col) => col.id === filter.columnId)
      if (!column?.sourceField) {
        console.warn(`Column not found for filter: ${filter.columnId}`)
        return null
      }

      // we can't filter on server side based on other resource types
      if (
        column?.sourceField?.includes('entry.resource.ofType') ||
        column?.sourceField?.includes('extension')
      ) {
        return null
      }

      const sourceField = column.sourceField
      const value = filter.value.trim()

      // Check if this field can be filtered server-side
      const isServerSideFilterable = (field: string): boolean => {
        // Fields that cannot be filtered server-side (no direct FHIR search parameters)
        const nonFilterableFields = [
          'description', // No standard search parameter for description
          'statusReason', // No standard search parameter for statusReason
          'comment', // No standard search parameter for comment
          'note', // No standard search parameter for note
        ]

        return !nonFilterableFields.includes(field)
      }

      // Skip server-side filtering for non-filterable fields
      if (!isServerSideFilterable(sourceField)) {
        console.warn(
          `Skipping server-side filter for field: ${sourceField} (no FHIR search parameter available)`,
        )
        return null
      }

      // Map FHIR field names to search parameters for Appointment resources
      const getSearchParameter = (field: string): string => {
        // Map Appointment-specific fields to their search parameters
        const appointmentMappings: Record<string, string> = {
          start: 'date', // Appointment.start -> date search parameter
          end: 'date', // Appointment.end -> date search parameter
          'patient.name.given': 'patient', // Patient name -> patient search parameter
          'patient.name.family': 'patient', // Patient family name -> patient search parameter
          'participant.actor.display': 'actor', // Participant display -> actor search parameter
        }

        return appointmentMappings[field] || field
      }

      const searchParam = getSearchParameter(sourceField)

      // Handle date range filters (format: YYYY-MM-DD#YYYY-MM-DD)
      if (column.type === 'date' || column.type === 'datetime') {
        if (value.includes('#')) {
          const [startDate, endDate] = value.split('#')

          // Build query based on which dates are provided
          const conditions = []
          if (startDate) {
            conditions.push(`${searchParam} ge "${startDate}"`)
          }
          if (endDate) {
            conditions.push(`${searchParam} le "${endDate}"`)
          }

          // At least one date must be provided
          if (conditions.length === 0) {
            throw new Error(
              `Invalid date range filter: at least one date must be provided. Received: "${value}"`,
            )
          }

          return conditions.length === 1
            ? conditions[0]
            : `(${conditions.join(' and ')})`
        }

        if (value.startsWith('@')) {
          // Handle dynamic date filters
          try {
            const resolvedDate = resolveDateFilter(value)
            const [startDate, endDate] = resolvedDate.split('#')

            // Build query based on which dates are provided
            const conditions = []
            if (startDate) {
              conditions.push(`${searchParam} ge "${startDate}"`)
            }
            if (endDate) {
              conditions.push(`${searchParam} le "${endDate}"`)
            }

            // At least one date must be provided
            if (conditions.length === 0) {
              throw new Error(
                `Invalid resolved date range filter: at least one date must be provided. Resolved: "${resolvedDate}"`,
              )
            }

            return conditions.length === 1
              ? conditions[0]
              : `(${conditions.join(' and ')})`
          } catch (error) {
            console.warn(
              `Failed to resolve dynamic date filter: ${value}`,
              error,
            )
            return null
          }
        } else {
          // Single date value - use exact match
          return `${searchParam} eq "${value}"`
        }
      }

      // Handle numeric filters
      if (column.type === 'number') {
        // For numeric values, use exact match
        return `${searchParam} eq ${value}`
      }

      // Handle text filters with contains operator (case-insensitive)
      // Escape quotes in the value to prevent injection
      const escapedValue = value.replace(/"/g, '\\"')
      return `${searchParam} co "${escapedValue}"`
    })
    .filter((expr) => expr !== null)

  if (filterExpressions.length === 0) {
    return ''
  }

  // Combine multiple filters with AND operator
  const result = filterExpressions.join(' and ')

  return result
}

/**
 * Get or create the server-side Medplum client
 */
export async function getServerClient(): Promise<MedplumClient> {
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
 * Get a single appointment by ID
 */
export async function getLastAppointment(): Promise<Appointment> {
  const client = await getServerClient()
  const appointments = await client.search('Appointment', {
    _sort: '-_lastUpdated',
    _count: '1',
  })
  return appointments.entry?.[0]?.resource as Appointment
}

/**
 * Get patient appointments with resolved location references as a FHIR Bundle
 * This allows using FHIR path expressions to navigate the data
 */
export async function getPatientAppointments(
  patientId: string,
): Promise<Appointment[]> {
  const client = await getServerClient()

  try {
    const bundle = await client.search('Appointment', {
      patient: `Patient/${patientId}`,
      _sort: '-_lastUpdated',
    })

    return (bundle.entry || []).map((entry) => entry.resource as Appointment)
  } catch (error) {
    console.error('Error fetching patient appointments:', error)
    throw error
  }
}

/**
 * Get all appointments with resolved participant references as a FHIR Bundle
 * This allows using FHIR path expressions to navigate the data
 */
export async function getAllAppointments(
  columns: Column[] = [],
  filters: Filter[] = [],
): Promise<BundleEntry[]> {
  const client = await getServerClient()

  try {
    const sortParam = convertSortToFHIR(undefined, columns)
    const filterParam = convertFiltersToFHIR(filters, columns)
    const referencedColumns =
      columns
        .filter((col) => col.tags?.includes('panels:appointments'))
        .filter((col) => col.sourceField?.includes('entry.resource.ofType'))
        .map((col) => {
          const regex = /ofType\(([^)]+)\)/
          const match = col.sourceField?.match(regex)
          return match?.[1] || ''
        }) || []

    // First try with _include for better performance
    try {
      const searchParams: Record<string, string> = {
        _count: '500', // Start with smaller count
        _sort: sortParam || '-_lastUpdated',
        _total: 'accurate',
        _include:
          'Appointment:participant:Patient,Appointment:participant:Practitioner',
        _revinclude: 'Appointment:participant:Location',
      }

      // Add _filter parameter if filters are provided
      if (filterParam) {
        searchParams._filter = filterParam
      }

      const appointmentBundle = await client.search('Appointment', searchParams)

      const result = (appointmentBundle.entry || []).map((entry) => ({
        resource: entry.resource,
        fullUrl: entry.fullUrl,
      }))

      return result
    } catch (includeError) {
      // If _include fails due to query scope limit, fall back to batch approach
      const searchParams: Record<string, string> = {
        _count: '10000', // Set a high count to get all results
        _sort: sortParam || '-_lastUpdated',
        _total: 'accurate',
      }

      // Add _filter parameter if filters are provided
      if (filterParam) {
        searchParams._filter = filterParam
      }

      // First, get the appointments
      const appointmentBundle = await client.search('Appointment', searchParams)

      const appointments = (appointmentBundle.entry || []).map(
        (entry) => entry.resource as Appointment,
      )

      // Collect all unique participant references from all appointments
      const allReferences = new Set<string>()
      for (const appointment of appointments) {
        for (const participant of appointment.participant || []) {
          if (participant.actor?.reference) {
            allReferences.add(participant.actor.reference)
          }
        }
      }

      // Resolve all participant references in one batch request
      const resolvedResources = await resolveReferencesBatch(
        Array.from(allReferences),
      )

      // Create nested bundle structure where each appointment has its own bundle
      // with the appointment and all its related participants
      const nestedEntries = appointments.map((appointment) => {
        // Find all participants for this appointment
        const appointmentParticipants = appointment.participant || []

        // Create entries for this appointment's bundle
        const appointmentBundleEntries = [
          // Add the appointment itself
          {
            resource: appointment,
            fullUrl: `Appointment/${appointment.id}`,
            search: {
              mode: 'match' as const,
            },
          },
          // Add all resolved participants for this appointment
          ...appointmentParticipants
            .map((participant) => {
              if (participant.actor?.reference) {
                // Find the resolved resource for this reference
                const resolvedResource = resolvedResources.find(
                  (resource) =>
                    resource &&
                    `${resource.resourceType}/${resource.id}` ===
                      participant.actor?.reference,
                )
                if (resolvedResource) {
                  return {
                    resource: resolvedResource,
                    fullUrl: participant.actor.reference,
                  }
                }
              }
              return null
            })
            .filter((entry) => entry !== null),
        ]

        // Create a bundle for this appointment
        const appointmentBundle: Bundle = {
          resourceType: 'Bundle',
          type: 'searchset',
          entry: appointmentBundleEntries,
          total: appointmentBundleEntries.length,
        }

        return {
          resource: appointmentBundle,
          fullUrl: `AppointmentBundle/${appointment.id}`,
        }
      })

      return nestedEntries
    }
  } catch (error) {
    console.error('Error fetching appointments with participants:', error)
    throw error
  }
}

/**
 * Resolve multiple FHIR references using optimized parallel requests
 * Uses throttling, caching, and smart chunking for best performance
 */
export async function resolveReferencesBatch(
  references: string[],
): Promise<Array<Patient | Practitioner | Location | null>> {
  const client = await getServerClient()

  if (references.length === 0) {
    return []
  }

  try {
    // Deduplicate references and create lookup map
    const uniqueReferences = [...new Set(references)]

    const referenceMap = new Map<string, number>()
    references.forEach((ref, index) => {
      referenceMap.set(ref, index)
    })

    // Group by resource type
    const referencesByType = uniqueReferences.reduce(
      (acc, ref) => {
        const [resourceType] = ref.split('/')
        if (!acc[resourceType]) {
          acc[resourceType] = []
        }
        acc[resourceType].push(ref)
        return acc
      },
      {} as Record<string, string[]>,
    )

    // Process each resource type with throttling
    const allResources: Array<Patient | Practitioner | Location | null> =
      new Array(references.length).fill(null)

    for (const [resourceType, refs] of Object.entries(referencesByType)) {
      const ids = refs.map((ref) => ref.split('/')[1]).filter(Boolean)

      if (ids.length === 0) continue

      // Use larger chunks for better performance (100 instead of 50)
      const chunkSize = 100
      const chunks = []
      for (let i = 0; i < ids.length; i += chunkSize) {
        chunks.push(ids.slice(i, i + chunkSize))
      }

      // Process chunks with throttling (max 3 concurrent)
      const concurrencyLimit = 3
      for (let i = 0; i < chunks.length; i += concurrencyLimit) {
        const chunkBatch = chunks.slice(i, i + concurrencyLimit)

        const chunkPromises = chunkBatch.map(async (chunk) => {
          const searchParams = {
            _id: chunk.join(','),
            _count: '1000',
            _total: 'none',
          }

          try {
            const bundle = await client.search(
              resourceType as ResourceType,
              searchParams,
            )
            return (bundle.entry || []).map((entry) => entry.resource)
          } catch (error) {
            console.warn(`Failed to search ${resourceType} chunk:`, error)
            return []
          }
        })

        const chunkResults = await Promise.all(chunkPromises)
        const resources = chunkResults.flat()

        // Map resources back to their original positions
        for (const resource of resources) {
          if (resource) {
            const ref = `${resource.resourceType}/${resource.id}`
            const originalIndex = referenceMap.get(ref)
            if (originalIndex !== undefined) {
              allResources[originalIndex] = resource as
                | Patient
                | Practitioner
                | Location
            }
          }
        }
      }
    }

    return allResources
  } catch (error) {
    console.error('Error resolving references batch:', error)
    throw error
  }
}
