/**
 * Bot Name: [PROJECT][Awell] Datapoint to encounter conversion
 *
 * Triggering Event:
 * - Routed datapoint events from datapoint-bot-router for encounter-type datapoints
 *
 * FHIR Resources Created/Updated:
 * - Encounter: Created (always when sufficient encounter datapoints available) - Complete resource with class, type, location, service type, period, status, participant information, and patient subject reference
 *
 * Process Overview:
 * - Receives datapoint payload from router with encounter dictionary mapping for proper field translation
 * - Fetches additional encounter datapoints from Awell GraphQL API to gather complete encounter context and related data
 * - Maps encounter datapoint values to FHIR Encounter fields using encounter dictionary (class, type, location, service type, nurse unit information)
 * - Creates comprehensive Encounter resource with proper period timing, encounter status, and participant information
 * - Links encounter to existing patient resource with proper subject reference and encounter context for clinical workflows
 */

import type { BotEvent, MedplumClient } from '@medplum/core'
import type { Encounter } from '@medplum/fhirtypes'

interface DataPointRouterPayload {
  data_point: {
    id: string
    tenant_id: string
    data_point_definition_id: string
    valueType: string
    value: number | string
    data_set_id: string
    date: string
    release_id: string
  }
  encounter_dict?: Record<string, string>
  patient_id: string
  pathway_id: string
}

// GraphQL types for fetching datapoints
interface GraphQLError {
  message: string
  locations?: Array<{ line: number; column: number }>
  path?: string[]
}

interface DataPointsResponse {
  data: {
    pathwayDataPoints: {
      dataPoints: DataPoint[]
    }
  }
  errors?: GraphQLError[]
}

interface DataPoint {
  serialized_value: string
  data_point_definition_id: string
  valueType: string
  date: string
}

