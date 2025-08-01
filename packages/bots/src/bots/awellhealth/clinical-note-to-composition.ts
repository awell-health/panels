/**
 * Bot Name: [PROJECT][Awell] Clinical note to composition conversion
 *
 * Triggering Event:
 * - Awell clinical note webhook events (clinical note creation or updates)
 *
 * FHIR Resources Created/Updated:
 * - Composition: Created (always when patient found) - Complete resource with clinical note narratives as sections, FHIR-compliant date formatting, status, and patient subject reference
 *
 * Process Overview:
 * - Receives Awell clinical note webhook payload with multiple narratives and pathway context
 * - Searches for existing patient in FHIR store using Awell patient identifier for proper resource linking
 * - Transforms clinical note narratives into FHIR Composition sections with title, code, and narrative text
 * - Creates Composition resource with proper status, FHIR-compliant date formatting, and structured section organization
 * - Links composition to existing patient resource and pathway context for comprehensive clinical documentation
 */

import type { BotEvent, MedplumClient } from '@medplum/core'
import type {
  Patient,
  Composition,
  CompositionSection,
} from '@medplum/fhirtypes'

// Types for the clinical note webhook payload
type ClinicalNoteWebhookPayload = {
  clinical_note: {
    context: unknown[]
    narratives: Array<{
      id: string
      key: string
      title: string
      body: string
    }>
    date: string
    clinical_note_id: string
  }
  date: string
  pathway: {
    id: string
    pathway_definition_id: string
    patient_id: string
    patient_identifiers: Array<{
      system: string
      value: string
    }>
    tenant_id: string
    start_date: string
    pathway_title: string
  }
  event_type: string
  pathway_definition_id: string
  pathway_id: string
  patient_id: string
}

/**
 * Finds a patient in Medplum by Awell patient ID
 */
async function findPatientByIdentifier(
  medplum: MedplumClient,
  patientId: string,
): Promise<Patient | undefined> {
  try {
    const patient = await medplum.searchOne('Patient', {
      identifier: `https://awellhealth.com/patients|${patientId}`,
    })
    if (patient?.id) {
      console.log(
        'Patient found in system:',
        JSON.stringify(
          {
            patientId,
            foundPatientId: patient.id,
          },
          null,
          2,
        ),
      )
      return patient
    }
  } catch (error) {
    console.log(
      'Patient not found in system:',
      JSON.stringify({ patientId }, null, 2),
    )
  }
  return undefined
}

/**
 * Creates a FHIR Composition section from a narrative
 */
function createCompositionSection(
  narrative: ClinicalNoteWebhookPayload['clinical_note']['narratives'][0],
): CompositionSection {
  return {
    id: narrative.id,
    title: narrative.title,
    code: {
      text: narrative.key,
    },
    text: {
      status: 'generated',
      div: narrative.body,
    },
  }
}

/**
 * Formats a date string to FHIR-compliant ISO 8601 format
 */
function formatDateForFHIR(dateString: string): string {
  try {
    // Handle the specific case where timezone offset is missing minutes (e.g., +01 instead of +01:00)
    let normalizedDateString = dateString
    if (dateString.match(/[+-]\d{2}$/)) {
      // If the string ends with +/- followed by exactly 2 digits, add :00
      normalizedDateString = `${dateString}:00`
    }

    const date = new Date(normalizedDateString)
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid date')
    }
    return date.toISOString()
  } catch (error) {
    console.log(
      'Error formatting date, using current date:',
      JSON.stringify(
        {
          originalDate: dateString,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        null,
        2,
      ),
    )
    return new Date().toISOString()
  }
}

/**
 * Creates a FHIR Composition resource from the clinical note data
 */
function createComposition(
  clinicalNote: ClinicalNoteWebhookPayload['clinical_note'],
  patientId: string,
  pathwayId?: string,
): Composition {
  const composition: Composition = {
    resourceType: 'Composition',
    id: clinicalNote.clinical_note_id,
    status: 'final',
    identifier: {
      system: 'https://awellhealth.com/clinical_note',
      value: clinicalNote.clinical_note_id,
    },
    type: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '34109-9',
          display: 'Outpatient Note',
        },
      ],
      text: 'Outpatient Clinical Note',
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    date: formatDateForFHIR(clinicalNote.date),
    title:
      clinicalNote.narratives.find((n) => n.key === 'nice_clinical_note')
        ?.title || 'Clinical Note',
    author: [
      {
        reference: 'Organization/awell-health',
      },
    ],
    section: clinicalNote.narratives.map(createCompositionSection),
  }

  return composition
}

/**
 * Main handler function for the clinical note to composition bot
 */
export async function handler(
  medplum: MedplumClient,
  event: BotEvent<ClinicalNoteWebhookPayload>,
): Promise<void> {
  const {
    clinical_note,
    patient_id: awellPatientId,
    pathway,
    event_type,
  } = event.input

  // Check if this is the correct event type
  if (event_type !== 'clinical_note.created') {
    console.log(
      'Skipping bot execution - incorrect event type:',
      JSON.stringify(
        {
          eventType: event_type,
          expectedEventType: 'clinical_note.created',
        },
        null,
        2,
      ),
    )
    return
  }

  console.log(
    'Bot started processing clinical note:',
    JSON.stringify(
      {
        clinicalNoteId: clinical_note.clinical_note_id,
        eventType: event_type,
        pathwayId: pathway?.id,
        patientId: awellPatientId,
      },
      null,
      2,
    ),
  )

  try {
    // Search for the patient in Medplum
    const patient = await findPatientByIdentifier(medplum, awellPatientId)

    if (!patient) {
      console.log(
        'Patient not found in Medplum, skipping composition creation:',
        JSON.stringify(
          {
            awellPatientId,
            clinicalNoteId: clinical_note.clinical_note_id,
          },
          null,
          2,
        ),
      )
      return
    }

    const patientId = patient.id
    if (!patientId) {
      console.log(
        'Patient resource has no ID, skipping composition creation:',
        JSON.stringify(
          {
            awellPatientId,
            clinicalNoteId: clinical_note.clinical_note_id,
          },
          null,
          2,
        ),
      )
      return
    }

    // Create the FHIR Composition
    const composition = createComposition(clinical_note, patientId, pathway?.id)

    // Save the composition to Medplum
    const resultComposition = await medplum.createResource(composition)

    console.log(
      'Composition created successfully:',
      JSON.stringify(
        {
          compositionId: resultComposition.id,
          clinicalNoteId: clinical_note.clinical_note_id,
          patientId: patientId,
          pathwayId: pathway?.id || 'Unknown',
          sectionCount: composition.section?.length || 0,
        },
        null,
        2,
      ),
    )

    console.log(
      'Bot finished processing clinical note:',
      JSON.stringify(
        {
          clinicalNoteId: clinical_note.clinical_note_id,
          compositionCreated: true,
        },
        null,
        2,
      ),
    )
  } catch (error) {
    console.log(
      'Error in handler:',
      JSON.stringify(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          clinicalNoteId: clinical_note.clinical_note_id,
          awellPatientId,
        },
        null,
        2,
      ),
    )
    throw error
  }
}
