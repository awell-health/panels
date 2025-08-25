/**
 * Bot Name: [PROJECT] Task enrichment
 *
 * Triggering Event:
 * - Task subscription
 *
 * FHIR Resources Created/Updated:
 * - Task: Updated (always) - Extensions array with Awell-specific extensions (pathway data points, hosted pages links, enrichment status, connector inputs)
 * - Patient: Updated (when new data points have been found) - Extensions array with data point extensions merged with existing extensions
 *
 * Process Overview:
 * - Receives Task resource via subscription with Awell context extensions
 * - Fetches pathway data points and definitions from Awell GraphQL API
 * - Generates hosted pages link for task completion UI (skipped for tasks with performer type PT)
 * - Creates enrichment status tracking extensions
 * - Merges new extensions with existing task extensions recursively
 * - Updates Task resource with comprehensive enriched data and connector inputs
 * - Conditionally updates associated Patient resource with data point extensions
 */

import type { BotEvent, MedplumClient } from '@medplum/core'
import type { Task, Extension, TaskInput } from '@medplum/fhirtypes'

// Constants for extension URLs
const AWELL_TASK_EXTENSION_URL =
  'https://awellhealth.com/fhir/StructureDefinition/awell-task'
const AWELL_DATA_POINTS_EXTENSION_URL =
  'https://awellhealth.com/fhir/StructureDefinition/awell-data-points'
const AWELL_ENRICHMENT_STATUS_EXTENSION_URL =
  'https://awellhealth.com/fhir/StructureDefinition/awell-enrichment-status'

interface ApiConfig {
  endpoint: string
  apiKey: string
  environment: string
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

interface BaselineDataPoint {
  value: string
  definition: {
    id: string
    valueType: string
  }
}

interface BaselineInfoResponse {
  data: {
    baselineInfo: {
      baselineDataPoints: BaselineDataPoint[]
    }
  }
  errors?: GraphQLError[]
}

interface GetHostedPagesLinkResponse {
  data: {
    hostedPagesLink: {
      hosted_pages_link: { url: string }
    }
  }
  errors?: GraphQLError[]
}

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
}

interface TaskExtensionData {
  releaseId: string
  pathwayId: string
  activityId?: string
  stakeholderId?: string
}

// GraphQL Queries
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
      }
    }
  }
`

const GET_BASELINE_INFO_QUERY = `
  query GetBaselineInfo($pathway_id: String!) {
    baselineInfo(pathway_id: $pathway_id) {
      baselineDataPoints {
        value
        definition {
          id
          valueType
        }
      }
    }
  }
`

const GET_HOSTED_PAGES_LINK = `
  query GetHostedPagesLink($pathwayId: String!, $stakeholderId: String!) {
    hostedPagesLink(pathway_id: $pathwayId, stakeholder_id: $stakeholderId) {
      code
      success
      hosted_pages_link {
        url
        __typename
      }
      __typename
    }
  }
`

async function executeGraphQLQuery<T>(
  config: ApiConfig,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.apiKey,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    const responseText = await response.text()
    throw new Error(
      `GraphQL request failed with status ${response.status}: ${response.statusText}. Response: ${responseText}`,
    )
  }

  const data = (await response.json()) as T
  const dataWithErrors = data as unknown as { errors?: GraphQLError[] }
  if (dataWithErrors.errors && Array.isArray(dataWithErrors.errors)) {
    const errorMessages = dataWithErrors.errors
      .map((err) => err.message)
      .join('; ')
    throw new Error(`GraphQL errors: ${errorMessages}`)
  }

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
  )
  return data.data.pathwayDataPointDefinitions.data_point_definitions
}

async function fetchDataPoints(
  config: ApiConfig,
  pathwayId: string,
  activityId?: string,
): Promise<DataPoint[]> {
  if (!activityId) {
    const data = await executeGraphQLQuery<BaselineInfoResponse>(
      config,
      GET_BASELINE_INFO_QUERY,
      { pathway_id: pathwayId },
    )
    return data.data.baselineInfo.baselineDataPoints.map((dp) => ({
      data_point_definition_id: dp.definition.id,
      valueType: dp.definition.valueType,
      serialized_value: dp.value,
    }))
  }

  const data = await executeGraphQLQuery<DataPointsResponse>(
    config,
    GET_DATA_POINT_QUERY,
    { pathway_id: pathwayId, activity_id: activityId },
  )
  return data.data.pathwayDataPoints.dataPoints
}

async function fetchHostedPagesLink(
  config: ApiConfig,
  pathwayId: string,
  stakeholderId: string,
): Promise<string | null> {
  try {
    const data = await executeGraphQLQuery<GetHostedPagesLinkResponse>(
      config,
      GET_HOSTED_PAGES_LINK,
      { pathwayId, stakeholderId },
    )
    return data.data.hostedPagesLink.hosted_pages_link.url
  } catch (error) {
    throw new Error(
      `Failed to fetch hosted pages link: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

