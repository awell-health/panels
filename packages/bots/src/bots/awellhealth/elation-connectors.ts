/**
 * Bot Name: [PROJECT] Connector enrichment
 *
 * Triggering Event:
 * - Task subscription
 *
 * FHIR Resources Created/Updated:
 * - Task: Updated (when Elation identifier found and connector not already present) - Input array with new Elation connector TaskInput containing patient-specific URL
 * - DocumentReference: Created (when Elation identifier found) - Complete resource with Elation patient data reference, linked to patient and task context
 *
 * Process Overview:
 * - Receives Task resource as input via subscription
 * - Checks if Task already has Elation connector input to avoid duplicates
 * - Searches for Elation identifier in the associated Patient resource
 * - Adds Elation connector input to Task with environment-specific URL
 * - Creates DocumentReference linking to Elation patient data with proper categorization and content
 */

import type { BotEvent, MedplumClient } from '@medplum/core'
import type {
  Task,
  TaskInput,
  Patient,
  DocumentReference,
} from '@medplum/fhirtypes'

function hasConnectorInput(
  inputs: TaskInput[] | undefined,
  connectorCode: string,
): boolean {
  if (!inputs) return false
  return inputs.some((input) =>
    input.type?.coding?.some(
      (coding) =>
        coding.system === 'http://awellhealth.com/fhir/connector-type' &&
        coding.code === connectorCode,
    ),
  )
}

async function getTaskPatient(
  medplum: MedplumClient,
  task: Task,
): Promise<Patient | null> {
  if (!task.for?.reference) {
    console.log('Task has no patient reference')
    return null
  }

  try {
    const patient = await medplum.readReference(task.for)
    return patient as Patient
  } catch (error) {
    console.log('Failed to fetch patient:', error)
    return null
  }
}

function findElationIdentifier(patient: Patient): string | null {
  if (!patient.identifier) return null

  // Look for Elation identifier in patient identifiers
  const elationIdentifier = patient.identifier.find((identifier) =>
    identifier.system?.includes('elationhealth'),
  )

  return elationIdentifier?.value || null
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<Task>,
): Promise<void> {
  const task = event.input as Task
  const inputs = task?.input as TaskInput[] | undefined

  // Get task patient
  const patient = await getTaskPatient(medplum, task)
  if (!patient) {
    console.log('Could not retrieve patient for task')
    return
  }

  if (hasConnectorInput(inputs, 'elation')) {
    console.log('Connector input already exists for Elation')
    return
  }

  // Check if there is an Elation identifier for that patient
  const elationPatientId = findElationIdentifier(patient)
  if (!elationPatientId) {
    console.log('No Elation identifier found for patient')
    return
  }

  // Use environment variable for connector URL, fallback to sandbox
  const elationBaseUrl =
    event.secrets.ELATION_BASE_URL?.valueString ||
    'https://sandbox.elationemr.com'
  const connectorUrl = `${elationBaseUrl}/patient/${elationPatientId}`

  const newInput: TaskInput = {
    type: {
      coding: [
        {
          system: 'http://awellhealth.com/fhir/connector-type',
          code: 'elation',
          display: 'Elation',
        },
      ],
    },
    valueUrl: connectorUrl,
  }

  task.input = [...(inputs || []), newInput]

  console.log('Updating task with new Elation inputs')
  await medplum.updateResource(task)

  // Create a DocumentReference for the patient
  try {
    const documentReference: DocumentReference = {
      resourceType: 'DocumentReference',
      status: 'current',
      type: {
        coding: [
          {
            system: 'http://loinc.org',
            code: '11506-3',
            display: 'Progress note',
          },
        ],
        text: 'Elation Patient Data',
      },
      category: [
        {
          coding: [
            {
              system:
                'http://terminology.hl7.org/CodeSystem/document-classcodes',
              code: 'CLINNOT',
              display: 'Clinical Note',
            },
          ],
        },
      ],
      subject: {
        reference: `Patient/${patient.id}`,
        display: patient.name?.[0]?.text || 'Unknown',
      },
      date: new Date().toISOString(),
      content: [
        {
          attachment: {
            contentType: 'text/html',
            url: connectorUrl,
            title: 'Elation Patient Data',
          },
        },
      ],
      context: {
        encounter: task.encounter ? [task.encounter] : undefined,
        related: task.basedOn ? task.basedOn : undefined,
      },
      description: `Elation patient data for patient ${elationPatientId}`,
    }

    const createdDocumentReference =
      await medplum.createResource(documentReference)
    console.log('Successfully created DocumentReference for patient', {
      documentReferenceId: createdDocumentReference.id,
      patientId: patient.id,
      elationPatientId,
    })
  } catch (error) {
    console.error('Failed to create DocumentReference for patient', {
      error: error instanceof Error ? error.message : 'Unknown error',
      patientId: patient.id,
      elationPatientId,
    })
    // Don't throw error to avoid failing the entire task update
  }
}
