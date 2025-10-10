/**
 * Examples of using enhanced appointment objects with resolved participants
 * These examples show how to access participant data without using the resolve() function
 */

import type {
  Appointment,
  Patient,
  Practitioner,
  Location,
} from '@medplum/fhirtypes'
import { getAppointmentsPaginated } from './medplum-server'
import { createEnhancedAppointments } from '@/lib/fhir-bundle-utils'

/**
 * Example: Get enhanced appointments and demonstrate FHIR path access
 */
export async function exampleEnhancedAppointments() {
  try {
    console.log('=== Enhanced Appointments Example ===')

    // Get appointments with resolved participants as FHIR Bundle
    const result = await getAppointmentsPaginated({ pageSize: 5 })
    const bundle = result.bundle

    // Create enhanced appointment objects
    const enhancedAppointments = createEnhancedAppointments(bundle)

    console.log(`Found ${enhancedAppointments.length} enhanced appointments`)

    // Demonstrate FHIR path access without resolve() function
    enhancedAppointments.forEach((appointment, index) => {
      console.log(`\n--- Enhanced Appointment ${index + 1} ---`)
      console.log(`ID: ${appointment.id}`)
      console.log(`Status: ${appointment.status}`)
      console.log(`Start: ${appointment.start}`)
      console.log(`End: ${appointment.end}`)

      // Access resolved participants directly (no resolve() needed)
      console.log('\nResolved Participants:')

      if (appointment.resolvedPatient) {
        const patient = appointment.resolvedPatient as Patient
        console.log(
          `  Patient: ${patient.name?.[0]?.given?.join(' ')} ${patient.name?.[0]?.family}`,
        )
        console.log(`  Birth Date: ${patient.birthDate}`)
        console.log(`  Gender: ${patient.gender}`)
      }

      if (appointment.resolvedPractitioner) {
        const practitioner = appointment.resolvedPractitioner as Practitioner
        console.log(
          `  Practitioner: ${practitioner.name?.[0]?.given?.join(' ')} ${practitioner.name?.[0]?.family}`,
        )
      }

      if (appointment.resolvedLocation) {
        const location = appointment.resolvedLocation as Location
        console.log(`  Location: ${location.name}`)
        console.log(`  Address: ${location.address?.line?.join(', ')}`)
      }

      // Access all resolved participants
      console.log('\nAll Resolved Participants:')
      appointment.resolvedParticipants?.forEach((participant, pIndex) => {
        console.log(`  Participant ${pIndex + 1}:`)
        console.log(`    Status: ${participant.status}`)
        console.log(`    Required: ${participant.required}`)
        console.log(`    Actor Reference: ${participant.actor?.reference}`)

        if (participant.resolvedActor) {
          console.log(
            `    Resolved Actor: ${participant.resolvedActor.resourceType}/${participant.resolvedActor.id}`,
          )
          if (participant.resolvedActor.name?.[0]?.given) {
            console.log(
              `    Name: ${participant.resolvedActor.name[0].given.join(' ')} ${participant.resolvedActor.name[0].family}`,
            )
          }
        }
      })
    })

    return enhancedAppointments
  } catch (error) {
    console.error('Error in enhanced appointments example:', error)
    throw error
  }
}

/**
 * Example: FHIR Path expressions that work with enhanced appointments
 */
export function exampleFhirPathWithEnhancedAppointments(
  enhancedAppointments: any[],
) {
  console.log('\n=== FHIR Path Examples with Enhanced Appointments ===')

  // These FHIR path expressions work without resolve() function:

  // 1. Access appointment properties directly
  const bookedAppointments = enhancedAppointments.filter(
    (apt) => apt.status === 'booked',
  )
  console.log(`Booked appointments: ${bookedAppointments.length}`)

  // 2. Access resolved patient data directly
  const appointmentsWithPatients = enhancedAppointments.filter(
    (apt) => apt.resolvedPatient,
  )
  console.log(
    `Appointments with resolved patients: ${appointmentsWithPatients.length}`,
  )

  // 3. Access patient names without resolve()
  const patientNames = enhancedAppointments
    .filter((apt) => apt.resolvedPatient?.name?.[0]?.given)
    .map(
      (apt) =>
        `${apt.resolvedPatient.name[0].given.join(' ')} ${apt.resolvedPatient.name[0].family}`,
    )
  console.log('Patient names:', patientNames)

  // 4. Access practitioner names without resolve()
  const practitionerNames = enhancedAppointments
    .filter((apt) => apt.resolvedPractitioner?.name?.[0]?.given)
    .map(
      (apt) =>
        `${apt.resolvedPractitioner.name[0].given.join(' ')} ${apt.resolvedPractitioner.name[0].family}`,
    )
  console.log('Practitioner names:', practitionerNames)

  // 5. Access location names without resolve()
  const locationNames = enhancedAppointments
    .filter((apt) => apt.resolvedLocation?.name)
    .map((apt) => apt.resolvedLocation.name)
  console.log('Location names:', locationNames)

  // 6. Complex queries without resolve()
  const appointmentsWithAllParticipants = enhancedAppointments.filter(
    (apt) =>
      apt.resolvedPatient && apt.resolvedPractitioner && apt.resolvedLocation,
  )
  console.log(
    `Appointments with all participant types: ${appointmentsWithAllParticipants.length}`,
  )

  // 7. Access participant details without resolve()
  const allParticipants = enhancedAppointments.flatMap(
    (apt) => apt.resolvedParticipants || [],
  )
  const requiredParticipants = allParticipants.filter(
    (p) => p.required === 'required',
  )
  console.log(`Required participants: ${requiredParticipants.length}`)

  return {
    bookedAppointments,
    appointmentsWithPatients,
    patientNames,
    practitionerNames,
    locationNames,
    appointmentsWithAllParticipants,
    allParticipants,
    requiredParticipants,
  }
}

