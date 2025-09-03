/**
 * Bot Name: [PROJECT][Awell] Activity to task conversion
 *
 * Triggering Event:
 * - Awell activity webhook events (activity creation, updates, completion)
 *
 * FHIR Resources Created/Updated:
 * - Patient: Created (when patient does not exist) - Minimal record with identifier array (Awell identifier) and active status only
 * - Task: Created (when no existing task found) - Complete resource with Awell context extensions, pathway details, activity metadata, status, and subject reference
 * - Task: Updated (when existing task found) - Status and statusReason fields only
 * - Task: Created/Updated (when PATIENT_TASKS_INGESTION_ENABLED env var is set and indirect_object.type is 'patient') - Includes owner reference to the patient
 *
 * Process Overview:
 * - Receives Awell activity webhook payload with comprehensive activity and pathway context
 * - Ensures patient exists in FHIR store by creating minimal record with Awell identifier if needed
 * - Transforms activity data into FHIR Task resource format with proper subject, description, and status mapping
 * - Creates Awell-specific extensions including pathway context, activity details, track information, and action components
 * - Handles task status mapping from Awell activity status to FHIR Task status with proper lifecycle management
 * - When PATIENT_TASKS_INGESTION_ENABLED environment variable is set, also processes patient activities and sets owner to the patient
 */

import type { BotEvent, MedplumClient } from '@medplum/core'
import type { Extension, Patient, Task } from '@medplum/fhirtypes'

interface ActivityData {
  activity: {
    id: string
    stream_id: string
    date: string
    subject: {
      type: string
      name: string
    }
    action: string
    object?: {
      id: string
      type?: string
      name: string
    }
    indirect_object?: {
      id: string
      type: string
      name: string
    }
    status: string
    reference_id: string
    reference_type: string
    container_name: string
    track: {
      id: string
      title: string
    }
    label: {
      color: string
      id: string
      text: string
    }
    sub_activities: Array<{
      id: string
      subject: {
        type: string
        name: string
      }
      action: string
      date: string
    }>
    isUserActivity: boolean
    context: {
      action_id: string
      instance_id: string
      pathway_id: string
      step_id: string
      track_id: string
    }
    action_component?: {
      definition_id: string
      release_id: string
      title: string
    }
  }
  pathway: {
    id: string
    pathway_definition_id: string
    patient_id: string
    tenant_id: string
    start_date: string
    pathway_title: string
  }
  event_type: string
  pathway_definition_id: string
  pathway_id: string
  patient_id: string
}

function createPatientBotProcessedExtension(
  eventType: string,
  timestamp: string,
): Extension {
  return {
    url: 'https://awellhealth.com/fhir/StructureDefinition/awell-patient-bot-processed',
    extension: [
      {
        url: 'event-type',
        valueString: eventType,
      },
      {
        url: 'processed-at',
        valueDateTime: timestamp,
      },
      {
        url: 'bot-version',
        valueString: '1.0.0',
      },
    ],
  }
}

// Task related functions
async function findOrCreatePatient(
  medplum: MedplumClient,
  awellPatientId: string,
  eventType: string,
): Promise<string> {
  // Search for existing patient first
  const searchQuery = {
    identifier: `https://awellhealth.com/patients|${awellPatientId}`,
  }

  const existingPatient = await medplum.searchOne('Patient', searchQuery)

  if (existingPatient) {
    if (!existingPatient.id) {
      throw new Error('Found patient but missing ID')
    }
    return existingPatient.id
  }

  // Patient does not exist - create minimal patient record with only identifier and creation extension
  const minimalPatient: Patient = {
    resourceType: 'Patient',
    identifier: [
      {
        system: 'https://awellhealth.com/patients',
        value: awellPatientId,
      },
    ],
    extension: [
      createPatientBotProcessedExtension(eventType, new Date().toISOString()),
    ],
    active: true,
  }

  const createdPatient = await medplum.upsertResource(
    minimalPatient,
    searchQuery,
  )

  return createdPatient.id || ''
}

// Helper function to create extensions
function createTaskExtensions(
  activity: ActivityData['activity'],
  pathway: ActivityData['pathway'] | undefined,
  eventData: ActivityData,
): Array<{
  url: string
  valueString?: string
  extension?: Array<{
    url: string
    valueString: string
  }>
}> {
  return [
    {
      url: 'https://awellhealth.com/fhir/StructureDefinition/awell-task',
      extension: [
        {
          url: 'stakeholder',
          valueString: activity.indirect_object?.name || 'Unknown',
        },
        {
          url: 'stakeholder-id',
          valueString: activity.indirect_object?.id || 'Unknown',
        },
        {
          url: 'pathway-definition-id',
          valueString:
            pathway?.pathway_definition_id ||
            eventData.pathway_definition_id ||
            'Unknown',
        },
        {
          url: 'pathway-id',
          valueString: activity.stream_id,
        },
        {
          url: 'pathway-title',
          valueString: pathway?.pathway_title || 'Unknown',
        },
        {
          url: 'activity-id',
          valueString: activity.id,
        },
        {
          url: 'step-name',
          valueString: activity.action_component?.title ?? 'Unknown',
        },
        {
          url: 'pathway-start-date',
          valueString: pathway?.start_date || 'Unknown',
        },
        {
          url: 'release-id',
          valueString: activity.action_component?.release_id ?? 'Unknown',
        },
        {
          url: 'activity-type',
          valueString: activity.object?.type || 'Unknown',
        },
      ],
    },
  ]
}

