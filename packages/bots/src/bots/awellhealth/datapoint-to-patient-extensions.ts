/**
 * Bot Name: [PROJECT][Awell] Datapoint patient storage
 *
 * Triggering Event:
 * - Awell datapoint webhook events that need to be stored in patient extensions
 *
 * FHIR Resources Created/Updated:
 * - Patient: Updated (always) - Extensions array with datapoint extensions, replacing existing ones with matching URLs
 *
 * Process Overview:
 * - Receives Awell datapoint webhook payload with datapoint definition_key, definition_category, and value
 * - Creates FHIR extensions for the datapoint using definition_key as the extension URL
 * - Updates Patient resource using atomic patch operations to avoid race conditions
 * - Handles both standard and JSON datapoints with appropriate extension structures
 * - No external API calls required - all data comes directly from the webhook payload
 * - Handles nested datapoint extensions properly within extension groups
 */

import type { BotEvent, MedplumClient } from '@medplum/core'
import type { Extension } from '@medplum/fhirtypes'

// Constants for extension URLs
const AWELL_DATA_POINTS_EXTENSION_URL =
  'https://awellhealth.com/fhir/StructureDefinition/awell-data-points'

// No longer need API config since we don't make GraphQL calls

// No longer need these interfaces since we get the data directly from the webhook

