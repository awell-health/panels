import type { BotEvent, MedplumClient } from '@medplum/core'
import type { Task, TaskInput } from '@medplum/fhirtypes'

let GRAPHQL_ENDPOINT = ''
let API_KEY = ''
let ENVIRONMENT = ''

interface GraphQLError {
  message: string
  locations?: Array<{ line: number; column: number }>
  path?: string[]
}

interface GetHostedPagesLinkResponse {
  data: {
    hostedPagesLink: {
      hosted_pages_link: { url: string }
    }
  }
  errors?: GraphQLError[]
}

const GET_HOSTED_PAGES_LINK = `
  query GetHostedPagesLink($pathwayId: String!, $stakeholderId: String!) {
    hostedPagesLink(pathway_id: $pathwayId, stakeholder_id: $stakeholderId) {
      code
      success
      hosted_pages_link {
        url
        __typename
      }
      __typename
    }
  }
`

async function fetchHostedPagesLink(
  pathwayId: string,
  stakeholderId: string,
): Promise<string | null> {
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: API_KEY,
      },
      body: JSON.stringify({
        query: GET_HOSTED_PAGES_LINK,
        variables: { pathwayId, stakeholderId },
      }),
    })

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`)
    }

    const data = (await response.json()) as GetHostedPagesLinkResponse
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
    }

    return data.data.hostedPagesLink.hosted_pages_link.url
  } catch (error) {
    console.log(
      'Error fetching hosted pages link:',
      JSON.stringify(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          pathwayId,
          stakeholderId,
        },
        null,
        2,
      ),
    )
    return null
  }
}

function extractActivityId(task: Task): string | null {
  const awellExtension = task.extension
    ?.find(
      (ext) =>
        ext.url ===
        'https://awellhealth.com/fhir/StructureDefinition/awell-task',
    )
    ?.extension?.find((ext) => ext.url === 'activity-id')
  if (awellExtension) {
    console.log(`Found activity ID: ${awellExtension.valueString}`)
    return awellExtension.valueString || null
  }
  console.log('No activity ID found in task extensions')
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

function extractStakeholderId(task: Task): string | null {
  const awellExtension = task.extension
    ?.find(
      (ext) =>
        ext.url ===
        'https://awellhealth.com/fhir/StructureDefinition/awell-task',
    )
    ?.extension?.find((ext) => ext.url === 'stakeholder-id')
  if (awellExtension) {
    console.log(`Found stakeholder ID: ${awellExtension.valueString}`)
    return awellExtension.valueString || null
  }
  console.log('No stakeholder ID found in task extensions')
  return null
}

function hasConnectorInput(
  inputs: TaskInput[] | undefined,
  connectorCode: string,
): boolean {
  if (!inputs) return false
  return inputs.some((input) =>
    input.type?.coding?.some(
      (coding) =>
        coding.system === 'http://awellhealth.com/fhir/connector-type' &&
        coding.code === connectorCode,
    ),
  )
}

export async function handler(
  medplum: MedplumClient,
  event: BotEvent<Task>,
): Promise<void> {
  const task = event.input as Task
  const inputs = task?.input as TaskInput[] | undefined

  if (
    !event.secrets.AWELL_API_URL ||
    !event.secrets.AWELL_API_KEY ||
    !event.secrets.AWELL_ENVIRONMENT
  ) {
    console.log(
      'AWELL_API_URL or AWELL_API_KEY or AWELL_ENVIRONMENT is not set',
    )
    return
  }

  GRAPHQL_ENDPOINT = event.secrets.AWELL_API_URL.valueString || ''
  API_KEY = event.secrets.AWELL_API_KEY.valueString || ''
  ENVIRONMENT = event.secrets.AWELL_ENVIRONMENT.valueString || ''

  const activityId = extractActivityId(task)
  const pathwayId = extractPathwayId(task)
  const stakeholderId = extractStakeholderId(task)

  console.log('Connector activityId and pathwayId', activityId, pathwayId)

  // Check if both IDs are present
  if (!activityId || !pathwayId || !stakeholderId) {
    console.log(
      'No activity ID, pathway ID, or stakeholder ID found in task extensions',
    )
    return
  }

  if (
    hasConnectorInput(inputs, 'awell-hosted-pages') &&
    hasConnectorInput(inputs, 'awell-care')
  ) {
    console.log(
      'Connector input already exists for Awell Hosted Pages and Awell Care',
    )
    return
  }

  const connectorUrl = `https://care.${ENVIRONMENT}.awellhealth.com/pathway/${pathwayId}/activity-feed?activityId=${activityId}`

  let taskChanged = false
  // Add connector input if it doesn't exist
  if (!hasConnectorInput(inputs, 'awell-care')) {
    console.log('Adding connector input for Awell Care')
    const newInput: TaskInput = {
      type: {
        coding: [
          {
            system: 'http://awellhealth.com/fhir/connector-type',
            code: 'awell-care',
            display: 'Awell Care',
          },
        ],
      },
      valueUrl: connectorUrl,
    }

    task.input = [...(inputs || []), newInput]
    // Initialize note array if it doesn't exist
    if (!task.note) {
      task.note = []
    }
    task.note.push({
      text: 'Connector input added for Awell Care',
      authorString: '[Awell] Connector bot',
      time: new Date().toISOString(),
    })
    taskChanged = true
  }

  if (!hasConnectorInput(inputs, 'awell-hosted-pages')) {
    const hostedPagesLink = await fetchHostedPagesLink(pathwayId, stakeholderId)

    console.log(
      'Adding connector input for Awell Hosted Pages with link:',
      hostedPagesLink,
    )
    if (hostedPagesLink) {
      const newInput: TaskInput = {
        type: {
          coding: [
            {
              system: 'http://awellhealth.com/fhir/connector-type',
              code: 'awell-hosted-pages',
              display: 'Awell Hosted Pages',
            },
          ],
        },
        valueUrl: hostedPagesLink,
      }

      task.input = [...(inputs || []), newInput]
      // Initialize note array if it doesn't exist
      if (!task.note) {
        task.note = []
      }
      task.note.push({
        text: 'Connector input added for Awell Hosted Pages',
        authorString: '[Awell] Connector bot',
        time: new Date().toISOString(),
      })
      taskChanged = true
    }
  }

  if (taskChanged) {
    console.log('Updating task with new connector inputs')
    await medplum.updateResource(task)
  } else {
    console.log('No changes to task')
  }
}