async function createOrUpdateTask(
  medplum: MedplumClient,
  activity: ActivityData['activity'],
  patientId: string,
  pathway: ActivityData['pathway'] | undefined,
  eventData: ActivityData,
): Promise<string> {
  const taskIdentifier = {
    system: 'https://awellhealth.com/activities',
    value: activity.id,
  }

  const existingTask = await medplum.searchOne('Task', {
    identifier: activity.id,
  })

  // Set task status based on activity status and event type
  let taskStatus: Task['status']
  let statusReason:
    | { coding: Array<{ system: string; code: string; display: string }> }
    | undefined

  if (activity.status === 'done') {
    taskStatus = 'completed'
  } else if (activity.status === 'canceled') {
    // Handle cancelled activities (care flow was stopped)
    taskStatus = 'cancelled'
    statusReason = {
      coding: [
        {
          system: 'https://awellhealth.com/fhir/CodeSystem/task-status-reason',
          code: 'care-flow-stopped',
          display: 'The associated care flow has been stopped',
        },
      ],
    }
  } else if (eventData.event_type === 'activity.deleted') {
    // Handle deleted activities (care flow was deleted)
    taskStatus = 'cancelled'
    statusReason = {
      coding: [
        {
          system: 'https://awellhealth.com/fhir/CodeSystem/task-status-reason',
          code: 'care-flow-deleted',
          display: 'The associated care flow has been deleted',
        },
      ],
    }
  } else {
    taskStatus = 'requested'
  }

  const taskDescription =
    activity.action_component?.title ?? activity.object?.name

  if (!taskDescription) {
    return ''
  }

  const task: Task = {
    resourceType: 'Task',
    status: taskStatus,
    intent: 'order',
    priority: 'routine',
    description: taskDescription,
    authoredOn: activity.date,
    lastModified: new Date().toISOString(),
    for: { reference: `Patient/${patientId}` },
    code: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/task-code',
          code: 'approve',
          display: 'Approve',
        },
      ],
    },
    identifier: [taskIdentifier],
    extension: createTaskExtensions(activity, pathway, eventData),
  }

  // Add status reason if provided
  if (statusReason) {
    task.statusReason = statusReason
  }

  // Add performer type and owner for patient activities when enabled
  if (activity.indirect_object?.type === 'patient') {
    task.performerType = [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
            code: 'PT',
            display: 'Patient',
          },
        ],
        text: 'Patient',
      },
    ]
    // Set the owner to reference the patient
    task.owner = { reference: `Patient/${patientId}`, display: 'Patient' }
  }

  if (existingTask?.id) {
    const freshTask = await medplum.readResource('Task', existingTask.id)
    const resultTask = await medplum.updateResource({
      ...freshTask,
      status: task.status,
      statusReason: task.statusReason,
    })
    return resultTask.id || ''
  }

  const resultTask = await medplum.createResource(task)
  return resultTask.id || ''
}

// Main handler
export async function handler(
  medplum: MedplumClient,
  event: BotEvent<ActivityData> & {
    secrets: { PATIENT_TASKS_INGESTION_ENABLED?: { valueString?: string } }
  },
): Promise<void> {
  const {
    activity,
    patient_id: awellPatientId,
    pathway,
    event_type,
  } = event.input

  // Check if we should process patient activities
  const isPatientActivityAndEnabled =
    event.secrets.PATIENT_TASKS_INGESTION_ENABLED?.valueString === 'true' &&
    activity.indirect_object?.type === 'patient'

  // Only process stakeholder activities, or patient activities if enabled
  if (
    activity.indirect_object?.type !== 'stakeholder' &&
    !isPatientActivityAndEnabled
  ) {
    console.log(
      `Not a stakeholder or enabled patient activity, skipping bot execution (PATIENT_TASKS_INGESTION_ENABLED: ${event.secrets.PATIENT_TASKS_INGESTION_ENABLED?.valueString}) and indirect object type: ${activity.indirect_object?.type}`,
    )
    return
  }

  console.log(
    `Starting activity-to-task process for activity ${activity.id} (${event.input.event_type}) - indirect object type: ${activity.indirect_object?.type}`,
  )

  try {
    const patientId = await findOrCreatePatient(
      medplum,
      awellPatientId,
      event_type,
    )
    await createOrUpdateTask(medplum, activity, patientId, pathway, event.input)

    console.log(
      `Activity-to-task completed successfully for activity ${activity.id}: task processed with status '${activity.status}', indirect object type: '${activity.indirect_object?.type}'`,
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    console.log(
      `Activity-to-task failed for activity ${activity.id}: ${errorMessage}`,
    )
    throw error
  }
}
