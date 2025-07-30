import type { BotEvent, MedplumClient } from '@medplum/core'
import type { Task, Extension } from '@medplum/fhirtypes'

// Constants for extension URLs
const AWELL_TASK_EXTENSION_URL =
  'https://awellhealth.com/fhir/StructureDefinition/awell-task'
const AWELL_DATA_POINTS_EXTENSION_URL =
  'https://awellhealth.com/fhir/StructureDefinition/awell-data-points'

interface ApiConfig {
  endpoint: string
  apiKey: string
}

interface GraphQLError {
  message: string
  locations?: Array<{ line: number; column: number }>
  path?: string[]
}

interface DataPointDefinitionsResponse {
  data: {
    pathwayDataPointDefinitions: {
      data_point_definitions: DataPointDefinition[]
    }
  }
  errors?: GraphQLError[]
}

interface DataPointsResponse {
  data: {
    pathwayDataPoints: {
      dataPoints: DataPoint[]
    }
  }
  errors?: GraphQLError[]
}

interface BaselineInfoResponse {
  data: {
    baselineInfo: {
      baselineDataPoints: DataPoint[]
    }
  }
  errors?: GraphQLError[]
}

const GET_DATA_POINT_DEFINITIONS_QUERY = `
  query GetPathwayDataPointDefinitions(
    $release_id: String!
  ) {
    pathwayDataPointDefinitions(
      release_id: $release_id
    ) {
      data_point_definitions {
        id
        title
        possibleValues {
          value
          label
        }
      }
    }
  }
`

const GET_DATA_POINT_QUERY = `
    query GetPathwayDataPoints($pathway_id: String!, $activity_id: String) {
    pathwayDataPoints(
      pathway_id: $pathway_id
      activity_id: $activity_id
    ) {
      dataPoints {
        serialized_value
        data_point_definition_id
        valueType
        date
      }
    }
  }
`

const GET_BASELINE_INFO_QUERY = `
  query GetBaselineInfo($pathway_id: String!) {
    baselineInfo(pathway_id: $pathway_id) {
      baselineDataPoints {
        serialized_value
        data_point_definition_id
        valueType
        date
      }
    }
  }
`

interface PossibleValue {
  value: string
  label: string
}

interface DataPointDefinition {
  id: string
  title: string
  possibleValues?: PossibleValue[]
}

interface DataPoint {
  serialized_value: string
  data_point_definition_id: string
  valueType: string
  date: string
}

interface TaskExtensionData {
  releaseId: string
  pathwayId: string
  activityId?: string
}

