import type { BotEvent, MedplumClient } from '@medplum/core'
import type { Patient, BundleEntry } from '@medplum/fhirtypes'

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

const BOT_ROUTER_DICT: Record<string, string> = {
  'observation-bot': '0197e96e-9c40-77d6-80fc-f95f4fb369de',
  'encounter-bot': '0197e9b6-79bd-776a-b7cc-0a169cdda14d',
}

const OBSERVATION_IDS = [
  'DhPRklTreXaP',
  'TVNF1l5qPDvu',
  'uaz1iQmTESPT',
  'MKNSHn3UD5sR',
  'kOHcXDHBIzUa',
]
const ENCOUNTER_IDS = ['54sxFoMUSZGx', 'exs1LmSV01uN9TtKoRdHZ']

const ENCOUNTER_DICT: Record<string, string> = {
  encounter_class: 'W9g0WAwiodltREpc4p5fw',
  encounter_datetime: 'rRiRPn5E80Rf',
  encounter_location: 'mIR8pQtSndiPY45jU8jq8',
  encounter_type: 'KqwuG9KONE7m',
  encounter_location_id: 'RnaZLqW0xoQQFz63jHQ3D',
  encounter_nurse_unit: 'xK1eYmA5lYDPmwoCxizTD',
  encounter_nurse_unit_id: 'chgRgehKNxnVdb9WWq7px',
  encounter_service_type: 'DoGqJkOBHO2etWGjGfQ7Y',
}

const OBSERVATION_DICT: Record<string, ObservationDetails> = {
  DhPRklTreXaP: {
    definition_name: 'observation_creatinine_mg_dl',
    unit: 'mg/dL',
    display: 'Creatinine',
    coding: {
      system: 'http://loinc.org',
      code: '2160-0',
      display: 'Creatinine',
    },
    category: 'laboratory',
  },
  TVNF1l5qPDvu: {
    definition_name: 'observation_dbp_mmHg',
    unit: 'mmHg',
    display: 'Diastolic Blood Pressure',
    coding: {
      system: 'http://loinc.org',
      code: '8480-6',
      display: 'Diastolic Blood Pressure',
    },
    category: 'vital-signs',
  },
  uaz1iQmTESPT: {
    definition_name: 'observation_egfr_ml_min',
    unit: 'mL/min',
    display: 'eGFR',
    coding: { system: 'http://loinc.org', code: '33914-3', display: 'eGFR' },
    category: 'laboratory',
  },
  MKNSHn3UD5sR: {
    definition_name: 'observation_hba1c_percent',
    unit: '%',
    display: 'HbA1c',
    coding: { system: 'http://loinc.org', code: '30425-0', display: 'HbA1c' },
    category: 'laboratory',
  },
  kOHcXDHBIzUa: {
    definition_name: 'observation_sbp_mmHg',
    unit: 'mmHg',
    display: 'Systolic Blood Pressure',
    coding: {
      system: 'http://loinc.org',
      code: '8480-6',
      display: 'Systolic Blood Pressure',
    },
    category: 'vital-signs',
  },
  FtPUGWZaBaDC: {
    definition_name: 'observation_sodium_mmol_l',
    unit: 'mmol/L',
    display: 'Sodium',
    coding: { system: 'http://loinc.org', code: '2955-2', display: 'Sodium' },
    category: 'laboratory',
  },
  GlXTOIANxlMP: {
    definition_name: 'observation_weight_lbs',
    unit: 'lbs',
    display: 'Weight',
    coding: { system: 'http://loinc.org', code: '29463-7', display: 'Weight' },
    category: 'laboratory',
  },
}

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
    release_id: string
  }
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

interface DataPointRouterPayload {
  data_point: DataPointPayload['data_point']
  observation_dict?: Record<string, ObservationDetails>
  encounter_dict?: Record<string, string>
  patient_id: string
  pathway_id: string
}

// Find patient by identifier
async function findPatientByIdentifier(
  medplum: MedplumClient,
  patientId: string,
): Promise<BundleEntry<Patient> | undefined> {
  try {
    const searchResult = await medplum.search(
      'Patient',
      `identifier=${patientId}`,
    )
    if (searchResult.entry?.[0]?.resource?.id) {
      console.log(
        'Patient found in system:',
        JSON.stringify(
          {
            patientId,
            foundPatientId: searchResult.entry[0].resource.id,
          },
          null,
          2,
        ),
      )
      return searchResult.entry[0]
    }
  } catch (error) {
    console.log(
      'Patient not found in system:',
      JSON.stringify({ patientId }, null, 2),
    )
  }
  return undefined
}

