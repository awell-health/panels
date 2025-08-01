/**
 * Bot Name: [PROJECT][Awell] Patient ingestion
 *
 * Triggering Event:
 * - Awell webhook events for patient lifecycle (patient.created, patient.updated, patient.deleted)
 *
 * FHIR Resources Created/Updated:
 * - Patient: Created (patient.created events) - Complete resource with demographics, identifiers, telecom, address, connector extensions, and communication preferences
 * - Patient: Updated (patient.updated events) - All profile fields with merged extensions preserving existing data
 * - Task: Deleted (patient.deleted events) - All tasks associated with patient via subject reference for referential integrity
 * - Patient: Deleted (patient.deleted events) - Complete resource removal after task cleanup
 *
 * Process Overview:
 * - Receives Awell patient webhook payloads with patient profile data
 * - Transforms Awell patient profile data to FHIR Patient resource format with proper name, telecom, address mapping
 * - Creates connector extensions for linking to external systems (Awell Care, Elation) based on environment configuration
 * - Handles patient creation, updates with extension merging, and deletion with comprehensive cleanup of related resources
 */

import type { BotEvent, MedplumClient } from '@medplum/core'
import type {
  Patient,
  HumanName,
  ContactPoint,
  Address,
  Identifier,
  Extension,
} from '@medplum/fhirtypes'

// Types for webhook payload
interface PatientWebhookPayload {
  patient: {
    user: {
      id: string
      tenant_id: string
      profile_id: string
    }
    profile: PatientProfile
  }
  date: string
  event_type: 'patient.created' | 'patient.updated' | 'patient.deleted'
  tenant_id: string
}

interface PatientProfile {
  identifier?: Array<{
    system: string
    value: string
  }> | null
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  name?: string | null
  sex?: string | null
  birth_date?: string | null
  phone?: string | null
  mobile_phone?: string | null
  preferred_language?: string | null
  patient_code?: string | null
  national_registry_number?: string | null
  address?: {
    street?: string | null
    city?: string | null
    zip?: string | null
    state?: string | null
    country?: string | null
  } | null
}

// Constants for connector extensions
const AWELL_PATIENT_CONNECTORS_EXTENSION_URL =
  'https://awellhealth.com/fhir/StructureDefinition/awell-patient-connectors'

interface Config {
  environment: string
}

interface PatientConnector {
  type: {
    coding: Array<{
      system: string
      code: string
      display: string
    }>
  }
  valueUrl: string
}

// Helper functions (reused from activity-to-task.ts with adaptations)
function safeStringTrim(value: unknown): string | undefined {
  return value && typeof value === 'string' && value.trim()
    ? value.trim()
    : undefined
}

function formatBirthDate(
  dateStr: string | null | undefined,
): string | undefined {
  const trimmedDate = safeStringTrim(dateStr)
  if (!trimmedDate) return undefined

  try {
    const date = new Date(trimmedDate)
    if (Number.isNaN(date.getTime())) return undefined

    // Format as YYYY-MM-DD
    return date.toISOString().split('T')[0]
  } catch (error) {
    console.log(
      'Error formatting birth date:',
      JSON.stringify(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          dateStr,
        },
        null,
        2,
      ),
    )
    return undefined
  }
}

function createPatientConnectors(
  awellPatientId: string,
  config: Config,
  identifiers: Identifier[],
): PatientConnector[] {
  const connectors: PatientConnector[] = []

  // Add Awell Care connector
  const awellCareUrl = `https://care.${config.environment}.awellhealth.com/patients/${awellPatientId}`
  connectors.push({
    type: {
      coding: [
        {
          system: 'http://awellhealth.com/fhir/connector-type',
          code: 'awell-care',
          display: 'Awell Care',
        },
      ],
    },
    valueUrl: awellCareUrl,
  })

  // Add connectors based on other identifiers
  for (const identifier of identifiers) {
    if (identifier.system && identifier.value) {
      // Skip the Awell identifier since we already added that connector
      if (identifier.system === 'https://awellhealth.com/patients') {
        continue
      }

      // Check for Elation identifier
      if (identifier.system.includes('elation')) {
        // Determine Elation URL based on environment
        const elationDomain = ['sandbox', 'development', 'staging'].includes(
          config.environment,
        )
          ? 'sandbox.elationemr.com'
          : 'elationemr.com'

        connectors.push({
          type: {
            coding: [
              {
                system: 'http://awellhealth.com/fhir/connector-type',
                code: 'elation',
                display: 'Elation',
              },
            ],
          },
          valueUrl: `https://${elationDomain}/patient/${identifier.value}`,
        })
      }
    }
  }

  return connectors
}

