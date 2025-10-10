import type {
  Patient,
  Practitioner,
  Location,
  Appointment,
  Bundle,
} from '@medplum/fhirtypes'

/**
 * Bundle containing appointments with their resolved participant resources
 * This allows using FHIR path expressions to navigate the data
 */
export interface AppointmentBundle extends Bundle {
  resourceType: 'Bundle'
  type: 'searchset'
  entry: Array<{
    resource: Appointment | Patient | Practitioner | Location
  }>
  // Pagination metadata
  hasMore?: boolean
  nextCursor?: string
  totalCount?: number
}

/**
 * Result of paginated appointments with resolved participants in Bundle format
 */
export interface PaginatedAppointmentBundleResult {
  bundle: AppointmentBundle
  hasMore: boolean
  nextCursor?: string
  totalCount?: number
}

/**
 * Utility type for participant actor reference
 */
export type ParticipantActorReference = {
  reference: string
  display?: string
}

/**
 * Utility type for participant with resolved actor
 */
export type ParticipantWithResolvedActor = {
  actor?: ParticipantActorReference
  required?: 'required' | 'optional' | 'information-only'
  status?: 'accepted' | 'declined' | 'tentative' | 'needs-action'
  resolvedActor?: Patient | Practitioner | Location | null
}
