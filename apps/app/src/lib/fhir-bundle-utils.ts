/**
 * FHIR Bundle utilities for working with appointment participants
 * These utilities provide alternatives to the FHIR path resolve() function
 * which is not implemented in the standard fhirpath library
 */

import type {
  Bundle,
  Appointment,
  Patient,
  Practitioner,
  Location,
} from '@medplum/fhirtypes'

/**
 * Extract all resources of a specific type from a FHIR Bundle
 */
export function extractResourcesByType<T>(
  bundle: Bundle,
  resourceType: string,
): T[] {
  return (
    bundle.entry
      ?.filter((entry) => entry.resource?.resourceType === resourceType)
      .map((entry) => entry.resource as T) || []
  )
}

/**
 * Find a specific resource in a bundle by type and ID
 * This is an alternative to the FHIR path resolve() function
 */
export function findResourceInBundle(
  bundle: Bundle,
  resourceType: string,
  resourceId: string,
): any {
  return (
    bundle.entry?.find(
      (entry) =>
        entry.resource?.resourceType === resourceType &&
        entry.resource?.id === resourceId,
    )?.resource || null
  )
}

/**
 * Resolve a FHIR reference within a bundle
 * @param bundle - The FHIR Bundle containing all resources
 * @param reference - The reference string (e.g., "Patient/123")
 * @returns The resolved resource or null if not found
 */
export function resolveReferenceInBundle(
  bundle: Bundle,
  reference: string,
): any {
  if (!reference) return null

  const [resourceType, resourceId] = reference.split('/')
  if (!resourceType || !resourceId) return null

  return findResourceInBundle(bundle, resourceType, resourceId)
}

/**
 * Get all appointments from a bundle with their resolved participants
 */
export function getAppointmentsWithResolvedParticipants(bundle: Bundle): Array<{
  appointment: Appointment
  participants: Array<{
    participant: any
    resolvedActor: Patient | Practitioner | Location | null
  }>
}> {
  const appointments = extractResourcesByType<Appointment>(
    bundle,
    'Appointment',
  )

  return appointments.map((appointment) => {
    const participants =
      appointment.participant?.map((participant) => {
        const reference = participant.actor?.reference
        const resolvedActor = reference
          ? resolveReferenceInBundle(bundle, reference)
          : null

        return {
          participant,
          resolvedActor,
        }
      }) || []

    return {
      appointment,
      participants,
    }
  })
}

/**
 * Get all unique participant references from appointments in a bundle
 */
export function getParticipantReferences(bundle: Bundle): string[] {
  const appointments = extractResourcesByType<Appointment>(
    bundle,
    'Appointment',
  )
  const references = new Set<string>()

  for (const appointment of appointments) {
    for (const participant of appointment.participant || []) {
      if (participant.actor?.reference) {
        references.add(participant.actor.reference)
      }
    }
  }

  return Array.from(references)
}

/**
 * Check if all participant references in appointments are resolved in the bundle
 */
export function areAllParticipantsResolved(bundle: Bundle): {
  allResolved: boolean
  unresolvedReferences: string[]
} {
  const appointments = extractResourcesByType<Appointment>(
    bundle,
    'Appointment',
  )
  const unresolvedReferences: string[] = []

  for (const appointment of appointments) {
    for (const participant of appointment.participant || []) {
      const reference = participant.actor?.reference
      if (reference) {
        const resolved = resolveReferenceInBundle(bundle, reference)
        if (!resolved) {
          unresolvedReferences.push(reference)
        }
      }
    }
  }

  return {
    allResolved: unresolvedReferences.length === 0,
    unresolvedReferences,
  }
}

/**
 * Get statistics about the bundle contents
 */
export function getBundleStatistics(bundle: Bundle): {
  totalResources: number
  appointments: number
  patients: number
  practitioners: number
  locations: number
  otherResources: number
} {
  const totalResources = bundle.entry?.length || 0
  const appointments = extractResourcesByType<Appointment>(
    bundle,
    'Appointment',
  ).length
  const patients = extractResourcesByType<Patient>(bundle, 'Patient').length
  const practitioners = extractResourcesByType<Practitioner>(
    bundle,
    'Practitioner',
  ).length
  const locations = extractResourcesByType<Location>(bundle, 'Location').length
  const otherResources =
    totalResources - appointments - patients - practitioners - locations

  return {
    totalResources,
    appointments,
    patients,
    practitioners,
    locations,
    otherResources,
  }
}

/**
 * FHIR Path-like queries that work without the resolve() function
 */
export class BundleQuery {
  private bundle: Bundle

  constructor(bundle: Bundle) {
    this.bundle = bundle
  }