function extractFromTaskExtension(
  task: Task,
  fieldName: string,
): string | null {
  const awellExtension = task.extension
    ?.find((ext) => ext.url === AWELL_TASK_EXTENSION_URL)
    ?.extension?.find((ext) => ext.url === fieldName)
  return awellExtension?.valueString || null
}

function extractTaskExtensionData(task: Task): TaskExtensionData | null {
  const releaseId = extractFromTaskExtension(task, 'release-id')
  const pathwayId = extractFromTaskExtension(task, 'pathway-id')
  const activityId = extractFromTaskExtension(task, 'activity-id')
  const stakeholderId = extractFromTaskExtension(task, 'stakeholder-id')

  if (!releaseId || !pathwayId) {
    return null
  }

  return {
    releaseId,
    pathwayId,
    activityId: activityId || undefined,
    stakeholderId: stakeholderId || undefined,
  }
}

function hasEnrichmentBeenDone(task: Task, status: string): boolean {
  const enrichmentExtension = task.extension?.find(
    (ext) => ext.url === AWELL_ENRICHMENT_STATUS_EXTENSION_URL,
  )
  const statusExtension = enrichmentExtension?.extension?.find(
    (ext) => ext.url === status,
  )
  return statusExtension?.valueBoolean === true
}

function createDataPointExtensions(
  dataPoints: DataPoint[],
  dataPointDefinitions: DataPointDefinition[],
): Extension[] {
  if (dataPoints.length === 0) return []

  const result: Extension[] = []

  // Data points are added to the awell-data-points extension in tasks & patients
  // JSON data points are excluded from there as they tend to be large and
  // therefore cause rendering issues.
  const standardDataPoints = dataPoints.filter((dp) => dp.valueType !== 'JSON')
  if (standardDataPoints.length > 0) {
    const extensions = standardDataPoints
      .map((dataPoint) =>
        createSingleDataPointExtensions(dataPoint, dataPointDefinitions),
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

  // JSON data points are added to a separate extension so that they can
  // be rendered with specific styling to help with readability.
  const jsonDataPoints = dataPoints.filter((dp) => dp.valueType === 'JSON')
  if (jsonDataPoints.length > 0) {
    const extensions = jsonDataPoints
      .map((dataPoint) =>
        createSingleDataPointExtensions(dataPoint, dataPointDefinitions),
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

  return result
}

function createSingleDataPointExtensions(
  dataPoint: DataPoint,
  dataPointDefinitions: DataPointDefinition[],
): { url: string; valueString: string }[] | null {
  const definition = dataPointDefinitions.find(
    (def) => def.id === dataPoint.data_point_definition_id,
  )

  if (!definition || !dataPoint.serialized_value || !definition.title) {
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
  }

  return [baseExtension]
}

async function createConnectorInputs(
  config: ApiConfig,
  extensionData: TaskExtensionData,
  task: Task,
): Promise<TaskInput[]> {
  const connectorInputs: TaskInput[] = []

  // Add Awell Care connector
  const connectorUrl = `https://care${config.environment !== '' ? `.${config.environment}` : ''}.awellhealth.com/pathway/${extensionData.pathwayId}/activity-feed?activityId=${extensionData.activityId}`
  connectorInputs.push({
    type: {
      coding: [
        {
          system: 'http://awellhealth.com/fhir/connector-type',
          code: 'awell-care',
          display: 'Awell Care',
        },
      ],
    },
    valueUrl: connectorUrl,
  })

  // Check if task has performer type PT (Physical Therapist) - skip hosted pages link for these
  const isPatientTask = task.performerType?.some((performerType) =>
    performerType.coding?.some(
      (coding) =>
        coding.code === 'PT' &&
        coding.system === 'http://terminology.hl7.org/CodeSystem/v3-RoleCode',
    ),
  )

  if (isPatientTask) {
    console.log(
      `Skipping hosted pages link for task ${task.id} due to Patient performer type`,
    )
  }

  // Add Awell Hosted Pages connector if stakeholder ID is available and not PT performer type
  if (extensionData.stakeholderId && !isPatientTask) {
    const hostedPagesLink = await fetchHostedPagesLink(
      config,
      extensionData.pathwayId,
      extensionData.stakeholderId,
    )
    if (hostedPagesLink) {
      connectorInputs.push({
        type: {
          coding: [
            {
              system: 'http://awellhealth.com/fhir/connector-type',
              code: 'awell-hosted-pages',
              display: 'Awell Hosted Pages',
            },
          ],
        },
        valueUrl: hostedPagesLink,
      })
    }
  }

  return connectorInputs
}

/**
 * Recursively merges extensions, replacing existing ones that have matching URLs
 * with new ones, while preserving non-conflicting extensions.
 *
 * For extensions with nested extensions, recursively merges those as well.
 * This handles arbitrary levels of nesting.
 *
 * Example:
 * - existing: [{url: "age", value: "30"}, {url: "name", value: "John"}]
 * - new: [{url: "age", value: "31"}]
 * - result: [{url: "name", value: "John"}, {url: "age", value: "31"}]
 *
 * @see utility_functions.ts - mergeExtensions function
 */
function mergeExtensions(
  existingExtensions: Extension[],
  newExtensions: Extension[],
): Extension[] {
  if (newExtensions.length === 0) return existingExtensions
  if (existingExtensions.length === 0) return newExtensions

  // Create lookup map for new extensions by URL
  const newExtensionsByUrl = new Map<string, Extension>()
  for (const ext of newExtensions) {
    if (ext.url) {
      newExtensionsByUrl.set(ext.url, ext)
    }
  }

  const mergedExtensions: Extension[] = []

  // Process existing extensions
  for (const existingExt of existingExtensions) {
    const matchingNewExt = existingExt.url
      ? newExtensionsByUrl.get(existingExt.url)
      : null

    if (!matchingNewExt) {
      // No conflict - keep existing extension as-is
      mergedExtensions.push(existingExt)
    } else {
      // Both extensions have the same URL - merge them
      if (existingExt.extension && matchingNewExt.extension) {
        // Both have nested extensions - recursively merge them
        const mergedNestedExtensions = mergeExtensions(
          existingExt.extension,
          matchingNewExt.extension,
        )
        mergedExtensions.push({
          ...matchingNewExt, // Use new extension as base
          extension: mergedNestedExtensions,
        })
      } else {
        // At least one doesn't have nested extensions - use the new one completely
        mergedExtensions.push(matchingNewExt)
      }

      // Mark as processed so we don't add it again
      if (existingExt.url) {
        newExtensionsByUrl.delete(existingExt.url)
      }
    }
  }

  // Add any completely new extensions that didn't exist before
  for (const remainingNewExt of newExtensionsByUrl.values()) {
    mergedExtensions.push(remainingNewExt)
  }

  return mergedExtensions
}

function createEnrichmentStatusExtension(status: string): Extension {
  return {
    url: AWELL_ENRICHMENT_STATUS_EXTENSION_URL,
    extension: [
      {
        url: status,
        valueBoolean: true,
      },
    ],
  }
}

/**
 * Creates an enrichment status extension for the given status.
 * Returns the extension to be added to the task - does not mutate the task.
 */
function createEnrichmentStatusExtensionForTask(
  existingExtensions: Extension[],
  status: string,
): Extension {
  const existingEnrichmentExt = existingExtensions.find(
    (ext) => ext.url === AWELL_ENRICHMENT_STATUS_EXTENSION_URL,
  )

  if (!existingEnrichmentExt) {
    return createEnrichmentStatusExtension(status)
  }

  // Merge with existing enrichment extension
  const existingStatusExtensions = existingEnrichmentExt.extension || []
  const statusExtension = existingStatusExtensions.find(
    (ext) => ext.url === status,
  )

  if (!statusExtension) {
    // Add new status to existing enrichment extension
    return {
      url: AWELL_ENRICHMENT_STATUS_EXTENSION_URL,
      extension: [
        ...existingStatusExtensions,
        { url: status, valueBoolean: true },
      ],
    }
  }

  // Update existing status to true
  return {
    url: AWELL_ENRICHMENT_STATUS_EXTENSION_URL,
    extension: existingStatusExtensions.map((ext) =>
      ext.url === status ? { ...ext, valueBoolean: true } : ext,
    ),
  }
}

async function fetchDataPointsForTaskStatus(
  config: ApiConfig,
  taskStatus: string,
  extensionData: TaskExtensionData,
): Promise<DataPoint[]> {
  if (taskStatus === 'completed') {
    if (!extensionData.activityId) return []
    return fetchDataPoints(
      config,
      extensionData.pathwayId,
      extensionData.activityId,
    )
  }

  if (taskStatus === 'requested') {
    return fetchDataPoints(config, extensionData.pathwayId)
  }

  return []
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<Task>,
): Promise<void> {
  const task = event.input

  console.log(
    `Starting enrichment process for task ${task.id} with status '${task.status}'`,
  )

  try {
    if (!task.id) {
      throw new Error('Task is missing required id property')
    }

    if (hasEnrichmentBeenDone(task, task.status)) {
      console.log(
        `Enrichment already completed for task ${task.id} with status '${task.status}' - skipping`,
      )
      return
    }

    if (
      !event.secrets.AWELL_API_URL ||
      !event.secrets.AWELL_API_KEY ||
      !event.secrets.AWELL_ENVIRONMENT
    ) {
      throw new Error(
        'Missing required API configuration: AWELL_API_URL, AWELL_API_KEY, or AWELL_ENVIRONMENT',
      )
    }

    const apiConfig: ApiConfig = {
      endpoint: event.secrets.AWELL_API_URL.valueString || '',
      apiKey: event.secrets.AWELL_API_KEY.valueString || '',
      environment: event.secrets.AWELL_ENVIRONMENT.valueString || '',
    }

    const extensionData = extractTaskExtensionData(task)
    if (!extensionData) {
      throw new Error(
        'Missing required extension data (release-id and pathway-id)',
      )
    }

    const updatedInputs: TaskInput[] = []
    if (task.status === 'requested') {
      const newConnectorInputs = await createConnectorInputs(
        apiConfig,
        extensionData,
        task,
      )
      updatedInputs.push(...newConnectorInputs)
    }

    const dataPointExtensions: Extension[] = []
    const dataPoints = await fetchDataPointsForTaskStatus(
      apiConfig,
      task.status,
      extensionData,
    )
    if (dataPoints.length > 0) {
      const dataPointDefinitions = await fetchDataPointDefinitions(
        apiConfig,
        extensionData.releaseId,
      )
      dataPointExtensions.push(
        ...createDataPointExtensions(dataPoints, dataPointDefinitions),
      )
    }

    const freshTask = await medplum.readResource('Task', task.id)

    const statusExtension = createEnrichmentStatusExtensionForTask(
      freshTask.extension || [],
      task.status,
    )

    await medplum.updateResource({
      ...freshTask,
      ...(updatedInputs.length > 0 && { input: updatedInputs }),
      extension: mergeExtensions(freshTask.extension || [], [
        statusExtension,
        ...dataPointExtensions,
      ]),
    })

    console.log(
      `Enrichment completed successfully for task ${task.id}: processed ${dataPoints.length} data points, added ${updatedInputs.length} connector inputs, updated ${dataPointExtensions.length > 0 ? 'patient' : 'task only'}`,
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(`Enrichment failed for task ${task.id}: ${errorMessage}`)
    throw error
  }
}