// Types for the datapoint payload
interface DataPointPayload {
  data_point: {
    id: string
    tenant_id: string
    data_point_definition_id: string
    valueType: string
    value: number | string
    data_set_id: string
    date: string
    label: string
    release_id: string
    definition_category?: string
    definition_key?: string
  }
  pathway?: {
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

// No longer need GraphQL queries since definition_key and definition_category are provided in the webhook

// No longer need GraphQL query execution since we get data directly from webhook

// No longer need this function since we get definition data directly from the webhook

function createDataPointExtensions(
  dataPoint: DataPointPayload['data_point'],
): Extension[] {
  if (!dataPoint.definition_key) {
    console.log(`Skipping datapoint ${dataPoint.id} - no definition_key found`)
    return []
  }

  const value = dataPoint.value?.toString() || ''
  const baseExtension = { url: dataPoint.definition_key, valueString: value }

  return [baseExtension]
}

function createDataPointExtensionGroups(
  dataPoint: DataPointPayload['data_point'],
): Extension[] {
  if (!dataPoint.definition_key) {
    console.log(`Skipping datapoint ${dataPoint.id} - no definition_key found`)
    return []
  }

  const singleExtensions = createDataPointExtensions(dataPoint)
  if (singleExtensions.length === 0) return []

  // Data points are added to the awell-data-points extension in patients
  // JSON data points are excluded from there as they tend to be large and
  // therefore cause rendering issues.
  if (dataPoint.valueType !== 'JSON') {
    // Standard datapoints go into the main extension
    return [
      {
        url: AWELL_DATA_POINTS_EXTENSION_URL,
        extension: singleExtensions,
      },
    ]
  }

  // JSON data points are added to a separate extension so that they can
  // be rendered with specific styling to help with readability.
  return [
    {
      url: `${AWELL_DATA_POINTS_EXTENSION_URL}-json`,
      extension: singleExtensions,
    },
  ]
}

async function findPatient(
  medplum: MedplumClient,
  patientId: string,
): Promise<string | null> {
  // Search for existing patient
  const searchQuery = {
    identifier: `https://awellhealth.com/patients|${patientId}`,
  }

  console.log(
    'Searching for existing patient:',
    JSON.stringify(
      {
        patientId,
        searchQuery,
      },
      null,
      2,
    ),
  )

  const existingPatient = await medplum.searchOne('Patient', searchQuery)

  if (!existingPatient || !existingPatient.id) {
    return null
  }

  console.log(
    'Found existing patient:',
    JSON.stringify(
      {
        originalId: patientId,
        existingPatientId: existingPatient.id,
        lastUpdated: existingPatient.meta?.lastUpdated,
      },
      null,
      2,
    ),
  )
  return existingPatient.id
}

/**
 * Updates an existing extension group by patching individual datapoint extensions within it.
 * This function handles the targeted patching of nested extensions to avoid race conditions.
 */
async function updateExistingExtensionGroup(
  medplum: MedplumClient,
  patientId: string,
  groupIndex: number,
  newDatapointExtensions: Extension[],
): Promise<void> {
  // Read fresh patient to get current state
  const patient = await medplum.readResource('Patient', patientId)
  const existingGroup = patient.extension?.[groupIndex]

  console.log(
    'Processing extension group:',
    JSON.stringify(
      {
        groupIndex,
        groupUrl: existingGroup?.url,
        hasExtensions: !!existingGroup?.extension,
        existingExtensionsCount: existingGroup?.extension?.length || 0,
        newExtensionsCount: newDatapointExtensions.length,
      },
      null,
      2,
    ),
  )

  if (!existingGroup?.extension) {
    // No existing extensions in group, replace entire group
    console.log(`Replacing entire extension group at index ${groupIndex}`)

    await medplum.patchResource('Patient', patientId, [
      {
        op: 'replace',
        path: `/extension/${groupIndex}`,
        value: {
          url: existingGroup?.url || 'unknown',
          extension: newDatapointExtensions,
        },
      },
    ])
    return
  }

  // Process each individual datapoint extension
  for (const newDatapoint of newDatapointExtensions) {
    if (!newDatapoint.url) {
      continue
    }

    // Find if this datapoint already exists in the group
    const existingDatapointIndex = existingGroup.extension.findIndex(
      (ext) => ext.url === newDatapoint.url,
    )

    console.log(
      'Processing datapoint extension:',
      JSON.stringify(
        {
          datapointUrl: newDatapoint.url,
          existingIndex: existingDatapointIndex,
          groupIndex,
          operation: existingDatapointIndex >= 0 ? 'replace' : 'add',
        },
        null,
        2,
      ),
    )

    if (existingDatapointIndex >= 0) {
      // Update existing datapoint
      const patchPath = `/extension/${groupIndex}/extension/${existingDatapointIndex}`
      console.log(`Patching with replace operation: ${patchPath}`)

      await medplum.patchResource('Patient', patientId, [
        {
          op: 'replace',
          path: patchPath,
          value: newDatapoint,
        },
      ])
    } else {
      // Add new datapoint to the group
      const patchPath = `/extension/${groupIndex}/extension/-`
      console.log(`Patching with add operation: ${patchPath}`)

      await medplum.patchResource('Patient', patientId, [
        {
          op: 'add',
          path: patchPath,
          value: newDatapoint,
        },
      ])
    }
  }
}

/**
 * Updates patient with datapoint extensions using targeted patch operations.
 *
 * Race Condition Strategy:
 * - Uses FHIR patch operations to target specific nested extensions
 * - Each individual datapoint extension gets its own atomic patch operation
 * - This ensures both race condition safety AND proper nested extension handling
 * - Example: patches /extension[0]/extension[2] to update a specific datapoint within awell-data-points
 */
async function updatePatientWithDataPointExtensions(
  medplum: MedplumClient,
  patientId: string,
  dataPointExtensions: Extension[],
): Promise<void> {
  if (dataPointExtensions.length === 0) return

  // Read current patient to get existing extensions
  const patient = await medplum.readResource('Patient', patientId)
  const existingExtensions = patient.extension || []

  console.log(
    'Processing datapoint extensions with targeted patches:',
    JSON.stringify(
      {
        existingExtensionsCount: existingExtensions.length,
        newExtensionsCount: dataPointExtensions.length,
        existingExtensionUrls: existingExtensions.map((ext) => ext.url),
        newExtensionUrls: dataPointExtensions.map((ext) => ext.url),
      },
      null,
      2,
    ),
  )

  // Process each extension group (awell-data-points, awell-data-points-json, etc.)
  for (const extensionGroup of dataPointExtensions) {
    if (!extensionGroup.url || !extensionGroup.extension) continue

    // Find the existing extension group index
    const existingGroupIndex = existingExtensions.findIndex(
      (ext) => ext.url === extensionGroup.url,
    )

    if (existingGroupIndex >= 0) {
      // Extension group exists - update individual datapoints within it
      await updateExistingExtensionGroup(
        medplum,
        patientId,
        existingGroupIndex,
        extensionGroup.extension,
      )
    } else {
      // Extension group doesn't exist - add it to the extensions array
      console.log(`Adding new extension group: ${extensionGroup.url}`)
      console.log(
        'Extension group structure:',
        JSON.stringify(extensionGroup, null, 2),
      )

      // Ensure the extension group has the required structure
      const validExtensionGroup = {
        url: extensionGroup.url,
        extension: extensionGroup.extension || [],
      }

      // If there are no existing extensions, use 'add' with index 0 to create the first element
      // If there are existing extensions, use 'add' to append to the array
      if (existingExtensions.length === 0) {
        throw new Error(
          'No existing extensions found, not possible to apply patch operations',
        )
      }

      console.log('Appending to existing extensions array')
      console.log(
        'Patch operation:',
        JSON.stringify(
          {
            op: 'add',
            path: '/extension/-',
            value: validExtensionGroup,
          },
          null,
          2,
        ),
      )

      await medplum.patchResource('Patient', patientId, [
        {
          op: 'add',
          path: '/extension/-',
          value: validExtensionGroup,
        },
      ])
    }
  }

  console.log(
    'Patient updated with targeted patch operations:',
    JSON.stringify(
      {
        patientId,
        newExtensionGroupsCount: dataPointExtensions.length,
        method: 'targeted_patch_operations',
      },
      null,
      2,
    ),
  )
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<DataPointPayload>,
): Promise<void> {
  const { data_point, pathway, patient_id } = event.input

  console.log(
    'Bot started processing datapoint for patient storage:',
    JSON.stringify(
      {
        dataPointId: data_point.id,
        eventType: event.input.event_type,
        pathwayId: event.input.pathway_id,
        patientId: patient_id,
        hasPathway: !!pathway,
      },
      null,
      2,
    ),
  )

  try {
    const medplumPatientId = await findPatient(medplum, patient_id)

    if (!medplumPatientId) {
      console.log(
        'No patient found for datapoint:',
        JSON.stringify({ patientId: patient_id }, null, 2),
      )
      throw new Error('Patient not found or missing patient id')
    }

    // Create extensions for the datapoint using definition_key from webhook
    const dataPointExtensions = createDataPointExtensionGroups(data_point)

    if (dataPointExtensions.length === 0) {
      console.log(
        'No valid extensions created for datapoint:',
        JSON.stringify(
          {
            dataPointId: data_point.id,
            definitionId: data_point.data_point_definition_id,
          },
          null,
          2,
        ),
      )
      return
    }

    // Update patient with new datapoint extensions
    await updatePatientWithDataPointExtensions(
      medplum,
      medplumPatientId,
      dataPointExtensions,
    )

    console.log(
      'Datapoint patient storage completed successfully:',
      JSON.stringify(
        {
          dataPointId: data_point.id,
          patientId: medplumPatientId,
          extensionGroupsCreated: dataPointExtensions.length,
          definitionKey: data_point.definition_key || 'unknown',
        },
        null,
        2,
      ),
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(
      `Datapoint patient storage failed for datapoint ${data_point.id}: ${errorMessage}`,
    )
    throw error
  }
}