  /**
   * Find appointments matching a condition
   * @param condition - Function that takes an appointment and returns boolean
   */
  whereAppointments(
    condition: (appointment: Appointment) => boolean,
  ): Appointment[] {
    const appointments = extractResourcesByType<Appointment>(
      this.bundle,
      'Appointment',
    )
    return appointments.filter(condition)
  }

  /**
   * Find patients matching a condition
   * @param condition - Function that takes a patient and returns boolean
   */
  wherePatients(condition: (patient: Patient) => boolean): Patient[] {
    const patients = extractResourcesByType<Patient>(this.bundle, 'Patient')
    return patients.filter(condition)
  }

  /**
   * Find practitioners matching a condition
   * @param condition - Function that takes a practitioner and returns boolean
   */
  wherePractitioners(
    condition: (practitioner: Practitioner) => boolean,
  ): Practitioner[] {
    const practitioners = extractResourcesByType<Practitioner>(
      this.bundle,
      'Practitioner',
    )
    return practitioners.filter(condition)
  }

  /**
   * Find locations matching a condition
   * @param condition - Function that takes a location and returns boolean
   */
  whereLocations(condition: (location: Location) => boolean): Location[] {
    const locations = extractResourcesByType<Location>(this.bundle, 'Location')
    return locations.filter(condition)
  }

  /**
   * Get appointments with their resolved participants
   */
  getAppointmentsWithParticipants(): Array<{
    appointment: Appointment
    participants: Array<{
      participant: any
      resolvedActor: Patient | Practitioner | Location | null
    }>
  }> {
    return getAppointmentsWithResolvedParticipants(this.bundle)
  }
}

/**
 * Create a BundleQuery instance for easy querying
 */
export function createBundleQuery(bundle: Bundle): BundleQuery {
  return new BundleQuery(bundle)
}

/**
 * Create enhanced appointment objects with resolved participant data
 * This flattens the resolved participant data into the appointment object
 * for easier FHIR path access without needing resolve() function
 */
export function createEnhancedAppointments(bundle: Bundle): any[] {
  const appointmentsWithParticipants =
    getAppointmentsWithResolvedParticipants(bundle)

  return appointmentsWithParticipants.map(({ appointment, participants }) => {
    // Create a new appointment object with resolved participant data
    const enhancedAppointment = {
      ...appointment,
      // Add resolved participants as direct properties for easy access
      resolvedParticipants: participants.map(
        ({ participant, resolvedActor }) => ({
          ...participant,
          resolvedActor,
        }),
      ),
      // Add individual resolved participant properties for FHIR path access
      resolvedPatient: participants.find(
        (p) => p.resolvedActor?.resourceType === 'Patient',
      )?.resolvedActor,
      resolvedPractitioner: participants.find(
        (p) => p.resolvedActor?.resourceType === 'Practitioner',
      )?.resolvedActor,
      resolvedLocation: participants.find(
        (p) => p.resolvedActor?.resourceType === 'Location',
      )?.resolvedActor,
    }
    return enhancedAppointment
  })
}

/**
 * Example usage patterns that work without resolve() function
 */
export const BundleQueryExamples = {
  /**
   * Find all booked appointments
   * Equivalent to: Appointment.status = 'booked'
   */
  findBookedAppointments: (bundle: Bundle): Appointment[] => {
    return extractResourcesByType<Appointment>(bundle, 'Appointment').filter(
      (appointment) => appointment.status === 'booked',
    )
  },

  /**
   * Find all patients born in a specific year
   * Equivalent to: Patient.birthDate starts with '1990'
   */
  findPatientsBornInYear: (bundle: Bundle, year: string): Patient[] => {
    return extractResourcesByType<Patient>(bundle, 'Patient').filter(
      (patient) => patient.birthDate?.startsWith(year),
    )
  },

  /**
   * Find all practitioners with qualifications
   * Equivalent to: Practitioner.qualification exists
   */
  findQualifiedPractitioners: (bundle: Bundle): Practitioner[] => {
    return extractResourcesByType<Practitioner>(bundle, 'Practitioner').filter(
      (practitioner) =>
        practitioner.qualification && practitioner.qualification.length > 0,
    )
  },

  /**
   * Find all locations in a specific city
   * Equivalent to: Location.address.city contains 'anytown'
   */
  findLocationsInCity: (bundle: Bundle, city: string): Location[] => {
    return extractResourcesByType<Location>(bundle, 'Location').filter(
      (location) =>
        location.address?.city?.toLowerCase().includes(city.toLowerCase()),
    )
  },

  /**
   * Get appointment participants with resolved actors
   * This is the main use case that replaces resolve() function
   */
  getAppointmentParticipants: (bundle: Bundle) => {
    return getAppointmentsWithResolvedParticipants(bundle)
  },
}
