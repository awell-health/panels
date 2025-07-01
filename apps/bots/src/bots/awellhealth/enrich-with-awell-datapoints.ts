import type { BotEvent, MedplumClient } from '@medplum/core';
import type { Task, Patient, HumanName, Address } from '@medplum/fhirtypes';

let GRAPHQL_ENDPOINT = '';
let API_KEY = '';

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
      }
    }
  }
`;

const GET_DATA_POINT_QUERY = `
    query GetPathwayDataPoints($pathway_id: String!) {
    pathwayDataPoints(
      pathway_id: $pathway_id
    ) {
      dataPoints {
        serialized_value
        data_point_definition_id
        valueType
      }
    }
  }
`;

interface DataPointDefinition {
  id: string;
  title: string;
}

interface DataPoint {
  serialized_value: string;
  data_point_definition_id: string;
  valueType: string;
}

async function fetchDataPointDefinitions(releaseId: string): Promise<DataPointDefinition[]> {
  console.log(`Fetching data point definitions for release ID: ${releaseId}`);
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY
    },
    body: JSON.stringify({
      query: GET_DATA_POINT_DEFINITIONS_QUERY,
      variables: { release_id: releaseId }
    })
  });

  const data = await response.json() as { data: { pathwayDataPointDefinitions: { data_point_definitions: DataPointDefinition[] } }, errors?: any };
  const definitions = data.data.pathwayDataPointDefinitions.data_point_definitions;
  console.log(`Retrieved ${definitions.length} data point definitions`);
  return definitions;
}

async function fetchDataPoints(pathwayId: string): Promise<DataPoint[]> {
  console.log(`Fetching data points for pathway ID: ${pathwayId}`);
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY
    },
    body: JSON.stringify({
      query: GET_DATA_POINT_QUERY,
      variables: { pathway_id: pathwayId }
    })
  });

  const data = await response.json() as { data: { pathwayDataPoints: { dataPoints: DataPoint[] } }, errors?: any };
  const dataPoints = data.data.pathwayDataPoints.dataPoints;
  console.log(`Retrieved ${dataPoints.length} data points`);
  return dataPoints;
}

function createDataPointExtensions(dataPoints: DataPoint[], dataPointDefinitions: DataPointDefinition[]): Array<{
  url: string;
  valueString?: string;
  extension?: Array<{
    url: string;
    valueString: string;
  }>;
}> {
  const extensions = dataPoints.map(dataPoint => {
    const definition = dataPointDefinitions.find(definition => definition.id === dataPoint.data_point_definition_id);

    console.log(`Mapping data point ${definition?.title}, ${dataPoint.data_point_definition_id}, ${dataPoint.valueType} to extension`);

    if (!definition) {
      console.log(`WARNING: No definition found for data point with ID: ${dataPoint.data_point_definition_id}`);
      return null;
    }
    
    if (!dataPoint.serialized_value || !definition.title) {
      console.log(`WARNING: Skipping data point ${definition.title} due to empty value`);
      return null;
    }

    const value = dataPoint.serialized_value;

    if (definition.title === 'CompletionDate' || definition.title === 'ActivationDate') {
      console.log(`WARNING: Skipping data point ${definition.title} due to CompletionDate`);
      return null;
    }
        
    return {
      url: definition.title,
      valueString: value
    };
  }).filter((ext): ext is { url: string; valueString: string } => ext !== null);

  console.log(`Created ${extensions.length} valid data point extensions`);
  return [
    {
      url: 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points',
      extension: extensions
    }
  ];
}

function extractReleaseId(task: Task): string | null {
  const awellExtension = task.extension?.find(ext => ext.url === 'https://awellhealth.com/fhir/StructureDefinition/awell-task')?.extension?.find(ext => ext.url === 'release-id');
  if (awellExtension) {
    console.log(`Found release ID: ${awellExtension.valueString}`);
    return awellExtension.valueString || null;
  }
  console.log('No release ID found in task extensions');
  return null;
}

function extractPathwayId(task: Task): string | null {
  const awellExtension = task.extension?.find(ext => ext.url === 'https://awellhealth.com/fhir/StructureDefinition/awell-task')?.extension?.find(ext => ext.url === 'pathway-id');
  if (awellExtension) {
    console.log(`Found pathway ID: ${awellExtension.valueString}`);
    return awellExtension.valueString || null;
  }
  console.log('No pathway ID found in task extensions');
  return null;
}

function mapDataPointToPatientField(dataPoint: DataPoint, definition: DataPointDefinition, patient: Patient): void {
  console.log(`Mapping data point ${definition.title} to patient field`);
  
  const value = dataPoint.serialized_value;
  if (!value) {
    console.log(`WARNING: Skipping data point ${definition.title} due to empty value`);
    return;
  }
  
  switch (definition.title) {
    case 'sex':
      const sexValue = value.toLowerCase();
      // Map sex values to FHIR gender values
      switch (sexValue) {
        case 'male':
        case 'female':
          patient.gender = sexValue;
          break;
        case 'other':
          patient.gender = 'other';
          break;
        default:
          patient.gender = 'unknown';
      }
      break;
      
    case 'preferred_language':
      patient.communication = [{
        language: {
          coding: [{
            system: 'urn:ietf:bcp:47',
            code: value
          }]
        }
      }];
      break;
      
    case 'phone':
    case 'mobile_phone':
      if (!patient.telecom) {
        patient.telecom = [];
      }
      patient.telecom.push({
        system: 'phone',
        value: value,
        use: definition.title === 'mobile_phone' ? 'mobile' : 'home'
      });
      break;
      
    case 'patient_timezone':
      // Store timezone in an extension since it's not a standard FHIR field
      if (!patient.extension) {
        patient.extension = [];
      }
      patient.extension.push({
        url: 'https://awellhealth.com/fhir/StructureDefinition/patient-timezone',
        valueString: value
      });
      break;
      
    case 'patient_id':
    case 'patient_code':
    case 'national_registry_number':
      if (!patient.identifier) {
        patient.identifier = [];
      }
      patient.identifier.push({
        system: `https://awellhealth.com/fhir/identifier/${definition.title}`,
        value: value
      });
      break;
      
    case 'last_name':
    case 'first_name':
      if (!patient.name) {
        patient.name = [{} as HumanName];
      }
      if (!patient.name[0]) {
        patient.name[0] = {} as HumanName;
      }
      if (definition.title === 'last_name') {
        patient.name[0].family = value;
      } else {
        patient.name[0].given = [value];
      }
      break;
      
    case 'email':
      if (!patient.telecom) {
        patient.telecom = [];
      }
      patient.telecom.push({
        system: 'email',
        value: value
      });
      break;
      
    case 'birth_date':
      patient.birthDate = value;
      break;
      
    case 'address.zip':
    case 'address.street':
    case 'address.state':
    case 'address.country':
    case 'address.city':
      if (!patient.address) {
        patient.address = [{} as Address];
      }
      if (!patient.address[0]) {
        patient.address[0] = {} as Address;
      }
      
      const addressField = definition.title.split('.')[1];
      switch (addressField) {
        case 'zip':
          patient.address[0].postalCode = value;
          break;
        case 'street':
          patient.address[0].line = [value];
          break;
        case 'state':
          patient.address[0].state = value;
          break;
        case 'country':
          patient.address[0].country = value;
          break;
        case 'city':
          patient.address[0].city = value;
          break;
      }
      break;
  }
}

