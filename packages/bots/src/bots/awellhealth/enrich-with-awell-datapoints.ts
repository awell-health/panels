import type { BotEvent, MedplumClient } from '@medplum/core'
import type { Task, Extension } from '@medplum/fhirtypes'

let GRAPHQL_ENDPOINT = ''
let API_KEY = ''

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
    query GetPathwayDataPoints($pathway_id: String!) {
    pathwayDataPoints(
      pathway_id: $pathway_id
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

interface SeparatedDataPoints {
  jsonDataPoints: DataPoint[]
  nonJsonDataPoints: DataPoint[]
}

async function fetchDataPointDefinitions(
  releaseId: string,
): Promise<DataPointDefinition[]> {
  console.log(`Fetching data point definitions for release ID: ${releaseId}`)
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: API_KEY,
    },
    body: JSON.stringify({
      query: GET_DATA_POINT_DEFINITIONS_QUERY,
      variables: { release_id: releaseId },
    }),
  })

  const data = (await response.json()) as DataPointDefinitionsResponse
  const definitions =
    data.data.pathwayDataPointDefinitions.data_point_definitions
  console.log(`Retrieved ${definitions.length} data point definitions`)
  return definitions
}

async function fetchDataPoints(pathwayId: string): Promise<DataPoint[]> {
  console.log(`Fetching data points for pathway ID: ${pathwayId}`)

  // For now lets only fetch the latest 1000 data points, that should be enough
  // we will need to review this strategy later on anyways as we want to classify data
  // if this is not enough we can use the pagination to fetch all data points.
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: API_KEY,
    },
    body: JSON.stringify({
      query: GET_DATA_POINT_QUERY,
      variables: { pathway_id: pathwayId },
      pagination: {
        count: 1000,
        offset: 0,
      },
    }),
  })

  const data = (await response.json()) as DataPointsResponse
  const dataPoints = data.data.pathwayDataPoints.dataPoints
  console.log(`Retrieved ${dataPoints.length} data points`)

  // Deduplicate data points based on definition ID and date, keeping only the latest
  const deduplicatedDataPoints = deduplicateDataPoints(dataPoints)
  return deduplicatedDataPoints
}

export function deduplicateDataPoints(dataPoints: DataPoint[]): DataPoint[] {
  const dataPointMap = new Map<string, DataPoint>()

  for (const dataPoint of dataPoints) {
    const definitionId = dataPoint.data_point_definition_id
    const existingDataPoint = dataPointMap.get(definitionId)

    if (
      !existingDataPoint ||
      new Date(dataPoint.date) > new Date(existingDataPoint.date)
    ) {
      dataPointMap.set(definitionId, dataPoint)
    }
  }

  const deduplicatedDataPoints = Array.from(dataPointMap.values())
  console.log(
    `Deduplicated ${dataPoints.length} data points to ${deduplicatedDataPoints.length} unique data points`,
  )
  return deduplicatedDataPoints
}

function isJsonDataPoint(dataPoint: DataPoint): boolean {
  return dataPoint.valueType === 'JSON'
}

function separateDataPointsByType(
  dataPoints: DataPoint[],
): SeparatedDataPoints {
  const jsonDataPoints: DataPoint[] = []
  const nonJsonDataPoints: DataPoint[] = []

  for (const dataPoint of dataPoints) {
    if (isJsonDataPoint(dataPoint)) {
      jsonDataPoints.push(dataPoint)
    } else {
      nonJsonDataPoints.push(dataPoint)
    }
  }

  console.log(
    `Separated data points: ${jsonDataPoints.length} JSON, ${nonJsonDataPoints.length} non-JSON`,
  )
  return { jsonDataPoints, nonJsonDataPoints }
}