// Generic GraphQL fetch function to eliminate duplication
async function executeGraphQLQuery<T>(
  config: ApiConfig,
  query: string,
  variables: Record<string, unknown>,
  operationName: string,
): Promise<T> {
  console.log(`Executing ${operationName} with variables:`, variables)

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.apiKey,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`)
  }

  const data = (await response.json()) as T
  console.log(`${operationName} completed successfully`)
  return data
}

async function fetchDataPointDefinitions(
  config: ApiConfig,
  releaseId: string,
): Promise<DataPointDefinition[]> {
  const data = await executeGraphQLQuery<DataPointDefinitionsResponse>(
    config,
    GET_DATA_POINT_DEFINITIONS_QUERY,
    { release_id: releaseId },
    'fetchDataPointDefinitions',
  )

  const definitions =
    data.data.pathwayDataPointDefinitions.data_point_definitions
  console.log(`Retrieved ${definitions.length} data point definitions`)
  return definitions
}

async function fetchDataPoints(
  config: ApiConfig,
  pathwayId: string,
  activityId?: string,
): Promise<DataPoint[]> {
  const isBaseline = !activityId
  const operationName = isBaseline
    ? 'fetchBaselineDataPoints'
    : 'fetchActivityDataPoints'

  if (isBaseline) {
    const data = await executeGraphQLQuery<BaselineInfoResponse>(
      config,
      GET_BASELINE_INFO_QUERY,
      { pathway_id: pathwayId },
      operationName,
    )

    const dataPoints = data.data.baselineInfo.baselineDataPoints
    console.log(`Retrieved ${dataPoints.length} baseline data points`)
    return dataPoints
  }

  const data = await executeGraphQLQuery<DataPointsResponse>(
    config,
    GET_DATA_POINT_QUERY,
    { pathway_id: pathwayId, activity_id: activityId },
    operationName,
  )

  const dataPoints = data.data.pathwayDataPoints.dataPoints
  console.log(`Retrieved ${dataPoints.length} activity-specific data points`)
  return dataPoints
}

function createDataPointExtensions(
  dataPoints: DataPoint[],
  dataPointDefinitions: DataPointDefinition[],
): Extension[] {
  if (dataPoints.length === 0) {
    console.log('No data points to process')
    return []
  }

  const result: Extension[] = []

  // Process non-JSON data points
  const nonJsonDataPoints = dataPoints.filter((dp) => dp.valueType !== 'JSON')
  if (nonJsonDataPoints.length > 0) {
    const extensions = nonJsonDataPoints
      .map((dataPoint) =>
        createSingleDataPointExtension(dataPoint, dataPointDefinitions),
      )
      .filter(
        (ext): ext is { url: string; valueString: string }[] => ext !== null,
      )
      .flat()

    if (extensions.length > 0) {
      result.push({
        url: AWELL_DATA_POINTS_EXTENSION_URL,
        extension: extensions,
      })
    }
  }

  // Process JSON data points
  const jsonDataPoints = dataPoints.filter((dp) => dp.valueType === 'JSON')
  if (jsonDataPoints.length > 0) {
    const extensions = jsonDataPoints
      .map((dataPoint) =>
        createSingleDataPointExtension(dataPoint, dataPointDefinitions),
      )
      .filter(
        (ext): ext is { url: string; valueString: string }[] => ext !== null,
      )
      .flat()

    if (extensions.length > 0) {
      result.push({
        url: `${AWELL_DATA_POINTS_EXTENSION_URL}-json`,
        extension: extensions,
      })
    }
  }

  console.log(
    `Created ${result.length} extension groups from ${dataPoints.length} data points`,
  )
  return result
}

function createSingleDataPointExtension(
  dataPoint: DataPoint,
  dataPointDefinitions: DataPointDefinition[],
): { url: string; valueString: string }[] | null {
  const definition = dataPointDefinitions.find(
    (def) => def.id === dataPoint.data_point_definition_id,
  )

  if (!definition) {
    console.log(
      `WARNING: No definition found for data point with ID: ${dataPoint.data_point_definition_id}`,
    )
    return null
  }

  if (!dataPoint.serialized_value || !definition.title) {
    console.log(
      `WARNING: Skipping data point ${definition.title} due to empty value`,
    )
    return null
  }

  const value = dataPoint.serialized_value
  const baseExtension = { url: definition.title, valueString: value }

  // Add label extension if possible values exist
  if (definition.possibleValues?.length) {
    const matchingValue = definition.possibleValues.find(
      (pv) => pv.value === value,
    )

    if (matchingValue) {
      return [
        baseExtension,
        { url: `${definition.title}_label`, valueString: matchingValue.label },
      ]
    }

    console.log(
      `WARNING: Value "${value}" for "${definition.title}" doesn't match any possible values`,
    )
  }

  return [baseExtension]
}

// Simplified task update - single operation, better error handling
async function updateTaskWithExtensions(
  medplum: MedplumClient,
  task: Task,
  extensions: Extension[],
): Promise<void> {
  if (extensions.length === 0) {
    console.log('No extensions to add to task')
    return
  }

  if (!task.extension) {
    task.extension = []
  }

  console.log(`Adding ${extensions.length} data point extensions to task`)
  task.extension.push(...extensions)

  try {
    await medplum.updateResource(task)
    console.log('Successfully updated task with data point extensions')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(`ERROR: Failed to update task ${task.id}: ${errorMessage}`)
    throw error
  }
}