function createPatientConnectorsExtension(
  connectors: PatientConnector[],
): Extension | null {
  if (connectors.length === 0) return null

  return {
    url: AWELL_PATIENT_CONNECTORS_EXTENSION_URL,
    extension: connectors.map((connector, index) => ({
      url: `connector-${index}`,
      extension: [
        {
          url: 'type-system',
          valueString: connector.type.coding[0]?.system || '',
        },
        {
          url: 'type-code',
          valueString: connector.type.coding[0]?.code || '',
        },
        {
          url: 'type-display',
          valueString: connector.type.coding[0]?.display || '',
        },
        {
          url: 'url',
          valueString: connector.valueUrl,
        },
      ],
    })),
  }
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

function createFhirPatient(
  awellPatientId: string,
  profile: PatientProfile,
  config?: Config,
): Patient {
  const name = createPatientName(profile)
  const identifiers = createPatientIdentifiers(awellPatientId, profile)
  const telecom = createPatientTelecom(profile)
  const address = createPatientAddress(profile)
  const gender = convertSexToGender(profile.sex)
  const birthDate = profile.birth_date
    ? formatBirthDate(profile.birth_date)
    : undefined

  const patient: Patient = {
    resourceType: 'Patient',
    identifier: identifiers,
    active: true,
  }

  if (Object.keys(name).length > 0) patient.name = [name]
  if (telecom.length > 0) patient.telecom = telecom
  if (Object.keys(address).length > 0) patient.address = [address as Address]
  if (gender) patient.gender = gender
  if (birthDate) patient.birthDate = birthDate
  const preferredLanguage = safeStringTrim(profile.preferred_language)
  if (preferredLanguage) {
    patient.communication = [
      {
        language: {
          coding: [
            {
              system: 'urn:ietf:bcp:47',
              code: preferredLanguage,
            },
          ],
        },
      },
    ]
  }

  // Add connector extensions if config is provided
  if (config) {
    const connectors = createPatientConnectors(
      awellPatientId,
      config,
      identifiers,
    )
    const connectorsExtension = createPatientConnectorsExtension(connectors)
    if (connectorsExtension) {
      patient.extension = [connectorsExtension]
    }
  }

  return patient
}

function createPatientName(profile: PatientProfile): HumanName {
  const name: HumanName = {}
  const lastName = safeStringTrim(profile.last_name)
  const firstName = safeStringTrim(profile.first_name)
  const fullName = safeStringTrim(profile.name)

  if (lastName) name.family = lastName
  if (firstName) name.given = [firstName]
  if (fullName) name.text = fullName

  return name
}

function createPatientIdentifiers(
  awellPatientId: string,
  profile: PatientProfile,
): Identifier[] {
  const identifiers: Identifier[] = [
    {
      system: 'https://awellhealth.com/patients',
      value: awellPatientId,
    },
  ]

  if (profile.identifier?.length) {
    for (const id of profile.identifier) {
      const system = safeStringTrim(id.system)
      const value = safeStringTrim(id.value)

      if (system && value) {
        identifiers.push({
          system,
          value,
        })
      }
    }
  }

  return identifiers
}

function createPatientTelecom(profile: PatientProfile): ContactPoint[] {
  const telecom: ContactPoint[] = []

  const email = safeStringTrim(profile.email)
  const phone = safeStringTrim(profile.phone)
  const mobilePhone = safeStringTrim(profile.mobile_phone)

  if (email) {
    telecom.push({ system: 'email', value: email })
  }
  if (phone) {
    telecom.push({ system: 'phone', value: phone, use: 'home' })
  }
  if (mobilePhone) {
    telecom.push({
      system: 'phone',
      value: mobilePhone,
      use: 'mobile',
    })
  }

  return telecom
}

function createPatientAddress(profile: PatientProfile): Partial<Address> {
  const addressFields: Partial<Address> = {}

  const street = safeStringTrim(profile.address?.street)
  const city = safeStringTrim(profile.address?.city)
  const zip = safeStringTrim(profile.address?.zip)
  const state = safeStringTrim(profile.address?.state)
  const country = safeStringTrim(profile.address?.country)

  if (street) addressFields.line = [street]
  if (city) addressFields.city = city
  if (zip) addressFields.postalCode = zip
  if (state) addressFields.state = state
  if (country) addressFields.country = country

  return addressFields
}

function convertSexToGender(
  sex?: string | number | null,
): 'male' | 'female' | 'other' | 'unknown' | undefined {
  if (sex === null || sex === undefined) return undefined

  // Handle numerical values (ISO/IEC 5218 standard)
  if (typeof sex === 'number') {
    switch (sex) {
      case 0:
        return 'unknown' // NOT_KNOWN
      case 1:
        return 'male' // MALE
      case 2:
        return 'female' // FEMALE
      default:
        return undefined
    }
  }

  // Handle string values
  const trimmedSex = safeStringTrim(sex)
  if (!trimmedSex) return undefined

  const normalizedSex = trimmedSex.toLowerCase()
  if (['male', 'female', 'other', 'unknown'].includes(normalizedSex)) {
    return normalizedSex as 'male' | 'female' | 'other' | 'unknown'
  }
  return undefined
}

function updatePatientWithProfile(
  existingPatient: Patient,
  profile: PatientProfile,
  awellPatientId: string,
  config?: Config,
): Patient {
  const name = createPatientName(profile)
  const identifiers = createPatientIdentifiers(awellPatientId, profile)
  const telecom = createPatientTelecom(profile)
  const address = createPatientAddress(profile)
  const gender = convertSexToGender(profile.sex)
  const birthDate = profile.birth_date
    ? formatBirthDate(profile.birth_date)
    : undefined

  const updatedPatient: Patient = {
    ...existingPatient,
    identifier: identifiers,
    active: true,
  }

  if (Object.keys(name).length > 0) updatedPatient.name = [name]
  if (telecom.length > 0) updatedPatient.telecom = telecom
  if (Object.keys(address).length > 0)
    updatedPatient.address = [address as Address]
  if (gender) updatedPatient.gender = gender
  if (birthDate) updatedPatient.birthDate = birthDate

  const preferredLanguage = safeStringTrim(profile.preferred_language)
  if (preferredLanguage) {
    updatedPatient.communication = [
      {
        language: {
          coding: [
            {
              system: 'urn:ietf:bcp:47',
              code: preferredLanguage,
            },
          ],
        },
      },
    ]
  }

  // Update connector extensions if config is provided
  if (config) {
    const connectors = createPatientConnectors(
      awellPatientId,
      config,
      identifiers,
    )
    const connectorsExtension = createPatientConnectorsExtension(connectors)
    if (connectorsExtension) {
      const mergedExtensions = mergeExtensions(
        existingPatient.extension || [],
        [connectorsExtension],
      )
      updatedPatient.extension = mergedExtensions
    }
  }

  return updatedPatient
}

async function createPatient(
  medplum: MedplumClient,
  awellPatientId: string,
  profile: PatientProfile,
  config?: Config,
): Promise<Patient> {
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

  // Search for existing patient first
  const existingPatient = await medplum.searchOne('Patient', searchQuery)

  if (existingPatient) {
    console.log(
      'Patient already exists, returning existing patient:',
      JSON.stringify(
        {
          awellPatientId,
          existingPatientId: existingPatient.id,
        },
        null,
        2,
      ),
    )
    return existingPatient
  }

  // Patient does not exist - create new patient
  const newPatient = createFhirPatient(awellPatientId, profile, config)

  console.log(
    'Creating new patient:',
    JSON.stringify(
      {
        awellPatientId,
      },
      null,
      2,
    ),
  )

  const createdPatient = await medplum.createResource(newPatient)

  console.log(
    'Patient created successfully:',
    JSON.stringify(
      {
        awellPatientId,
        patientId: createdPatient.id,
        lastUpdated: createdPatient.meta?.lastUpdated,
      },
      null,
      2,
    ),
  )

  return createdPatient
}

async function updateExistingPatient(
  medplum: MedplumClient,
  awellPatientId: string,
  profile: PatientProfile,
  config?: Config,
): Promise<Patient | undefined> {
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

  // Search for existing patient first
  const existingPatient = await medplum.searchOne('Patient', searchQuery)

  if (!existingPatient) {
    console.log(
      'Patient not found for update, skipping:',
      JSON.stringify(
        {
          awellPatientId,
        },
        null,
        2,
      ),
    )
    return undefined
  }

  // Patient exists - update with profile data
  console.log(
    'Found existing patient, updating profile:',
    JSON.stringify(
      {
        awellPatientId,
        existingPatientId: existingPatient.id,
      },
      null,
      2,
    ),
  )

  const patientId = existingPatient.id
  if (!patientId) {
    throw new Error('Patient ID is missing')
  }

  // Create updated patient with new profile data
  const updatedPatient = updatePatientWithProfile(
    existingPatient,
    profile,
    awellPatientId,
    config,
  )

  const savedPatient = await medplum.updateResource(updatedPatient)

  console.log(
    'Patient profile updated successfully:',
    JSON.stringify(
      {
        awellPatientId,
        patientId: savedPatient.id,
        lastUpdated: savedPatient.meta?.lastUpdated,
      },
      null,
      2,
    ),
  )

  return savedPatient
}

async function handlePatientCreated(
  medplum: MedplumClient,
  payload: PatientWebhookPayload,
  config?: Config,
): Promise<void> {
  const awellPatientId = payload.patient.user.id
  const profile = payload.patient.profile

  console.log(
    'Creating patient:',
    JSON.stringify(
      {
        awellPatientId,
        tenantId: payload.tenant_id,
      },
      null,
      2,
    ),
  )

  try {
    await createPatient(medplum, awellPatientId, profile, config)
  } catch (error) {
    console.log(
      'Error creating patient:',
      JSON.stringify(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          awellPatientId,
        },
        null,
        2,
      ),
    )
    throw error
  }
}

