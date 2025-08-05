/**
 * Bot Name: [PROJECT][Awell] Clinical note to composition conversion
 *
 * Triggering Event:
 * - Awell clinical note webhook events (clinical note creation or updates)
 *
 * FHIR Resources Created/Updated:
 * - Composition: Created (always when patient found) - Complete resource with clinical note narratives as sections, FHIR-compliant date formatting, status, and patient subject reference
 * - Patient: Updated (when baseline data points are available) - Extensions array with baseline data point extensions merged with existing extensions
 *
 * Process Overview:
 * - Receives Awell clinical note webhook payload with multiple narratives and pathway context
 * - Searches for existing patient in FHIR store using Awell patient identifier for proper resource linking
 * - Fetches latest baseline data points from Awell API for comprehensive patient context
 * - Transforms clinical note narratives into FHIR Composition sections with title, code, and narrative text
 * - Creates Composition resource with proper status, FHIR-compliant date formatting, and structured section organization
 * - Updates patient resource with latest baseline data point extensions for comprehensive patient data
 * - Links composition to existing patient resource and pathway context for comprehensive clinical documentation
 */

import type { BotEvent, MedplumClient } from '@medplum/core'
import type {
  Patient,
  Composition,
  CompositionSection,
  Extension,
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
 * API Configuration interface
 */
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

interface DataPointDefinitionsResponse {
  data: {
    pathwayDataPointDefinitions: {
      data_point_definitions: DataPointDefinition[]
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

// Constants for extension URLs
const AWELL_DATA_POINTS_EXTENSION_URL =
  'https://awellhealth.com/fhir/StructureDefinition/awell-data-points'

// GraphQL Queries
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

/**
 * Executes a GraphQL query against the Awell API
 */
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

/**
 * Fetches baseline data points for a pathway
 */
async function fetchBaselineDataPoints(
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

/**
 * Fetches data point definitions for a release
 */
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

/**
 * Creates data point extensions from data points and definitions
 */
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

/**
 * Creates extensions for a single data point
 */
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

/**
 * Updates patient with baseline data point extensions
 */
async function updatePatientWithBaselineDataPoints(
  medplum: MedplumClient,
  patient: Patient,
  dataPointExtensions: Extension[],
): Promise<void> {
  if (dataPointExtensions.length === 0) return

  const mergedExtensions = mergeExtensions(
    patient.extension || [],
    dataPointExtensions,
  )

  await medplum.updateResource({
    ...patient,
    extension: mergedExtensions,
  })
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
    // Validate API configuration
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

    // Fetch baseline data points if pathway information is available
    let baselineDataPointsCount = 0
    if (pathway?.id && pathway?.pathway_definition_id) {
      try {
        const baselineDataPoints = await fetchBaselineDataPoints(
          apiConfig,
          pathway.id,
        )

        if (baselineDataPoints.length > 0) {
          const dataPointDefinitions = await fetchDataPointDefinitions(
            apiConfig,
            pathway.pathway_definition_id,
          )

          const dataPointExtensions = createDataPointExtensions(
            baselineDataPoints,
            dataPointDefinitions,
          )

          if (dataPointExtensions.length > 0) {
            await updatePatientWithBaselineDataPoints(
              medplum,
              patient,
              dataPointExtensions,
            )
            baselineDataPointsCount = baselineDataPoints.length
          }
        }
      } catch (baselineError) {
        // Log error but don't fail the entire process
        console.log(
          'Failed to fetch or update baseline data points:',
          JSON.stringify(
            {
              error:
                baselineError instanceof Error
                  ? baselineError.message
                  : 'Unknown error',
              pathwayId: pathway.id,
              clinicalNoteId: clinical_note.clinical_note_id,
            },
            null,
            2,
          ),
        )
      }
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
          baselineDataPointsProcessed: baselineDataPointsCount,
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
          patientUpdatedWithBaseline: baselineDataPointsCount > 0,
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