// Create or find patient
async function findOrCreatePatient(
  medplum: MedplumClient,
  patientId: string,
  patientIdentifiers: Array<{ system: string; value: string }>,
): Promise<string> {
  const medplumPatient = await findPatientByIdentifier(medplum, patientId)

  if (medplumPatient?.resource?.id) {
    return medplumPatient.resource.id
  }

  // Create a new patient if not found
  const identifiers = [
    {
      system: 'https://awellhealth.com/patients',
      value: patientId,
    },
    ...patientIdentifiers.map((id) => ({
      system: id.system,
      value: id.value,
    })),
  ]

  const newPatient = (await medplum.updateResource({
    resourceType: 'Patient',
    identifier: identifiers,
    active: true,
  })) as Patient

  console.log(
    'New patient created:',
    JSON.stringify(
      {
        originalId: patientId,
        newPatientId: newPatient.id,
      },
      null,
      2,
    ),
  )

  return newPatient.id || ''
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<DataPointPayload>,
): Promise<void> {
  const { data_point, pathway, patient_id } = event.input

  console.log(
    'Bot started processing datapoint:',
    JSON.stringify(
      {
        dataPointId: data_point.id,
        eventType: event.input.event_type,
        pathwayId: event.input.pathway_id,
        patientId: patient_id,
      },
      null,
      2,
    ),
  )

  try {
    // Find or create patient
    const patientId = await findOrCreatePatient(
      medplum,
      patient_id,
      pathway.patient_identifiers,
    )

    // Route datapoint to appropriate bot based on data_point_definition_id
    const isObservation = OBSERVATION_IDS.includes(
      data_point.data_point_definition_id,
    )
    const isEncounter = ENCOUNTER_IDS.includes(
      data_point.data_point_definition_id,
    )

    if (isObservation) {
      console.log(
        'Routing to observation bot:',
        JSON.stringify(
          {
            dataPointId: data_point.id,
            dataPointDefinitionId: data_point.data_point_definition_id,
            botId: BOT_ROUTER_DICT['observation-bot'],
          },
          null,
          2,
        ),
      )

      // Call the observation bot
      const observationBotId = BOT_ROUTER_DICT['observation-bot']
      if (!observationBotId) {
        throw new Error('Observation bot ID not found in BOT_ROUTER_DICT')
      }
      await medplum.executeBot(observationBotId, {
        data_point,
        observation_dict: OBSERVATION_DICT,
        patient_id: patientId,
      } as DataPointRouterPayload)

      console.log(
        'Observation bot execution completed:',
        JSON.stringify(
          {
            dataPointId: data_point.id,
            observationCreated: true,
          },
          null,
          2,
        ),
      )
    } else if (isEncounter) {
      console.log(
        'Routing to encounter bot:',
        JSON.stringify(
          {
            dataPointId: data_point.id,
            dataPointDefinitionId: data_point.data_point_definition_id,
            botId: BOT_ROUTER_DICT['encounter-bot'],
            pathwayId: pathway.id,
          },
          null,
          2,
        ),
      )

      // Call the encounter bot
      const encounterBotId = BOT_ROUTER_DICT['encounter-bot']
      if (!encounterBotId) {
        throw new Error('Encounter bot ID not found in BOT_ROUTER_DICT')
      }
      await medplum.executeBot(encounterBotId, {
        data_point,
        encounter_dict: ENCOUNTER_DICT,
        patient_id: patientId,
        pathway_id: pathway.id,
      } as DataPointRouterPayload)

      console.log(
        'Encounter bot execution completed:',
        JSON.stringify(
          {
            dataPointId: data_point.id,
            encounterCreated: true,
          },
          null,
          2,
        ),
      )
    } else {
      console.log(
        'Unknown datapoint type, no routing performed:',
        JSON.stringify(
          {
            dataPointId: data_point.id,
            dataPointDefinitionId: data_point.data_point_definition_id,
            availableObservationIds: OBSERVATION_IDS,
            availableEncounterIds: ENCOUNTER_IDS,
          },
          null,
          2,
        ),
      )
    }

    console.log(
      'Bot finished processing datapoint:',
      JSON.stringify(
        {
          dataPointId: data_point.id,
          routed: isObservation || isEncounter,
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
