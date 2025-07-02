// Constants

import type { BotEvent, MedplumClient } from '@medplum/core';
import type { Task, Patient, HumanName, ContactPoint, Address, Identifier, BundleEntry, Communication } from '@medplum/fhirtypes';

let GRAPHQL_ENDPOINT = '';
let API_KEY = '';

interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
}

interface PatientResponse {
  data: { 
    patient: { 
      patient: { 
        profile: PatientProfile 
      } 
    } 
  };
  errors?: GraphQLError[];
}

// Types
interface PatientProfile {
  identifier: Array<{
    system: string;
    value: string;
  }>;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  sex: string;
  birth_date: string;
  phone: string;
  mobile_phone: string;
  preferred_language: string;
  patient_code: string;
  national_registry_number: string;
  address: {
    street: string;
    city: string;
    zip: string;
    state: string;
    country: string;
  };
}

interface ActivityData {
  activity: {
    id: string;
    stream_id: string;
    date: string;
    subject: {
      type: string;
      name: string;
    };
    action: string;
    object?: {
      id: string;
      type?: string;
      name: string;
    };
    indirect_object?: {
      id: string;
      type: string;
      name: string;
    };
    status: string;
    reference_id: string;
    reference_type: string;
    container_name: string;
    track: {
      id: string;
      title: string;
    };
    label: {
      color: string;
      id: string;
      text: string;
    };
    sub_activities: Array<{
      id: string;
      subject: {
        type: string;
        name: string;
      };
      action: string;
      date: string;
    }>;
    isUserActivity: boolean;
    context: {
      action_id: string;
      instance_id: string;
      pathway_id: string;
      step_id: string;
      track_id: string;
    };
    action_component: {
      definition_id: string;
      release_id: string;
      title: string;
    };
  };
  pathway: {
    id: string;
    pathway_definition_id: string;
    patient_id: string;
    tenant_id: string;
    start_date: string;
    pathway_title: string;
  };
  event_type: string;
  pathway_definition_id: string;
  pathway_id: string;
  patient_id: string;
}

// GraphQL queries
const GET_PATIENT_QUERY = `
  query GetPatient($patient_id: String!) {
    patient(id: $patient_id) {
      patient {
        id
        profile {
          identifier {
            system
            value
          }
          email
          first_name
          last_name
          name
          sex
          birth_date
          phone
          mobile_phone
          preferred_language
          patient_code
          national_registry_number
          address {
            street
            city
            zip
            state
            country
          }
        }
      }
    }
  }
`;