async function handlePatientUpdated(
  medplum: MedplumClient,
  payload: PatientWebhookPayload,
  config?: Config,
): Promise<void> {
  const awellPatientId = payload.patient.user.id
  const profile = payload.patient.profile

  console.log(
    'Updating patient:',
    JSON.stringify(
      {
        awellPatientId,
        tenantId: payload.tenant_id,
      },
      null,
      2,
    ),
  )

  try {
    const updatedPatient = await updateExistingPatient(
      medplum,
      awellPatientId,
      profile,
      config,
    )

    if (!updatedPatient) {
      console.log(
        'Patient update event dropped - patient does not exist:',
        JSON.stringify(
          {
            awellPatientId,
            tenantId: payload.tenant_id,
            eventType: payload.event_type,
            timestamp: payload.date,
          },
          null,
          2,
        ),
      )
      return
    }
  } catch (error) {
    console.log(
      'Error updating patient:',
      JSON.stringify(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          awellPatientId,
        },
        null,
        2,
      ),
    )
    throw error
  }
}

async function findPatientByAwellId(
  medplum: MedplumClient,
  awellPatientId: string,
): Promise<Patient | undefined> {
  try {
    const patient = await medplum.searchOne('Patient', {
      identifier: `https://awellhealth.com/patients|${awellPatientId}`,
    })
    if (patient?.id) {
      console.log(
        'Patient found in Medplum:',
        JSON.stringify(
          {
            awellPatientId,
            medplumPatientId: patient.id,
          },
          null,
          2,
        ),
      )
      return patient
    }
  } catch (error) {
    console.log(
      'Error searching for patient:',
      JSON.stringify(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          awellPatientId,
        },
        null,
        2,
      ),
    )
  }
  return undefined
}

