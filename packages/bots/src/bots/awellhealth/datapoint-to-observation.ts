/**
 * Bot Name: [PROJECT][Awell] Datapoint to observation conversion
 *
 * Triggering Event:
 * - Routed datapoint events from datapoint-bot-router for observation-type datapoints
 *
 * FHIR Resources Created/Updated:
 * - Observation: Created (always when observation mapping found) - Complete resource with LOINC coding, category (laboratory/vital-signs), value (quantity/string), status, effective date, issued timestamp, and patient subject reference
 *
 * Process Overview:
 * - Receives datapoint payload from router with comprehensive observation dictionary mapping for proper field translation
 * - Maps observation datapoint values to FHIR Observation fields using standardized LOINC coding system for clinical interoperability
 * - Handles different value types appropriately (numeric quantities with units vs string values) based on datapoint value type
 * - Creates Observation resource with proper categories (laboratory vs vital-signs), status, effective date, and issued timestamp
 * - Links observation to existing patient resource with comprehensive identifiers including Awell datapoint identifier for traceability
 */

import type { BotEvent, MedplumClient } from '@medplum/core'
import type { Observation } from '@medplum/fhirtypes'

// Type definition for observation details
interface ObservationDetails {
  definition_name: string
  unit: string
  display: string
  coding: {
    system: string
    code: string
    display: string
  }
  category: string
}

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
  observation_dict: Record<string, ObservationDetails>
  patient_id: string
}

// Get observation details by ID
function getObservationDetails(
  observationId: string,
  observation_dict: Record<string, ObservationDetails>,
): ObservationDetails | undefined {
  return observation_dict[observationId]
}
// Create observation from datapoint
function createObservationFromDataPoint(
  dataPoint: DataPointRouterPayload['data_point'],
  patientId: string,
  observation_dict: Record<string, ObservationDetails>,
): Observation {
  const observationDetails = getObservationDetails(
    dataPoint.data_point_definition_id,
    observation_dict,
  )

  if (!observationDetails) {
    throw new Error(
      `Unknown observation type for ID: ${dataPoint.data_point_definition_id}`,
    )
  }

  const observation: Observation = {
    resourceType: 'Observation',
    status: 'final',
    category: [
      {
        coding: [
          {
            system:
              'http://terminology.hl7.org/CodeSystem/observation-category',
            code: observationDetails.category,
            display:
              observationDetails.category === 'vital-signs'
                ? 'Vital Signs'
                : 'Laboratory',
          },
        ],
      },
    ],
    code: {
      coding: [observationDetails.coding],
      text: observationDetails.display,
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    effectiveDateTime: dataPoint.date,
    issued: new Date().toISOString(),
    identifier: [
      {
        system: 'https://awellhealth.com/datapoints',
        value: dataPoint.id,
      },
    ],
  }

  // Set the value based on the valueType
  if (dataPoint.valueType === 'number' && typeof dataPoint.value === 'number') {
    observation.valueQuantity = {
      value: dataPoint.value,
      unit: observationDetails.unit,
    }
  } else if (
    dataPoint.valueType === 'string' ||
    typeof dataPoint.value === 'string'
  ) {
    observation.valueString = dataPoint.value.toString()
  } else {
    // Fallback to string representation
    observation.valueString = dataPoint.value.toString()
  }

  return observation
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<DataPointRouterPayload>,
): Promise<void> {
  const { data_point, patient_id, observation_dict } = event.input

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
    // Create observation from datapoint
    const observation = createObservationFromDataPoint(
      data_point,
      patient_id,
      observation_dict,
    )

    // Save observation to Medplum
    const resultObservation = await medplum.createResource(observation)

    console.log(
      'Observation created successfully:',
      JSON.stringify(
        {
          observationId: resultObservation.id,
          dataPointId: data_point.id,
          patientId: patient_id,
          observationType: getObservationDetails(
            data_point.data_point_definition_id,
            observation_dict,
          )?.display,
          value: data_point.value,
          effectiveDate: data_point.date,
        },
        null,
        2,
      ),
    )

    console.log(
      'Bot finished processing datapoint:',
      JSON.stringify(
        {
          dataPointId: data_point.id,
          observationCreated: true,
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