// Patient related functions
async function fetchPatientData(patientId: string): Promise<PatientProfile | null> {
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY
      },
      body: JSON.stringify({
        query: GET_PATIENT_QUERY,
        variables: { patient_id: patientId }
      })
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`);
    }

    const data = await response.json() as PatientResponse;
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data.patient.patient.profile;
  } catch (error) {
    console.log('Error fetching patient data:', JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      patientId
    }, null, 2));
    return null;
  }
}

function formatBirthDate(dateStr: string): string | undefined {
  if (!dateStr?.trim()) return undefined;
  
  try {
    const date = new Date(dateStr.trim());
    if (Number.isNaN(date.getTime())) return undefined;
    
    // Format as YYYY-MM-DD
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.log('Error formatting birth date:', JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      dateStr
    }, null, 2));
    return undefined;
  }
}

function createFhirPatient(awellPatientId: string, profile: PatientProfile): Patient {
  const name = createPatientName(profile);
  const identifiers = createPatientIdentifiers(awellPatientId, profile);
  const telecom = createPatientTelecom(profile);
  const address = createPatientAddress(profile);
  const gender = convertSexToGender(profile.sex);
  const birthDate = formatBirthDate(profile.birth_date);

  const patient: Patient = {
    resourceType: 'Patient',
    identifier: identifiers,
    active: true
  };

  if (Object.keys(name).length > 0) patient.name = [name];
  if (telecom.length > 0) patient.telecom = telecom;
  if (Object.keys(address).length > 0) patient.address = [address as Address];
  if (gender) patient.gender = gender;
  if (birthDate) patient.birthDate = birthDate;
  if (profile.preferred_language?.trim()) {
    patient.communication = [{
      language: {
        coding: [{
          system: 'urn:ietf:bcp:47',
          code: profile.preferred_language.trim()
        }]
      }
    }];
  }

  return patient;
}

function createPatientName(profile: PatientProfile): HumanName {
  const name: HumanName = {};
  if (profile.last_name?.trim()) name.family = profile.last_name.trim();
  if (profile.first_name?.trim()) name.given = [profile.first_name.trim()];
  if (profile.name?.trim()) name.text = profile.name.trim();
  return name;
}

function createPatientIdentifiers(awellPatientId: string, profile: PatientProfile): Identifier[] {
  const identifiers: Identifier[] = [{
    system: 'https://awellhealth.com/patients',
    value: awellPatientId
  }];

  if (profile.identifier?.length) {
    for (const id of profile.identifier) {
      if (id.system?.trim() && id.value?.trim()) {
        identifiers.push({
          system: id.system.trim(),
          value: id.value.trim()
        });
      }
    }
  }

  return identifiers;
}

function createPatientTelecom(profile: PatientProfile): ContactPoint[] {
  const telecom: ContactPoint[] = [];
  
  if (profile.email?.trim()) {
    telecom.push({ system: 'email', value: profile.email.trim() });
  }
  if (profile.phone?.trim()) {
    telecom.push({ system: 'phone', value: profile.phone.trim() });
  }
  if (profile.mobile_phone?.trim()) {
    telecom.push({
      system: 'phone',
      value: profile.mobile_phone.trim(),
      use: 'mobile'
    });
  }

  return telecom;
}

function createPatientAddress(profile: PatientProfile): Partial<Address> {
  const addressFields: Partial<Address> = {};
  
  if (profile.address?.street?.trim()) addressFields.line = [profile.address.street.trim()];
  if (profile.address?.city?.trim()) addressFields.city = profile.address.city.trim();
  if (profile.address?.zip?.trim()) addressFields.postalCode = profile.address.zip.trim();
  if (profile.address?.state?.trim()) addressFields.state = profile.address.state.trim();
  if (profile.address?.country?.trim()) addressFields.country = profile.address.country.trim();

  return addressFields;
}

function convertSexToGender(sex?: string): 'male' | 'female' | 'other' | 'unknown' | undefined {
  if (!sex?.trim()) return undefined;
  
  const normalizedSex = sex.toLowerCase().trim();
  if (['male', 'female', 'other', 'unknown'].includes(normalizedSex)) {
    return normalizedSex as 'male' | 'female' | 'other' | 'unknown';
  }
  return undefined;
}

async function findFirstPatientFromMedplum(medplum: MedplumClient, awellPatientId: string): Promise<BundleEntry<Patient> | undefined> {
  try {
    const searchResult = await medplum.search('Patient', `identifier=${awellPatientId}`);
    if (searchResult.entry?.[0]?.resource?.id) {
      console.log('Patient exists in system:', JSON.stringify({ 
        awellPatientId,
        foundPatientId: searchResult.entry[0].resource.id 
      }, null, 2));
      return searchResult.entry[0];
    }
  } catch (error) {
    console.log('Patient not found in system, fetching GraphQL data:', JSON.stringify({ awellPatientId }, null, 2));
  }
  return undefined;

}

// Task related functions
async function findOrCreatePatient(medplum: MedplumClient, awellPatientId: string): Promise<string> {
  const medplumPatient = await findFirstPatientFromMedplum(medplum, awellPatientId)

  const patientProfile = await fetchPatientData(awellPatientId);
  let newPatient: Patient;

  if(medplumPatient) {
    newPatient = medplumPatient.resource as Patient;
    // Update patient with latest profile data if available
    if (patientProfile) {
      const updatedPatient = createFhirPatient(awellPatientId, patientProfile);
      // Preserve the existing Medplum ID and meta information
      updatedPatient.id = newPatient.id;
      updatedPatient.meta = newPatient.meta;
      
      try {
        newPatient = await medplum.updateResource(updatedPatient);
        console.log('Patient updated with latest profile data:', JSON.stringify({
          originalId: awellPatientId,
          patientId: newPatient.id,
          lastUpdated: newPatient.meta?.lastUpdated
        }, null, 2));
      } catch (error) {
        console.log('Error updating patient, using existing data:', JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          originalId: awellPatientId,
          patientId: newPatient.id
        }, null, 2));
      }
    }
  } else {
    if (patientProfile) {
      newPatient = await medplum.createResource(createFhirPatient(awellPatientId, patientProfile));
    } else {
      newPatient = await medplum.createResource({
        resourceType: 'Patient',
        identifier: [{
          system: 'https://awellhealth.com/patients',
          value: awellPatientId
        }],
        active: true
      });
    }
    console.log('New patient created:', JSON.stringify({
      originalId: awellPatientId,
      newPatientId: newPatient.id
    }, null, 2));
  }

  return newPatient.id || '';
}

// Helper function to create extensions
function createTaskExtensions(activity: ActivityData['activity'], pathway: ActivityData['pathway']): Array<{
  url: string;
  valueString?: string;
  extension?: Array<{
    url: string;
    valueString: string;
  }>;
}> {
  return [
    {
      url: 'https://awellhealth.com/fhir/StructureDefinition/awell-task',
      extension: [
        {
          url: 'stakeholder',
          valueString: activity.indirect_object?.name || 'Unknown'
        },
        {
          url: 'stakeholder-id',
          valueString: activity.indirect_object?.id || 'Unknown'
        },
        {
          url: 'pathway-definition-id',
          valueString: pathway.pathway_definition_id
        },
        {
          url: 'pathway-id',
          valueString: activity.stream_id
        },
        {
          url: 'pathway-title',
          valueString: pathway.pathway_title
        },
        {
          url: 'activity-id',
          valueString: activity.id
        },
        {
          url: 'step-name',
          valueString: activity.action_component.title
        },
        {
          url: 'pathway-start-date',
          valueString: pathway.start_date
        },
        {
          url: 'release-id',
          valueString: activity.action_component.release_id
        },
        {
          url: 'activity-type',
          valueString: activity.object?.type || 'Unknown'
        }
      ]
    }
  ];
}

async function createOrUpdateTask(
  medplum: MedplumClient,
  activity: ActivityData['activity'],
  patientId: string,
  pathway: ActivityData['pathway']
): Promise<string> {

  const taskIdentifier = {
    system: 'https://awellhealth.com/activities',
    value: activity.id
  };

  let existingTasks: Task[] = [];
  try {
    const searchResult = await medplum.search('Task', `identifier=${activity.id}`);
    existingTasks = searchResult.entry?.map(entry => entry.resource as Task) || [];
  } catch (error) {
    console.log('No existing tasks found, will create new one');
  }

  // Set task status based on activity status
  const taskStatus = activity.status === 'done' ? 'completed' : 'requested';

  const task: Task = {
    resourceType: 'Task',
    status: taskStatus,
    intent: 'order',
    priority: 'routine',
    description: activity.action_component.title,
    for: { reference: `Patient/${patientId}` },
    code: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/task-code',
        code: 'approve',
        display: 'Approve'
      }]
    },
    identifier: [taskIdentifier],
    extension: createTaskExtensions(activity, pathway)
  };

  try {
    if (existingTasks.length > 0) {
      console.log(`Updating ${existingTasks.length} existing tasks`);
      // Update all existing tasks
      const updatedTasks = await Promise.all(existingTasks.map(async (existingTask) => {
        const resultTask = await medplum.updateResource({ ...existingTask, ...task, meta: existingTask.meta });
        console.log('Task successfully updated:', JSON.stringify({
          taskId: resultTask.id,
          status: resultTask.status,
          lastUpdated: resultTask.meta?.lastUpdated,
          activityStatus: activity.status
        }, null, 2));
        return resultTask;
      }));
      return updatedTasks[0]?.id || '';
    }
    
    console.log('Creating new task for activity:', activity.id);
    const resultTask = await medplum.createResource(task);
    console.log('Task created successfully:', JSON.stringify({
      taskId: resultTask.id,
      activityId: activity.id,
      patientId: patientId,
      pathwayId: pathway.id
    }, null, 2));
    return resultTask.id || '';
  } catch (error) {
    console.log('Error processing task:', JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      activityId: activity.id,
      stakeholderId: activity.indirect_object?.id
    }, null, 2));
    throw error;
  }
}

/**
 * Creates a FHIR Communication resource to notify other bots that enrichment can begin.
 * This communication serves as a signal that a task has been created/updated and 
 * enrichment bots can now start their processing.
 */
async function createEnrichmentCommunication(
  medplum: MedplumClient,
  activity: ActivityData['activity'],
  patientId: string,
  pathway: ActivityData['pathway'],
  taskId: string
): Promise<void> {
  try {
    const communication: Communication = {
      resourceType: 'Communication',
      status: 'completed',
      category: [{
        coding: [{
          system: 'http://awellhealth.com/fhir/CodeSystem/communication-category',
          code: 'enrichment',
          display: 'Enrichment'
        }]
      }],
      subject: {
        reference: `Patient/${patientId}`
      },
      sent: new Date().toISOString(),
      reasonCode: [{
        coding: [{
          system: 'https://awellhealth.com/fhir/CodeSystem/communication-reason',
          code: 'ready-for-enrichment',
          display: 'Ready for Enrichment'
        }]
      }],
      note: [{
        text: `Task created/updated for activity ${activity.id}. Enrichment bots can now process this patient.`
      }],
      payload: [{
        contentString: JSON.stringify({
          taskId: taskId,
          activityId: activity.id,
          pathwayId: pathway.id,
          pathwayDefinitionId: pathway.pathway_definition_id,
          stakeholderId: activity.indirect_object?.id || 'Unknown',
          stakeholderName: activity.indirect_object?.name || 'Unknown',
          stepTitle: activity.action_component.title,
          patientId: patientId,
          activityStatus: activity.status,
          pathwayTitle: pathway.pathway_title,
          releaseId: activity.action_component.release_id,
          activityType: activity.object?.type || 'Unknown'
        })
      }]
    };

    const resultCommunication = await medplum.createResource(communication);
    console.log('Enrichment communication created:', JSON.stringify({
      communicationId: resultCommunication.id,
      activityId: activity.id,
      patientId: patientId,
      pathwayId: pathway.id,
      lastUpdated: resultCommunication.meta?.lastUpdated
    }, null, 2));
  } catch (error) {
    console.log('Error creating enrichment communication:', JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      activityId: activity.id,
      patientId: patientId
    }, null, 2));
    // Don't throw error here as this is not critical for the main flow
  }
}

// Main handler
export async function handler(medplum: MedplumClient, event: BotEvent<ActivityData>): Promise<void> {
  const { activity, patient_id: awellPatientId, pathway } = event.input;

  if (!event.secrets.AWELL_API_URL || !event.secrets.AWELL_API_KEY) {
    console.log('AWELL_API_URL or AWELL_API_KEY is not set');
    return;
  }

  GRAPHQL_ENDPOINT = event.secrets.AWELL_API_URL.valueString || '';
  API_KEY = event.secrets.AWELL_API_KEY.valueString || '';

  if (activity.indirect_object?.type !== 'stakeholder') {
    console.log('Not a stakeholder activity, skipping bot execution');
    return;
  }

  console.log('Bot started processing activity:', JSON.stringify({
    activityId: activity.id,
    eventType: event.input.event_type,
    pathwayId: event.input.pathway_id
  }, null, 2));

  try {

    const patientId = await findOrCreatePatient(medplum, awellPatientId);
    const taskId = await createOrUpdateTask(medplum, activity, patientId, pathway);
    await createEnrichmentCommunication(medplum, activity, patientId, pathway, taskId);

    console.log('Bot finished processing activity:', JSON.stringify({
      activityId: activity.id,
      taskCreated: activity.indirect_object?.type === 'stakeholder'
    }, null, 2));
  } catch (error) {
    console.log('Error in handler:', JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      activityId: activity.id
    }, null, 2));
    throw error;
  }
}