/**
 * Example: Column sourceField expressions that work with enhanced appointments
 */
export function exampleColumnSourceFields() {
  console.log('\n=== Column SourceField Examples ===')

  // These sourceField expressions work with enhanced appointments:
  const columnExamples = [
    {
      name: 'Appointment Status',
      sourceField: 'status',
      description: 'Direct access to appointment status',
    },
    {
      name: 'Patient Name',
      sourceField:
        'resolvedPatient.name[0].given[0] + " " + resolvedPatient.name[0].family',
      description: 'Access resolved patient name without resolve()',
    },
    {
      name: 'Practitioner Name',
      sourceField:
        'resolvedPractitioner.name[0].given[0] + " " + resolvedPractitioner.name[0].family',
      description: 'Access resolved practitioner name without resolve()',
    },
    {
      name: 'Location Name',
      sourceField: 'resolvedLocation.name',
      description: 'Access resolved location name without resolve()',
    },
    {
      name: 'Patient Birth Date',
      sourceField: 'resolvedPatient.birthDate',
      description: 'Access resolved patient birth date without resolve()',
    },
    {
      name: 'Patient Gender',
      sourceField: 'resolvedPatient.gender',
      description: 'Access resolved patient gender without resolve()',
    },
    {
      name: 'Appointment Duration',
      sourceField: 'subtractDates(end, start, "minutes")',
      description: 'Calculate appointment duration',
    },
    {
      name: 'Has All Participants',
      sourceField:
        'resolvedPatient.exists() and resolvedPractitioner.exists() and resolvedLocation.exists()',
      description: 'Check if all participant types are resolved',
    },
    {
      name: 'Participant Count',
      sourceField: 'resolvedParticipants.count()',
      description: 'Count total resolved participants',
    },
    {
      name: 'Required Participants',
      sourceField: 'resolvedParticipants.where(required = "required").count()',
      description: 'Count required participants',
    },
  ]

  console.log(
    'Column sourceField examples that work with enhanced appointments:',
  )
  columnExamples.forEach((column, index) => {
    console.log(`\n${index + 1}. ${column.name}`)
    console.log(`   sourceField: "${column.sourceField}"`)
    console.log(`   Description: ${column.description}`)
  })

  return columnExamples
}

/**
 * Complete example workflow
 */
export async function exampleCompleteEnhancedWorkflow() {
  try {
    console.log('\n=== Complete Enhanced Appointments Workflow ===')

    // 1. Get enhanced appointments
    const enhancedAppointments = await exampleEnhancedAppointments()

    // 2. Demonstrate FHIR path access
    const fhirPathResults =
      exampleFhirPathWithEnhancedAppointments(enhancedAppointments)

    // 3. Show column sourceField examples
    const columnExamples = exampleColumnSourceFields()

    console.log('\n=== Summary ===')
    console.log(
      `Enhanced appointments processed: ${enhancedAppointments.length}`,
    )
    console.log(
      `Booked appointments: ${fhirPathResults.bookedAppointments.length}`,
    )
    console.log(
      `Appointments with patients: ${fhirPathResults.appointmentsWithPatients.length}`,
    )
    console.log(`Column examples provided: ${columnExamples.length}`)

    return {
      enhancedAppointments,
      fhirPathResults,
      columnExamples,
    }
  } catch (error) {
    console.error('Error in complete enhanced workflow:', error)
    throw error
  }
}

// Export all example functions
export {
  exampleEnhancedAppointments,
  exampleFhirPathWithEnhancedAppointments,
  exampleColumnSourceFields,
  exampleCompleteEnhancedWorkflow,
}