async function handlePatientDeleted(
  medplum: MedplumClient,
  payload: PatientWebhookPayload,
): Promise<void> {
  const awellPatientId = payload.patient.user.id

  console.log(
    'Deleting patient:',
    JSON.stringify(
      {
        awellPatientId,
        tenantId: payload.tenant_id,
      },
      null,
      2,
    ),
  )

  try {
    // For deleted webhooks, profile is not set, so we search only by Awell patient ID
    const existingPatient = await findPatientByAwellId(medplum, awellPatientId)
    if (!existingPatient?.id) {
      console.log(
        'Patient not found for deletion:',
        JSON.stringify({ awellPatientId }, null, 2),
      )
      return
    }

    // delete all tasks for this patient
    const tasks = await medplum.search(
      'Task',
      `subject=Patient/${existingPatient.id}`,
    )
    if (tasks.entry) {
      console.log(
        'Deleting tasks for patient:',
        JSON.stringify(
          {
            awellPatientId,
            tasks: tasks.entry.length,
            deletedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      )
      for (const task of tasks.entry) {
        await medplum.deleteResource('Task', task.resource?.id || '')
      }
    }

    // Hard delete - completely remove the resource
    await medplum.deleteResource('Patient', existingPatient.id)

    console.log(
      'Patient deleted successfully:',
      JSON.stringify(
        {
          awellPatientId,
          medplumPatientId: existingPatient.id,
          deletedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    )
  } catch (error) {
    console.log(
      'Error deleting patient:',
      JSON.stringify(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          awellPatientId,
        },
        null,
        2,
      ),
    )
    throw error
  }
}

// Main handler
export async function handler(
  medplum: MedplumClient,
  event: BotEvent<PatientWebhookPayload>,
): Promise<void> {
  const payload = event.input

  console.log(
    'Patient webhook bot started:',
    JSON.stringify(
      {
        eventType: payload.event_type,
        patientId: payload.patient.user.id,
        tenantId: payload.tenant_id,
        timestamp: payload.date,
      },
      null,
      2,
    ),
  )

  // Create API config for connectors if environment is available
  const config: Config | undefined = event.secrets.AWELL_ENVIRONMENT
    ?.valueString
    ? { environment: event.secrets.AWELL_ENVIRONMENT.valueString }
    : undefined

  try {
    switch (payload.event_type) {
      case 'patient.created':
        await handlePatientCreated(medplum, payload, config)
        break
      case 'patient.updated':
        await handlePatientUpdated(medplum, payload, config)
        break
      case 'patient.deleted':
        await handlePatientDeleted(medplum, payload)
        break
      default:
        console.log(
          'Unknown event type:',
          JSON.stringify(
            {
              eventType: payload.event_type,
              patientId: payload.patient.user.id,
            },
            null,
            2,
          ),
        )
        return
    }

    console.log(
      'Patient webhook bot completed successfully:',
      JSON.stringify(
        {
          eventType: payload.event_type,
          patientId: payload.patient.user.id,
        },
        null,
        2,
      ),
    )
  } catch (error) {
    console.log(
      'Error in patient webhook handler:',
      JSON.stringify(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          eventType: payload.event_type,
          patientId: payload.patient.user.id,
        },
        null,
        2,
      ),
    )
    throw error
  }
}
