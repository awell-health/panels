/**
 * Bot Name: [PROJECT] Patient datapoint update
 *
 * Triggering Event:
 * - ActivityData event
 *
 * FHIR Resources Created/Updated:
 * - Patient: Updated (when new data points are found) - Extensions array with latest data point extensions merged with existing extensions
 *
 * Process Overview:
 * - Receives ActivityData via event
 * - Fetches Patient resource using patient_id from activity data
 * - Extracts Awell pathway information from activity data
 * - Fetches latest data points and definitions from Awell GraphQL API
 * - Merges new data point extensions with existing patient extensions
 * - Updates Patient resource with latest data point information
 */

import type { BotEvent, MedplumClient } from '@medplum/core'
import type { Extension } from '@medplum/fhirtypes'

// Constants for extension URLs
const AWELL_DATA_POINTS_EXTENSION_URL =
  'https://awellhealth.com/fhir/StructureDefinition/awell-data-points'

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

interface PathwayResponse {
  data: {
    pathway: {
      pathway: {
        id: string
        release_id: string
      }
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

interface ActivityData {
  pathway_id: string
  patient_id: string
  pathway: {
    id: string
    pathway_definition_id: string
    patient_id: string
    tenant_id: string
    start_date: string
    pathway_title: string
    release_id: string
  }
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

const GET_PATHWAY_QUERY = `
  query GetPathway($pathway_id: String!) {
    pathway(id: $pathway_id) {
      pathway {
        id
        release_id
      }
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
): Promise<DataPoint[]> {
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

async function fetchPathwayReleaseId(
  config: ApiConfig,
  pathwayId: string,
): Promise<string> {
  const data = await executeGraphQLQuery<PathwayResponse>(
    config,
    GET_PATHWAY_QUERY,
    { pathway_id: pathwayId },
  )
  return data.data.pathway.pathway.release_id
}

function createDataPointExtensions(
  dataPoints: DataPoint[],
  dataPointDefinitions: DataPointDefinition[],
): Extension[] {
  if (dataPoints.length === 0) return []

  const result: Extension[] = []

  // Data points are added to the awell-data-points extension in patients
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

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<ActivityData>,
): Promise<void> {
  const activityData = event.input

  console.log(
    `Starting datapoint update process for patient ${activityData.patient_id}`,
  )

  try {
    if (
      !event.secrets.AWELL_API_URL ||
      !event.secrets.AWELL_API_KEY ||
      !event.secrets.AWELL_ENVIRONMENT
    ) {
      throw new Error(
        'Missing required API configuration: AWELL_API_URL, AWELL_API_KEY, or AWELL_ENVIRONMENT',
      )
    }

    const { patient_id, pathway_id } = activityData

    if (!patient_id) {
      console.log(
        'ActivityData is missing required patient_id property - skipping update',
      )
      return
    }

    if (!pathway_id) {
      console.log(
        'ActivityData is missing required pathway_id property - skipping update',
      )
      return
    }

    const apiConfig: ApiConfig = {
      endpoint: event.secrets.AWELL_API_URL.valueString || '',
      apiKey: event.secrets.AWELL_API_KEY.valueString || '',
      environment: event.secrets.AWELL_ENVIRONMENT.valueString || '',
    }

    let release_id = activityData.pathway.release_id

    // If release_id is not available in activity data, fetch it from the pathway
    if (!release_id) {
      console.log(
        'Release ID not found in activity data, fetching from pathway...',
      )
      try {
        release_id = await fetchPathwayReleaseId(apiConfig, pathway_id)
      } catch (error) {
        console.log(
          `Failed to fetch release ID from pathway: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
        return
      }
    }

    // Find the patient using Awell identifier - fail if patient doesn't exist
    // We are doing patch and testing if the patient changed in the meantime so we need to find the patient before checking the datapoints.
    // That way we ensure eventually we always store the latest version of datapoints.
    const searchQuery = {
      identifier: `https://awellhealth.com/patients|${patient_id}`,
    }

    const patient = await medplum.searchOne('Patient', searchQuery)
    if (!patient) {
      throw new Error(`Patient with Awell ID ${patient_id} not found`)
    }

    if (!patient.id) {
      throw new Error('Found patient but missing ID')
    }

    // Fetch latest data points and definitions
    const dataPoints = await fetchDataPoints(apiConfig, pathway_id)

    if (dataPoints.length === 0) {
      console.log(
        `No data points found for patient ${activityData.patient_id} - skipping update`,
      )
      return
    }

    const dataPointDefinitions = await fetchDataPointDefinitions(
      apiConfig,
      release_id,
    )

    const dataPointExtensions = createDataPointExtensions(
      dataPoints,
      dataPointDefinitions,
    )

    if (dataPointExtensions.length === 0) {
      console.log(
        `No valid data point extensions created for patient ${activityData.patient_id} - skipping update`,
      )
      return
    }

    // Fetch fresh patient data and merge extensions
    const mergedExtensions = mergeExtensions(
      patient.extension || [],
      dataPointExtensions,
    )

    // Update patient extensions using patch operation with version check
    try {
      await medplum.patchResource('Patient', patient.id, [
        {
          op: 'test',
          path: '/meta/versionId',
          value: patient.meta?.versionId || '1',
        },
        {
          op: 'replace',
          path: '/extension',
          value: mergedExtensions,
        },
      ])
    } catch (error) {
      if (error instanceof Error && error.message.includes('412')) {
        console.log(
          `Patient ${activityData.patient_id} was modified by another process - skipping update to avoid conflicts`,
        )
        return
      }
      throw error
    }

    console.log(
      `Datapoint update completed successfully for patient ${activityData.patient_id}: processed ${dataPoints.length} data points, updated ${dataPointExtensions.length} extension groups`,
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(
      `Datapoint update failed for patient ${activityData.patient_id}: ${errorMessage}`,
    )
    throw error
  }
}
