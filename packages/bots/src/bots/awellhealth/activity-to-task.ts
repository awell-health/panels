import type { BotEvent, MedplumClient } from '@medplum/core'
import type { Communication, Patient, Task } from '@medplum/fhirtypes'

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

// Task related functions
async function findOrCreatePatient(
  medplum: MedplumClient,
  awellPatientId: string,
): Promise<string> {
  // Search for existing patient first
  const searchQuery = {
    identifier: `https://awellhealth.com/patients|${awellPatientId}`,
  }

  console.log(
    'Searching for existing patient:',
    JSON.stringify(
      {
        awellPatientId,
        searchQuery,
      },
      null,
      2,
    ),
  )

  const existingPatient = await medplum.searchOne('Patient', searchQuery)

  if (existingPatient) {
    if (!existingPatient.id) {
      throw new Error('Found patient but missing ID')
    }
    console.log(
      'Found existing patient, returning without changes:',
      JSON.stringify(
        {
          originalId: awellPatientId,
          existingPatientId: existingPatient.id,
          lastUpdated: existingPatient.meta?.lastUpdated,
        },
        null,
        2,
      ),
    )
    return existingPatient.id
  }

  // Patient does not exist - create minimal patient record with only identifier
  const minimalPatient: Patient = {
    resourceType: 'Patient',
    identifier: [
      {
        system: 'https://awellhealth.com/patients',
        value: awellPatientId,
      },
    ],
    active: true,
  }

  console.log(
    'Creating minimal patient record:',
    JSON.stringify(
      {
        awellPatientId,
      },
      null,
      2,
    ),
  )

  const createdPatient = await medplum.createResource(minimalPatient)

  console.log(
    'Minimal patient created successfully:',
    JSON.stringify(
      {
        originalId: awellPatientId,
        patientId: createdPatient.id,
        lastUpdated: createdPatient.meta?.lastUpdated,
      },
      null,
      2,
    ),
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

  let existingTasks: Task[] = []
  try {
    const searchResult = await medplum.search(
      'Task',
      `identifier=${activity.id}`,
    )
    existingTasks =
      searchResult.entry?.map((entry) => entry.resource as Task) || []
  } catch (error) {
    console.log('No existing tasks found, will create new one')
  }

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
    console.log('No task description found, skipping task creation')
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

  try {
    if (existingTasks.length > 0) {
      console.log(`Updating ${existingTasks.length} existing tasks`)
      // Update all existing tasks
      const updatedTasks = await Promise.all(
        existingTasks.map(async (existingTask) => {
          if (existingTask.id) {
            const freshTask = await medplum.readResource(
              'Task',
              existingTask.id,
            )
            const resultTask = await medplum.updateResource({
              ...freshTask,
              status: task.status,
              statusReason: task.statusReason,
            })
            console.log(
              'Task successfully updated:',
              JSON.stringify(
                {
                  taskId: resultTask.id,
                  status: resultTask.status,
                  statusReason: resultTask.statusReason?.coding?.[0]?.code,
                  lastUpdated: resultTask.meta?.lastUpdated,
                  activityStatus: activity.status,
                  eventType: eventData.event_type,
                },
                null,
                2,
              ),
            )
            return resultTask
          }
        }),
      )
      return updatedTasks[0]?.id || ''
    }

    console.log('Creating new task for activity:', activity.id)
    const resultTask = await medplum.createResource(task)
    console.log(
      'Task created successfully:',
      JSON.stringify(
        {
          taskId: resultTask.id,
          status: resultTask.status,
          statusReason: resultTask.statusReason?.coding?.[0]?.code,
          activityId: activity.id,
          patientId: patientId,
          pathwayId: pathway?.id || 'Unknown',
          eventType: eventData.event_type,
        },
        null,
        2,
      ),
    )
    return resultTask.id || ''
  } catch (error) {
    console.log(
      'Error processing task:',
      JSON.stringify(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          activityId: activity.id,
          activityStatus: activity.status,
          eventType: eventData.event_type,
          stakeholderId: activity.indirect_object?.id,
        },
        null,
        2,
      ),
    )
    throw error
  }
}