const GET_DATA_POINT_QUERY = `
    query GetPathwayDataPoints($pathway_id: String!, $data_point_definition_id: String) {
    pathwayDataPoints(
      pathway_id: $pathway_id
      data_point_definition_id: $data_point_definition_id
      pagination: {
        count: 1,
        offset: 0
      }
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
// Fetch datapoints from Awell API
async function fetchDataPoints(
  pathwayId: string,
  graphqlEndpoint: string,
  apiKey: string,
  dataPointDefinitionId?: string,
): Promise<DataPoint[]> {
  console.log(
    `Fetching data points for pathway ID: ${pathwayId}${dataPointDefinitionId ? `, definition ID: ${dataPointDefinitionId}` : ''}`,
  )

  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
    },
    body: JSON.stringify({
      query: GET_DATA_POINT_QUERY,
      variables: {
        pathway_id: pathwayId,
        data_point_definition_id: dataPointDefinitionId,
      },
      pagination: {
        count: 1,
        offset: 0,
      },
    }),
  })

  const data = (await response.json()) as DataPointsResponse
  const dataPoints = data.data.pathwayDataPoints.dataPoints
  console.log(`Retrieved ${dataPoints.length} data points`)
  return dataPoints
}

// Fetch latest datapoint for a specific definition ID
async function fetchLatestDataPoint(
  pathwayId: string,
  graphqlEndpoint: string,
  apiKey: string,
  dataPointDefinitionId: string,
): Promise<DataPoint | null> {
  const dataPoints = await fetchDataPoints(
    pathwayId,
    graphqlEndpoint,
    apiKey,
    dataPointDefinitionId,
  )
  return dataPoints.length > 0 && dataPoints[0] ? dataPoints[0] : null
}

// Fetch all encounter-related datapoints
async function fetchEncounterDataPoints(
  pathwayId: string,
  graphqlEndpoint: string,
  apiKey: string,
  encounter_dict: Record<string, string>,
): Promise<DataPoint[]> {
  const encounterDataPoints: DataPoint[] = []

  // Fetch latest datapoint for each encounter field
  for (const [fieldName, definitionId] of Object.entries(encounter_dict)) {
    console.log(
      `Fetching latest datapoint for ${fieldName} (definition ID: ${definitionId})`,
    )
    const dataPoint = await fetchLatestDataPoint(
      pathwayId,
      graphqlEndpoint,
      apiKey,
      definitionId,
    )
    if (dataPoint) {
      encounterDataPoints.push(dataPoint)
    }
  }

  console.log(
    `Retrieved ${encounterDataPoints.length} encounter-related datapoints`,
  )
  return encounterDataPoints
}

// Create encounter from datapoints
function createEncounterFromDataPoints(
  dataPoints: DataPoint[],
  patientId: string,
  encounterId: string,
  encounter_dict: Record<string, string>,
): Encounter {
  // Create a map of field values from datapoints
  const fieldValues = new Map<string, string>()

  for (const dataPoint of dataPoints) {
    // Find the field name by looking up the definition ID in the reversed dictionary
    const fieldName = Object.keys(encounter_dict).find(
      (key) => encounter_dict[key] === dataPoint.data_point_definition_id,
    )
    if (fieldName) {
      fieldValues.set(fieldName, dataPoint.serialized_value)
    }
  }

  const encounter: Encounter = {
    resourceType: 'Encounter',
    status: 'finished',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: fieldValues.get('encounter_class') || 'EMR',
      display: fieldValues.get('encounter_class') || 'emergency',
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    identifier: [
      {
        system: 'https://waypointhcs.com/encounters',
        value: encounterId,
      },
    ],
  }

  // Set period if encounter_datetime is available
  const encounterDateTime = fieldValues.get('encounter_datetime')
  if (encounterDateTime) {
    const encounterDate = new Date(encounterDateTime)
    encounter.period = {
      start: encounterDate.toISOString(),
    }
  }

  // Set type if encounter_type is available
  const encounterType = fieldValues.get('encounter_type')
  if (encounterType) {
    encounter.type = [
      {
        coding: [
          {
            system: 'https://awellhealth.com/fhir/CodeSystem/encounter-type',
            code: encounterType,
            display: encounterType,
          },
        ],
        text: encounterType,
      },
    ]
  }

  // Set location if encounter_location is available
  const encounterLocation = fieldValues.get('encounter_location')
  if (encounterLocation) {
    encounter.location = [
      {
        location: {
          reference: `Location/${fieldValues.get('encounter_location_id') || 'unknown'}`,
          display: encounterLocation,
        },
      },
    ]
  }

  // Add extensions for additional encounter data
  const extensions = []

  const encounterNurseUnit = fieldValues.get('encounter_nurse_unit')
  if (encounterNurseUnit) {
    extensions.push({
      url: 'https://awellhealth.com/fhir/StructureDefinition/encounter-nurse-unit',
      valueString: encounterNurseUnit,
    })
  }

  const encounterNurseUnitId = fieldValues.get('encounter_nurse_unit_id')
  if (encounterNurseUnitId) {
    extensions.push({
      url: 'https://awellhealth.com/fhir/StructureDefinition/encounter-nurse-unit-id',
      valueString: encounterNurseUnitId,
    })
  }

  const encounterServiceType = fieldValues.get('encounter_service_type')
  if (encounterServiceType) {
    extensions.push({
      url: 'https://awellhealth.com/fhir/StructureDefinition/encounter-service-type',
      valueString: encounterServiceType,
    })
  }

  if (extensions.length > 0) {
    encounter.extension = extensions
  }

  return encounter
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<DataPointRouterPayload>,
): Promise<void> {
  const { data_point, patient_id, pathway_id, encounter_dict } = event.input

  // Check if we have the required secrets for Awell API
  if (!event.secrets.AWELL_API_URL || !event.secrets.AWELL_API_KEY) {
    console.log(
      'AWELL_API_URL or AWELL_API_KEY is not set, skipping encounter creation',
    )
    return
  }

  const graphqlEndpoint = event.secrets.AWELL_API_URL.valueString || ''
  const apiKey = event.secrets.AWELL_API_KEY.valueString || ''

  console.log(
    'Bot started processing datapoint:',
    JSON.stringify(
      {
        dataPointId: data_point.id,
        patientId: patient_id,
      },
      null,
      2,
    ),
  )

  try {
    if (!encounter_dict) {
      throw new Error('Encounter dictionary is required but not provided')
    }

    console.log(
      'Encounter datapoint detected, creating encounter:',
      JSON.stringify(
        {
          dataPointId: data_point.id,
          encounterId: data_point.value,
          patientId: patient_id,
        },
        null,
        2,
      ),
    )

    // Fetch all encounter-related datapoints
    const encounterDataPoints = await fetchEncounterDataPoints(
      pathway_id,
      graphqlEndpoint,
      apiKey,
      encounter_dict,
    )

    // Create encounter from datapoints
    const encounter = createEncounterFromDataPoints(
      encounterDataPoints,
      patient_id,
      data_point.value.toString(),
      encounter_dict,
    )

    // Save encounter to Medplum
    const resultEncounter = await medplum.createResource(encounter)

    console.log(
      'Encounter created successfully:',
      JSON.stringify(
        {
          encounterId: resultEncounter.id,
          dataPointId: data_point.id,
          patientId: patient_id,
          pathwayId: pathway_id,
          encounterValue: data_point.value,
          encounterStatus: encounter.status,
          encounterClass: encounter.class?.display,
          encounterType: encounter.type?.[0]?.text,
        },
        null,
        2,
      ),
    )

    console.log(
      'Bot finished processing encounter datapoint:',
      JSON.stringify(
        {
          dataPointId: data_point.id,
          encounterCreated: true,
          encounterId: resultEncounter.id,
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
          dataPointId: data_point.id,
          patientId: patient_id,
        },
        null,
        2,
      ),
    )
    throw error
  }
}