function createDataPointExtensions(
  dataPoints: DataPoint[],
  dataPointDefinitions: DataPointDefinition[],
  suffix?: string,
): Extension[] {
  const extensions = dataPoints
    .map((dataPoint) => {
      const definition = dataPointDefinitions.find(
        (definition) => definition.id === dataPoint.data_point_definition_id,
      )

      console.log(
        `Mapping data point ${definition?.title}, ${dataPoint.data_point_definition_id}, ${dataPoint.valueType} to extension`,
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

      if (
        definition.title === 'CompletionDate' ||
        definition.title === 'ActivationDate'
      ) {
        return null
      }

      // Check if this data point definition has possible values
      if (definition.possibleValues && definition.possibleValues.length > 0) {
        // Find the matching possible value to get the label
        const matchingPossibleValue = definition.possibleValues.find(
          (pv) => pv.value === value,
        )

        if (matchingPossibleValue) {
          // Create two extensions: one for the value and one for the label
          return [
            {
              url: definition.title,
              valueString: value,
            },
            {
              url: `${definition.title}_label`,
              valueString: matchingPossibleValue.label,
            },
          ]
        }
        // Value doesn't match any possible value, just return the value extension
        console.log(
          `WARNING: Value "${value}" for data point "${definition.title}" doesn't match any possible values`,
        )
        return [
          {
            url: definition.title,
            valueString: value,
          },
        ]
      }
      // No possible values, return single extension
      return [
        {
          url: definition.title,
          valueString: value,
        },
      ]
    })
    .filter(
      (ext): ext is { url: string; valueString: string }[] => ext !== null,
    )
    .flat() // Flatten the array of arrays into a single array

  console.log(`Created ${extensions.length} valid data point extensions`)
  return [
    {
      url: `https://awellhealth.com/fhir/StructureDefinition/awell-data-points${suffix ? `-${suffix}` : ''}`,
      extension: extensions,
    },
  ]
}

function replaceExtensions(
  existingExtensions: Extension[],
  newExtensions: Extension[],
): Extension[] {
  // Remove existing extensions that match the URLs of new extensions
  const filteredExtensions = existingExtensions.filter(
    (existingExt) =>
      !newExtensions.some((newExt) => newExt.url === existingExt.url),
  )

  // Add the new extensions
  return [...filteredExtensions, ...newExtensions]
}

async function updateTaskWithExtensions(
  medplum: MedplumClient,
  task: Task,
  nonJsonExtensions: Extension[],
  jsonExtensions: Extension[],
): Promise<void> {
  if (!task.extension) {
    task.extension = []
  }

  try {
    console.log(
      `Adding ${nonJsonExtensions.length} non-JSON data point extensions to task`,
    )
    task.extension.push(...nonJsonExtensions)

    await medplum.updateResource(task)
    console.log(
      'Successfully updated task with non-JSON data point extensions and note',
    )
  } catch (error) {
    console.log(
      'ERROR: Error updating task with data point extensions:',
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        taskId: task.id,
        nonJsonExtensionsCount: nonJsonExtensions.length,
        jsonExtensionsCount: jsonExtensions.length,
      }),
    )
  }

  try {
    console.log(
      `Adding ${jsonExtensions.length} JSON data point extensions to task`,
    )
    task.extension.push(...jsonExtensions)
    await medplum.updateResource(task)
    console.log('Successfully updated task with JSON data point extensions')
  } catch (error) {
    console.log(
      'ERROR: Error updating task with data point extensions:',
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        taskId: task.id,
        nonJsonExtensionsCount: nonJsonExtensions.length,
        jsonExtensionsCount: jsonExtensions.length,
      }),
    )
  }
}

async function updatePatientWithExtensions(
  medplum: MedplumClient,
  task: Task,
  nonJsonExtensions: Extension[],
  jsonExtensions: Extension[],
): Promise<void> {
  try {
    // Add extensions to patient if task.for reference exists
    if (task.for?.reference) {
      const patientId = task.for.reference.split('/')[1]
      if (patientId) {
        console.log(`Adding data point extensions to patient: ${patientId}`)
        const patient = await medplum.readResource('Patient', patientId)

        if (!patient.extension) {
          patient.extension = []
        }

        try {
          // Replace the extensions without JSON
          console.log(
            'Replacing awell non-JSON data point extensions on patient',
          )
          patient.extension = replaceExtensions(
            patient.extension,
            nonJsonExtensions,
          )
          await medplum.updateResource(patient)
          console.log(
            'Successfully updated patient with non-JSON data point extensions',
          )
        } catch (error) {
          console.log(
            'ERROR: Error updating patient with non-JSON data point extensions:',
            JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              patientId: patientId,
              nonJsonExtensionsCount: nonJsonExtensions.length,
            }),
          )
        }

        try {
          // Replace the extensions with JSON
          console.log('Replacing awell JSON data point extensions on patient')
          patient.extension = replaceExtensions(
            patient.extension,
            jsonExtensions,
          )
          await medplum.updateResource(patient)
          console.log(
            'Successfully updated patient with JSON data point extensions',
          )
        } catch (error) {
          console.log(
            'ERROR: Error updating patient with JSON data point extensions:',
            JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              patientId: patientId,
              jsonExtensionsCount: jsonExtensions.length,
            }),
          )
        }
      }
    }
  } catch (error) {
    console.log(
      'ERROR: Error enriching patient with Awell data points:',
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        taskId: task.id,
        patientId: task.for?.reference?.split('/')[1],
        nonJsonExtensionsCount: nonJsonExtensions.length,
        jsonExtensionsCount: jsonExtensions.length,
      }),
    )
    throw error
  }
}

