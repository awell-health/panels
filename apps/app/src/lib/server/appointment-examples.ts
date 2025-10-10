/**
 * Example usage of appointment participant resolution functions
 * This file demonstrates how to use the batch reference resolution
 */

import type {
  Appointment,
  Patient,
  Practitioner,
  Location,
} from '@medplum/fhirtypes'
import { getAppointmentsPaginated } from './medplum-server'
import {
  extractResourcesByType,
  resolveReferenceInBundle,
  getAppointmentsWithResolvedParticipants,
  BundleQueryExamples,
  createBundleQuery,
} from '@/lib/fhir-bundle-utils'

/**
 * Example appointment data (from your original example)
 */
export const exampleAppointment: Appointment = {
  resourceType: 'Appointment',
  identifier: [
    {
      use: 'usual',
      system: 'https://www.elationhealth.com/',
      value: '1085871633530970',
    },
  ],
  status: 'booked',
  start: '2025-10-03T14:00:00Z',
  end: '2025-10-03T15:15:00Z',
  minutesDuration: 75,
  participant: [
    {
      actor: {
        reference: 'Patient/0199a008-19f7-73c9-a2f5-495559e5aab7',
      },
      required: 'required',
      status: 'accepted',
    },
    {
      actor: {
        reference: 'Practitioner/01999ff3-cdd5-76e8-90f4-7d31059c669e',
      },
      required: 'required',
      status: 'accepted',
    },
    {
      actor: {
        reference: 'Location/01999ff3-cec8-723e-a774-d4eb4bd68c50',
      },
      required: 'required',
      status: 'accepted',
    },
  ],
  id: '0199a008-1ace-7738-9676-51315706cde5',
  meta: {
    project: '0196d846-f275-7096-ba15-5ca3204cf8f4',
    compartment: [
      {
        reference: 'Project/0196d846-f275-7096-ba15-5ca3204cf8f4',
      },
      {
        reference: 'Patient/0199a008-19f7-73c9-a2f5-495559e5aab7',
      },
    ],
    versionId: '0199a401-ee03-723b-a295-7b9295f19dc7',
    lastUpdated: '2025-10-02T08:20:13.955Z',
    author: {
      reference: 'Practitioner/0196d846-f2cf-731b-93a0-a669fc462e42',
      display: 'Flavio Ferreira',
    },
  },
}

/**
 * Example 1: Get appointments with resolved participants as FHIR Bundle
 */
export async function exampleGetAppointmentsWithParticipants() {
  try {
    console.log(
      'Fetching appointments with resolved participants as FHIR Bundle...',
    )

    const result = await getAppointmentsPaginated({
      pageSize: 10,
    })

    console.log('Appointments Bundle:', {
      totalResources: result.bundle.entry?.length || 0,
      hasMore: result.hasMore,
      totalCount: result.totalCount,
    })

    // Extract appointments and participants from the bundle
    const appointments =
      result.bundle.entry
        ?.filter((entry) => entry.resource?.resourceType === 'Appointment')
        .map((entry) => entry.resource as Appointment) || []

    const patients =
      result.bundle.entry
        ?.filter((entry) => entry.resource?.resourceType === 'Patient')
        .map((entry) => entry.resource as Patient) || []

    const practitioners =
      result.bundle.entry
        ?.filter((entry) => entry.resource?.resourceType === 'Practitioner')
        .map((entry) => entry.resource as Practitioner) || []

    const locations =
      result.bundle.entry
        ?.filter((entry) => entry.resource?.resourceType === 'Location')
        .map((entry) => entry.resource as Location) || []

    console.log('Bundle contents:', {
      appointments: appointments.length,
      patients: patients.length,
      practitioners: practitioners.length,
      locations: locations.length,
    })

    // Log each appointment with its participants using FHIR path-like navigation
    appointments.forEach((appointment, index) => {
      console.log(`\nAppointment ${index + 1} (${appointment.id}):`)
      console.log(`  Status: ${appointment.status}`)
      console.log(`  Start: ${appointment.start}`)
      console.log(`  End: ${appointment.end}`)

      // Navigate to participants using FHIR path-like approach
      appointment.participant?.forEach((participant, pIndex) => {
        if (participant.actor?.reference) {
          const [resourceType, resourceId] =
            participant.actor.reference.split('/')

          // Find the resolved resource in the bundle
          let resolvedResource: Patient | Practitioner | Location | null = null

          switch (resourceType) {
            case 'Patient':
              resolvedResource =
                patients.find((p) => p.id === resourceId) || null
              break
            case 'Practitioner':
              resolvedResource =
                practitioners.find((p) => p.id === resourceId) || null
              break
            case 'Location':
              resolvedResource =
                locations.find((l) => l.id === resourceId) || null
              break
          }

          console.log(`  Participant ${pIndex + 1}:`)
          console.log(`    Reference: ${participant.actor.reference}`)
          console.log(`    Status: ${participant.status}`)
          console.log(`    Required: ${participant.required}`)

          if (resolvedResource) {
            console.log(`    Resolved Resource:`)
            console.log(`      Type: ${resolvedResource.resourceType}`)
            console.log(`      ID: ${resolvedResource.id}`)

            // Display resource-specific information
            switch (resolvedResource.resourceType) {
              case 'Patient':
                const patient = resolvedResource as Patient
                console.log(
                  `      Name: ${patient.name?.[0]?.given?.join(' ')} ${patient.name?.[0]?.family}`,
                )
                console.log(`      Birth Date: ${patient.birthDate}`)
                break
              case 'Practitioner':
                const practitioner = resolvedResource as Practitioner
                console.log(
                  `      Name: ${practitioner.name?.[0]?.given?.join(' ')} ${practitioner.name?.[0]?.family}`,
                )
                break
              case 'Location':
                const location = resolvedResource as Location
                console.log(`      Name: ${location.name}`)
                console.log(
                  `      Address: ${location.address?.line?.join(', ')}`,
                )
                break
            }
          } else {
            console.log(
              `    ❌ Could not resolve reference: ${participant.actor.reference}`,
            )
          }
        }
      })
    })

    return result
  } catch (error) {
    console.error('Error fetching appointments with participants:', error)
    throw error
  }
}