/**
 * Creates a FHIR Communication resource to notify other bots that enrichment can begin.
 * This communication serves as a signal that a task has been created/updated and
 * enrichment bots can now start their processing.
 */
async function createEnrichmentCommunication(
  medplum: MedplumClient,
  activity: ActivityData['activity'],
  patientId: string,
  pathway: ActivityData['pathway'] | undefined,
  taskId: string,
  eventData: ActivityData,
): Promise<void> {
  try {
    const communication: Communication = {
      resourceType: 'Communication',
      status: 'completed',
      category: [
        {
          coding: [
            {
              system:
                'http://awellhealth.com/fhir/CodeSystem/communication-category',
              code: 'enrichment',
              display: 'Enrichment',
            },
          ],
        },
      ],
      subject: {
        reference: `Patient/${patientId}`,
      },
      sent: new Date().toISOString(),
      reasonCode: [
        {
          coding: [
            {
              system:
                'https://awellhealth.com/fhir/CodeSystem/communication-reason',
              code: 'ready-for-enrichment',
              display: 'Ready for Enrichment',
            },
          ],
        },
      ],
      note: [
        {
          text: `Task created/updated for activity ${activity.id}. Enrichment bots can now process this patient.`,
        },
      ],
      payload: [
        {
          contentString: JSON.stringify({
            eventData,
          }),
        },
      ],
    }

    const resultCommunication = await medplum.createResource(communication)
    console.log(
      'Enrichment communication created:',
      JSON.stringify(
        {
          communicationId: resultCommunication.id,
          activityId: activity.id,
          patientId: patientId,
          pathwayId: pathway?.id || eventData.pathway_id || 'Unknown',
          lastUpdated: resultCommunication.meta?.lastUpdated,
        },
        null,
        2,
      ),
    )
  } catch (error) {
    console.log(
      'Error creating enrichment communication:',
      JSON.stringify(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          activityId: activity.id,
          patientId: patientId,
        },
        null,
        2,
      ),
    )
    // Don't throw error here as this is not critical for the main flow
  }
}

// Main handler
export async function handler(
  medplum: MedplumClient,
  event: BotEvent<ActivityData>,
): Promise<void> {
  const { activity, patient_id: awellPatientId, pathway } = event.input

  if (activity.indirect_object?.type !== 'stakeholder') {
    console.log('Not a stakeholder activity, skipping bot execution')
    return
  }

  console.log(
    'Bot started processing activity:',
    JSON.stringify(
      {
        activityId: activity.id,
        eventType: event.input.event_type,
        pathwayId: event.input.pathway_id,
      },
      null,
      2,
    ),
  )

  try {
    const patientId = await findOrCreatePatient(medplum, awellPatientId)
    const taskId = await createOrUpdateTask(
      medplum,
      activity,
      patientId,
      pathway,
      event.input,
    )

    // Only create enrichment communication for active tasks
    // Cancelled or deleted activities should not trigger enrichment
    if (
      activity.status !== 'canceled' &&
      event.input.event_type !== 'activity.deleted'
    ) {
      await createEnrichmentCommunication(
        medplum,
        activity,
        patientId,
        pathway,
        taskId,
        event.input,
      )
    } else {
      console.log(
        'Skipping enrichment communication for cancelled/deleted activity:',
        JSON.stringify(
          {
            activityId: activity.id,
            activityStatus: activity.status,
            eventType: event.input.event_type,
          },
          null,
          2,
        ),
      )
    }

    console.log(
      'Bot finished processing activity:',
      JSON.stringify(
        {
          activityId: activity.id,
          activityStatus: activity.status,
          eventType: event.input.event_type,
          taskCreated: activity.indirect_object?.type === 'stakeholder',
          enrichmentTriggered:
            activity.status !== 'canceled' &&
            event.input.event_type !== 'activity.deleted',
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
          activityId: activity.id,
        },
        null,
        2,
      ),
    )
    throw error
  }
}