export async function handler(medplum: MedplumClient, event: BotEvent<Task>): Promise<void> {
  try {
    console.log('Starting data point enrichment for task:', event.input.id);

    if (!event.secrets['AWELL_API_URL'] || !event.secrets['AWELL_API_KEY']) {
      console.log('AWELL_API_URL or AWELL_API_KEY is not set');
      return;
    }
  
    GRAPHQL_ENDPOINT = event.secrets['AWELL_API_URL'].valueString || '';
    API_KEY = event.secrets['AWELL_API_KEY'].valueString || '';

    const task = event.input;
    
    const releaseId = extractReleaseId(task);
    const pathwayId = extractPathwayId(task);
    
    if (!releaseId || !pathwayId) {
      console.log('Missing release ID or pathway ID, skipping data point enrichment');
      return;
    }

    if (task.extension?.some(ext => ext.url === 'https://awellhealth.com/fhir/StructureDefinition/awell-data-points')) {
      console.log('Awell data points already exist on task, skipping awell data point enrichment');
      return;
    }

    try {
      const dataPointDefinitions = await fetchDataPointDefinitions(releaseId);
      const dataPoints = await fetchDataPoints(pathwayId);
      const dataPointExtensions = createDataPointExtensions(dataPoints, dataPointDefinitions);
      
      // Add extensions to task
      if (!task.extension) {
        task.extension = [];
      }
      task.extension.push(...dataPointExtensions);
      console.log(`Added ${dataPointExtensions.length} data point extensions to task`);

      try {
          // Add extensions to patient if task.for reference exists
          if (task.for?.reference) {
            const patientId = task.for.reference.split('/')[1];
            if (patientId) {
              console.log(`Adding data point extensions to patient: ${patientId}`);
              const patient = await medplum.readResource('Patient', patientId);
              
              // Map data points to FHIR Patient fields
              for (const dataPoint of dataPoints) {
                const definition = dataPointDefinitions.find(def => def.id === dataPoint.data_point_definition_id);
                if (definition) {
                  mapDataPointToPatientField(dataPoint, definition, patient);
                }
              }
              
              // Add extensions for any remaining data points that don't map to FHIR fields
              if (!patient.extension) {
                patient.extension = [];
              }
              patient.extension.push(...dataPointExtensions);
              
              await medplum.updateResource(patient);
              console.log('Successfully updated patient with data point extensions and FHIR fields');
            }
          }
      } catch (error) {
        // Log the error details
        console.log('ERROR: Error enriching patient with Awell data points:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          taskId: task.id,
          releaseId,
          pathwayId
        });
      }

      // Update the task with the new extensions
      if (!task.id) {
        throw new Error('Task is missing required id property');
      }
      await medplum.updateResource(task);
      console.log('Successfully updated task with data point extensions');
    } catch (error) {
      // Log the error details
      console.log('ERROR: Error enriching task with Awell data points:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        taskId: task.id,
        releaseId,
        pathwayId
      });
      throw error;
    }
  } catch (error) {
    // Log the error details
    console.log('ERROR: Unhandled error in data point enrichment:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      taskId: event.input.id
    });
    throw error;
  }
}