/**
 * Example 2: FHIR Path Navigation with Bundle (using utility functions)
 */
export function exampleFhirPathNavigation(bundle: any) {
  console.log(
    '\n=== FHIR Path Navigation Examples (Using Utility Functions) ===',
  )

  // Extract resources by type using utility functions
  const appointments = extractResourcesByType<Appointment>(
    bundle,
    'Appointment',
  )
  const patients = extractResourcesByType<Patient>(bundle, 'Patient')
  const practitioners = extractResourcesByType<Practitioner>(
    bundle,
    'Practitioner',
  )
  const locations = extractResourcesByType<Location>(bundle, 'Location')

  console.log('Bundle resource counts:', {
    appointments: appointments.length,
    patients: patients.length,
    practitioners: practitioners.length,
    locations: locations.length,
  })

  // FHIR Path expressions using utility functions
  console.log('\n--- Working FHIR Path Queries (Using Utilities) ---')

  // 1. Find all appointments with status 'booked'
  // FHIR path: Appointment.status = 'booked'
  const bookedAppointments = BundleQueryExamples.findBookedAppointments(bundle)
  console.log(`Appointments with status 'booked': ${bookedAppointments.length}`)

  // 2. Find all patients with a specific birth year
  // FHIR path: Patient.birthDate starts with '1990'
  const patientsBornIn1990 = BundleQueryExamples.findPatientsBornInYear(
    bundle,
    '1990',
  )
  console.log(`Patients born in 1990: ${patientsBornIn1990.length}`)

  // 3. Find all practitioners with specific qualifications
  // FHIR path: Practitioner.qualification exists
  const qualifiedPractitioners =
    BundleQueryExamples.findQualifiedPractitioners(bundle)
  console.log(
    `Practitioners with qualifications: ${qualifiedPractitioners.length}`,
  )

  // 4. Find all locations in a specific city
  // FHIR path: Location.address.city contains 'anytown'
  const cityLocations = BundleQueryExamples.findLocationsInCity(
    bundle,
    'anytown',
  )
  console.log(`Locations in 'anytown': ${cityLocations.length}`)

  // 5. Navigate from appointment to participants using utility functions
  console.log('\n--- Reference Resolution Using Utility Functions ---')
  const appointmentsWithParticipants =
    BundleQueryExamples.getAppointmentParticipants(bundle)

  appointmentsWithParticipants.forEach((item, index) => {
    const { appointment, participants } = item
    console.log(`\nAppointment ${index + 1} (${appointment.id}):`)
    console.log(`  Status: ${appointment.status}`)
    console.log(`  Start: ${appointment.start}`)
    console.log(`  Participants: ${participants.length}`)

    participants.forEach((participantItem, pIndex) => {
      const { participant, resolvedActor } = participantItem
      console.log(
        `    Participant ${pIndex + 1}: ${participant.actor?.reference}`,
      )
      console.log(`    Status: ${participant.status}`)
      console.log(`    Required: ${participant.required}`)

      if (resolvedActor) {
        console.log(
          `      Resolved: ${resolvedActor.resourceType}/${resolvedActor.id}`,
        )
        // FHIR path: Patient.name.given or Practitioner.name.given
        if (resolvedActor.name?.[0]?.given) {
          console.log(
            `      Name: ${resolvedActor.name[0].given.join(' ')} ${resolvedActor.name[0].family}`,
          )
        }
      } else {
        console.log(
          `      ❌ Could not resolve reference: ${participant.actor?.reference}`,
        )
      }
    })
  })

  return {
    appointments,
    patients,
    practitioners,
    locations,
    bookedAppointments,
    patientsBornIn1990,
    qualifiedPractitioners,
    cityLocations,
    appointmentsWithParticipants,
  }
}

