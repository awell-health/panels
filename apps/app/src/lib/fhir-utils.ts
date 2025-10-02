import type {
  Appointment,
  CodeableConcept,
  Coding,
  Location,
} from '@medplum/fhirtypes'

/**
 * Safely extracts the first coding's display value from a CodeableConcept
 * @param codeableConcept - The CodeableConcept to extract from
 * @param fallback - Fallback value if no display is found
 * @returns The display value or fallback
 */
export function getFirstCodingDisplay(
  codeableConcept: CodeableConcept | undefined,
  fallback = 'Unknown',
): string {
  return codeableConcept?.coding?.[0]?.display || fallback
}

/**
 * Safely extracts the first coding's code value from a CodeableConcept
 * @param codeableConcept - The CodeableConcept to extract from
 * @param fallback - Fallback value if no code is found
 * @returns The code value or fallback
 */
export function getFirstCodingCode(
  codeableConcept: CodeableConcept | undefined,
  fallback = '',
): string {
  return codeableConcept?.coding?.[0]?.code || fallback
}

/**
 * Safely extracts the first coding's system value from a CodeableConcept
 * @param codeableConcept - The CodeableConcept to extract from
 * @param fallback - Fallback value if no system is found
 * @returns The system value or fallback
 */
export function getFirstCodingSystem(
  codeableConcept: CodeableConcept | undefined,
  fallback = '',
): string {
  return codeableConcept?.coding?.[0]?.system || fallback
}

/**
 * Safely extracts the first coding object from a CodeableConcept
 * @param codeableConcept - The CodeableConcept to extract from
 * @returns The first coding object or undefined
 */
export function getFirstCoding(
  codeableConcept: CodeableConcept | undefined,
): Coding | undefined {
  return codeableConcept?.coding?.[0]
}

/**
 * Safely gets the first element of an array with proper null checking
 * @param array - Array to access
 * @returns First element or undefined
 */
export function safeArrayFirst<T>(array: T[] | undefined): T | undefined {
  return array?.[0]
}

/**
 * Extracts unique location references from appointments
 * @param appointments - Array of appointments to extract location references from
 * @returns Array of unique location references
 */
export function extractLocationReferences(
  appointments: Appointment[],
): string[] {
  const locationRefs = appointments
    .flatMap((appointment) => appointment.participant || [])
    .filter((participant) =>
      participant.actor?.reference?.startsWith('Location/'),
    )
    .map((participant) => participant.actor?.reference)
    .filter((ref): ref is string => ref !== undefined)
    .filter((ref, index, arr) => arr.indexOf(ref) === index) // unique refs

  return locationRefs
}

/**
 * Gets location name from a location reference
 * @param reference - Location reference (e.g., "Location/123")
 * @param locations - Array of location resources
 * @returns Location name or fallback
 */
export function getLocationNameFromReference(
  reference: string,
  locations: Location[],
): string {
  if (!reference || !reference.startsWith('Location/')) {
    return 'Unknown Location'
  }

  const locationId = reference.split('/')[1]
  const location = locations.find((loc) => loc.id === locationId)

  // Try different name fields in order of preference
  return (
    location?.name ||
    location?.alias?.[0] ||
    location?.description ||
    `Location ${locationId}`
  )
}

/**
 * Resolves location names for appointments
 * @param appointments - Array of appointments
 * @param locations - Array of location resources
 * @returns Array of appointments with resolved location names
 */
export function resolveLocationNames(
  appointments: Appointment[],
  locations: Location[],
): Array<Appointment & { locationName?: string }> {
  return appointments.map((appointment) => {
    const locationRef = appointment.participant?.find((p) =>
      p.actor?.reference?.startsWith('Location/'),
    )?.actor?.reference

    const locationName = locationRef
      ? getLocationNameFromReference(locationRef, locations)
      : undefined

    return {
      ...appointment,
      locationName,
    }
  })
}

/**
 * Gets the first location reference from an appointment
 * @param appointment - Appointment to get location reference from
 * @returns Location reference or undefined
 */
export function getFirstLocationReference(
  appointment: Appointment,
): string | undefined {
  return appointment.participant?.find((p) =>
    p.actor?.reference?.startsWith('Location/'),
  )?.actor?.reference
}