// Simplified patient update using patch operations
async function updatePatientWithExtensions(
  medplum: MedplumClient,
  task: Task,
  extensions: Extension[],
): Promise<void> {
  if (extensions.length === 0) {
    console.log('No extensions to add to patient')
    return
  }

  const patientId = task.for?.reference?.split('/')[1]
  if (!patientId) {
    console.log('No patient reference found in task')
    return
  }

  try {
    console.log(
      `Updating patient ${patientId} with ${extensions.length} data point extensions`,
    )
    const patient = await medplum.readResource('Patient', patientId)

    const patchOps = createPatientExtensionPatchOps(patient, extensions)

    if (patchOps.length > 1) {
      // More than just version test
      await medplum.patchResource('Patient', patientId, patchOps)
      console.log(
        'Successfully updated patient with data point extensions using patch operations',
      )
    } else {
      console.log('No data point extensions to update on patient')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(`ERROR: Failed to update patient ${patientId}: ${errorMessage}`)
    throw error
  }
}

type PatchOperation = {
  op: 'replace' | 'add' | 'remove' | 'test'
  path: string
  value?: unknown
}

function createPatientExtensionPatchOps(
  patient: { extension?: Extension[]; meta?: { versionId?: string } },
  newExtensions: Extension[],
): PatchOperation[] {
  const patchOps: PatchOperation[] = [
    {
      op: 'test',
      path: '/meta/versionId',
      value: patient.meta?.versionId,
    },
  ]

  // Get URLs of extensions we're about to add/update
  const newExtensionUrls = new Set(
    newExtensions.map((ext) => ext.url).filter(Boolean) as string[],
  )

  if (newExtensionUrls.size === 0) {
    console.log('No valid extension URLs to update')
    return patchOps
  }

  // Create a new extensions array:
  // 1. Keep existing extensions that don't match our URLs
  // 2. Add our new extensions
  const existingExtensions = patient.extension || []
  const filteredExistingExtensions = existingExtensions.filter(
    (ext) => !ext.url || !newExtensionUrls.has(ext.url),
  )

  const updatedExtensions = [...filteredExistingExtensions, ...newExtensions]

  // Replace the entire extensions array - this is atomic and reliable
  patchOps.push({
    op: 'replace',
    path: '/extension',
    value: updatedExtensions,
  })

  console.log(
    `Replacing extensions array: removing ${existingExtensions.length - filteredExistingExtensions.length} existing data point extensions, adding ${newExtensions.length} new extensions`,
  )

  return patchOps
}

// Generic extraction function to eliminate duplication
function extractFromTaskExtension(
  task: Task,
  fieldName: string,
): string | null {
  const awellExtension = task.extension
    ?.find((ext) => ext.url === AWELL_TASK_EXTENSION_URL)
    ?.extension?.find((ext) => ext.url === fieldName)

  const value = awellExtension?.valueString || null

  if (value) {
    console.log(`Found ${fieldName}: ${value}`)
  } else {
    console.log(`No ${fieldName} found in task extensions`)
  }

  return value
}

// Consolidated extraction function
function extractTaskExtensionData(task: Task): TaskExtensionData | null {
  const releaseId = extractFromTaskExtension(task, 'release-id')
  const pathwayId = extractFromTaskExtension(task, 'pathway-id')
  const activityId = extractFromTaskExtension(task, 'activity-id')

  if (!releaseId || !pathwayId) {
    return null
  }

  return { releaseId, pathwayId, activityId: activityId || undefined }
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<Task>,
): Promise<void> {
  const task = event.input

  try {
    console.log('Starting data point enrichment for task:', task.id)

    // Validate required secrets
    if (!event.secrets.AWELL_API_URL || !event.secrets.AWELL_API_KEY) {
      console.log('AWELL_API_URL or AWELL_API_KEY is not set')
      return
    }

    const apiConfig: ApiConfig = {
      endpoint: event.secrets.AWELL_API_URL.valueString || '',
      apiKey: event.secrets.AWELL_API_KEY.valueString || '',
    }

    // Extract required data from task extensions
    const extensionData = extractTaskExtensionData(task)
    if (!extensionData) {
      console.log(
        'Missing required extension data (release-id or pathway-id), skipping enrichment',
      )
      return
    }

    // Validate task ID
    if (!task.id) {
      throw new Error('Task is missing required id property')
    }

    // Determine data points to fetch based on task status
    const dataPoints = await fetchDataPointsForTaskStatus(
      apiConfig,
      task.status,
      extensionData,
    )

    if (dataPoints.length === 0) {
      console.log('No data points retrieved, skipping enrichment')
      return
    }

    // Process data points and create extensions
    const dataPointDefinitions = await fetchDataPointDefinitions(
      apiConfig,
      extensionData.releaseId,
    )
    const extensions = createDataPointExtensions(
      dataPoints,
      dataPointDefinitions,
    )

    // Update task and patient with extensions
    await updateTaskWithExtensions(medplum, task, extensions)
    await updatePatientWithExtensions(medplum, task, extensions)

    console.log('Data point enrichment completed successfully')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(
      `ERROR: Data point enrichment failed for task ${task.id}: ${errorMessage}`,
    )
    throw error
  }
}

// Helper function to determine which data points to fetch based on task status
async function fetchDataPointsForTaskStatus(
  config: ApiConfig,
  taskStatus: string,
  extensionData: TaskExtensionData,
): Promise<DataPoint[]> {
  if (taskStatus === 'completed') {
    // Task is completed - fetch data points collected in the associated activity
    if (!extensionData.activityId) {
      console.log(
        'Missing activity ID for completed task, skipping data point enrichment',
      )
      return []
    }
    console.log(
      `Task is completed, fetching activity-specific data points for activity: ${extensionData.activityId}`,
    )
    return fetchDataPoints(
      config,
      extensionData.pathwayId,
      extensionData.activityId,
    )
  }

  if (taskStatus === 'requested') {
    // Task is created - fetch only baseline info data points
    console.log('Task is created, fetching baseline data points')
    return fetchDataPoints(config, extensionData.pathwayId)
  }

  console.log(
    `Task status '${taskStatus}' does not require data point enrichment`,
  )
  return []
}