/**
 * Example 2b: Using BundleQuery class for more complex queries
 */
export function exampleBundleQueryClass(bundle: any) {
  console.log('\n=== BundleQuery Class Examples ===')

  const query = createBundleQuery(bundle)

  // Find appointments with specific conditions
  const urgentAppointments = query.whereAppointments(
    (apt) => apt.priority === 'urgent',
  )
  console.log(`Urgent appointments: ${urgentAppointments.length}`)

  // Find patients with specific conditions
  const malePatients = query.wherePatients(
    (patient) => patient.gender === 'male',
  )
  console.log(`Male patients: ${malePatients.length}`)

  // Get all appointments with their resolved participants
  const appointmentsWithParticipants = query.getAppointmentsWithParticipants()
  console.log(
    `Appointments with participants: ${appointmentsWithParticipants.length}`,
  )

  return {
    urgentAppointments,
    malePatients,
    appointmentsWithParticipants,
  }
}

/**
 * Example 3: Get appointments with pagination
 */
export async function exampleGetAppointmentsPaginated() {
  try {
    console.log('Fetching appointments with pagination...')

    let cursor: string | undefined
    const allBundles: any[] = []
    let page = 1

    do {
      console.log(`Fetching page ${page}...`)

      const result = await getAppointmentsPaginated({
        pageSize: 5,
        lastUpdated: cursor,
      })

      allBundles.push(result.bundle)
      cursor = result.nextCursor
      page++

      console.log(
        `Page ${page - 1}: ${result.bundle.entry?.length || 0} resources`,
      )

      // Break after 3 pages for demo
      if (page > 3) break
    } while (cursor)

    console.log(`Total bundles fetched: ${allBundles.length}`)
    return allBundles
  } catch (error) {
    console.error('Error fetching paginated appointments:', error)
    throw error
  }
}

/**
 * Example 4: Display appointment and participant information from Bundle
 */
export function displayAppointmentInfoFromBundle(result: any) {
  console.log('\n=== Appointment Information from Bundle ===')

  // Extract appointments from bundle
  const appointments =
    result.bundle.entry
      ?.filter((entry: any) => entry.resource?.resourceType === 'Appointment')
      .map((entry: any) => entry.resource) || []

  appointments.forEach((appointment: any, index: number) => {
    console.log(`\nAppointment ${index + 1}:`)
    console.log(`  ID: ${appointment.id}`)
    console.log(`  Status: ${appointment.status}`)
    console.log(`  Start: ${appointment.start}`)
    console.log(`  End: ${appointment.end}`)
    console.log(`  Duration: ${appointment.minutesDuration} minutes`)

    // Navigate to participants using FHIR path
    appointment.participant?.forEach((participant: any, pIndex: number) => {
      console.log(`  Participant ${pIndex + 1}:`)
      console.log(`    Reference: ${participant.actor?.reference}`)
      console.log(`    Status: ${participant.status}`)
      console.log(`    Required: ${participant.required}`)
    })
  })
}

/**
 * Example 5: Complete workflow - fetch appointments with resolved participants as Bundle
 */
export async function exampleCompleteWorkflow() {
  try {
    console.log('=== Complete Appointment Workflow with FHIR Bundle ===\n')

    // Step 1: Get appointments with resolved participants as Bundle
    const result = await exampleGetAppointmentsWithParticipants()

    // Step 2: Demonstrate FHIR path navigation
    const navigationResults = exampleFhirPathNavigation(result.bundle)

    // Step 3: Display detailed information
    displayAppointmentInfoFromBundle(result)

    // Step 4: Return structured data for further processing
    return {
      bundle: result.bundle,
      navigationResults,
      summary: {
        totalResources: result.bundle.entry?.length || 0,
        hasMore: result.hasMore,
        totalCount: result.totalCount,
        appointments: navigationResults.appointments.length,
        patients: navigationResults.patients.length,
        practitioners: navigationResults.practitioners.length,
        locations: navigationResults.locations.length,
      },
    }
  } catch (error) {
    console.error('Error in complete workflow:', error)
    throw error
  }
}

// Export the example functions for use in other files
export {
  exampleGetAppointmentsWithParticipants,
  exampleFhirPathNavigation,
  exampleBundleQueryClass,
  exampleGetAppointmentsPaginated,
  displayAppointmentInfoFromBundle,
  exampleCompleteWorkflow,
}
