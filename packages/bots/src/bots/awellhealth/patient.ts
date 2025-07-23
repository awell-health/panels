import type { BotEvent, MedplumClient } from '@medplum/core'
import type {
  Patient,
  HumanName,
  ContactPoint,
  Address,
  Identifier,
  BundleEntry,
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

function createFhirPatient(
  awellPatientId: string,
  profile: PatientProfile,
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

async function upsertPatient(
  medplum: MedplumClient,
  awellPatientId: string,
  profile: PatientProfile,
): Promise<Patient> {
  const fhirPatient = createFhirPatient(awellPatientId, profile)

  // Use upsert with Awell patient ID as the search criteria
  // This will either update existing patient or create new one atomically
  const searchQuery = `Patient?identifier=https://awellhealth.com/patients|${awellPatientId}`

  console.log(
    'Upserting patient:',
    JSON.stringify(
      {
        awellPatientId,
        searchQuery,
      },
      null,
      2,
    ),
  )

  const upsertedPatient = await medplum.upsertResource(fhirPatient, searchQuery)

  console.log(
    'Patient upserted successfully:',
    JSON.stringify(
      {
        awellPatientId,
        medplumPatientId: upsertedPatient.id,
        lastUpdated: upsertedPatient.meta?.lastUpdated,
      },
      null,
      2,
    ),
  )

  return upsertedPatient
}

async function handlePatientCreated(
  medplum: MedplumClient,
  payload: PatientWebhookPayload,
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
    await upsertPatient(medplum, awellPatientId, profile)
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
    await upsertPatient(medplum, awellPatientId, profile)
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
): Promise<BundleEntry<Patient> | undefined> {
  try {
    const searchResult = await medplum.search(
      'Patient',
      `identifier=https://awellhealth.com/patients|${awellPatientId}`,
    )
    if (searchResult.entry?.[0]?.resource?.id) {
      console.log(
        'Patient found in Medplum:',
        JSON.stringify(
          {
            awellPatientId,
            medplumPatientId: searchResult.entry[0].resource.id,
          },
          null,
          2,
        ),
      )
      return searchResult.entry[0]
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
    if (!existingPatient?.resource?.id) {
      console.log(
        'Patient not found for deletion:',
        JSON.stringify({ awellPatientId }, null, 2),
      )
      return
    }

    // delete all tasks for this patient
    const tasks = await medplum.search(
      'Task',
      `subject=Patient/${existingPatient.resource.id}`,
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
    await medplum.deleteResource('Patient', existingPatient.resource.id)

    console.log(
      'Patient deleted successfully:',
      JSON.stringify(
        {
          awellPatientId,
          medplumPatientId: existingPatient.resource.id,
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

  try {
    switch (payload.event_type) {
      case 'patient.created':
        await handlePatientCreated(medplum, payload)
        break
      case 'patient.updated':
        await handlePatientUpdated(medplum, payload)
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