function extractReleaseId(task: Task): string | null {
  const awellExtension = task.extension
    ?.find(
      (ext) =>
        ext.url ===
        'https://awellhealth.com/fhir/StructureDefinition/awell-task',
    )
    ?.extension?.find((ext) => ext.url === 'release-id')
  if (awellExtension) {
    console.log(`Found release ID: ${awellExtension.valueString}`)
    return awellExtension.valueString || null
  }
  console.log('No release ID found in task extensions')
  return null
}

function extractPathwayId(task: Task): string | null {
  const awellExtension = task.extension
    ?.find(
      (ext) =>
        ext.url ===
        'https://awellhealth.com/fhir/StructureDefinition/awell-task',
    )
    ?.extension?.find((ext) => ext.url === 'pathway-id')
  if (awellExtension) {
    console.log(`Found pathway ID: ${awellExtension.valueString}`)
    return awellExtension.valueString || null
  }
  console.log('No pathway ID found in task extensions')
  return null
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<Task>,
): Promise<void> {
  try {
    console.log('Starting data point enrichment for task:', event.input.id)

    if (!event.secrets.AWELL_API_URL || !event.secrets.AWELL_API_KEY) {
      console.log('AWELL_API_URL or AWELL_API_KEY is not set')
      return
    }

    GRAPHQL_ENDPOINT = event.secrets.AWELL_API_URL.valueString || ''
    API_KEY = event.secrets.AWELL_API_KEY.valueString || ''

    const task = event.input

    const releaseId = extractReleaseId(task)
    const pathwayId = extractPathwayId(task)

    if (!releaseId || !pathwayId) {
      console.log(
        'Missing release ID or pathway ID, skipping data point enrichment',
      )
      return
    }

    if (
      task.extension?.some(
        (ext) =>
          ext.url ===
          'https://awellhealth.com/fhir/StructureDefinition/awell-data-points',
      )
    ) {
      console.log(
        'Awell data points already exist on task, skipping awell data point enrichment',
      )
      return
    }

    if (
      task.extension?.some(
        (ext) =>
          ext.url ===
          'https://awellhealth.com/fhir/StructureDefinition/awell-data-points-json',
      )
    ) {
      console.log(
        'Awell data points already exist on task, skipping awell data point enrichment',
      )
      return
    }

    // Update the task with the new extensions
    if (!task.id) {
      throw new Error('Task is missing required id property')
    }

    try {
      const dataPointDefinitions = await fetchDataPointDefinitions(releaseId)
      const dataPoints = await fetchDataPoints(pathwayId)

      // Separate data points into JSON and non-JSON categories
      const { jsonDataPoints, nonJsonDataPoints } =
        separateDataPointsByType(dataPoints)

      // Create separate extensions for JSON and non-JSON data points
      const nonJsonExtensions = createDataPointExtensions(
        nonJsonDataPoints,
        dataPointDefinitions,
      )
      const jsonExtensions = createDataPointExtensions(
        jsonDataPoints,
        dataPointDefinitions,
        'json',
      )

      await updateTaskWithExtensions(
        medplum,
        task,
        nonJsonExtensions,
        jsonExtensions,
      )
      await updatePatientWithExtensions(
        medplum,
        task,
        nonJsonExtensions,
        jsonExtensions,
      )
    } catch (error) {
      // Log the error details
      console.log(
        'ERROR: Error enriching task with Awell data points:',
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          taskId: task.id,
          releaseId,
          pathwayId,
        }),
      )
      throw error
    }
  } catch (error) {
    // Log the error details
    console.log('ERROR: Unhandled error in data point enrichment:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      taskId: event.input.id,
    })
    throw error
  }
}
