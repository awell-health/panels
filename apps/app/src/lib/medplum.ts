import type { MedplumClient } from '@medplum/core'
import type {
  Bot,
  Bundle,
  DetectedIssue,
  Encounter,
  Observation,
  Parameters,
  Patient,
  Practitioner,
  Subscription,
  Task,
} from '@medplum/fhirtypes'

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type ResourceHandler = (resource: any) => void

// Data store class to handle all Medplum interactions
export class MedplumStore {
  private client: MedplumClient
  private socketsBaseUrl: string
  private initialized = false
  private resourceHandlers: Map<string, Set<ResourceHandler>> = new Map()

  constructor(client: MedplumClient, socketsBaseUrl: string) {
    this.client = client
    this.socketsBaseUrl = socketsBaseUrl
  }

  // Initialize the store with client login
  async initialize(clientId?: string, clientSecret?: string): Promise<void> {
    if (!this.initialized) {
      if (!this.client) {
        throw new Error('Failed to create Medplum client')
      }

      try {
        if (!clientId || !clientSecret) {
          throw new Error(
            'Medplum credentials are missing. Please check your .env.local file.',
          )
        }

        await this.initializeWebSocket()
        this.initialized = true
      } catch (error) {
        console.error('Failed to initialize Medplum client:', error)
        throw error
      }
    }
  }

  async initializeWebSocket() {
    // Create subscriptions for both Task and Patient
    const taskSubscription = await this.client.createResource<Subscription>({
      resourceType: 'Subscription',
      criteria: 'Task',
      status: 'active',
      reason: 'Watch for tasks',
      channel: {
        type: 'websocket',
      },
    })

    const patientSubscription = await this.client.createResource<Subscription>({
      resourceType: 'Subscription',
      criteria: 'Patient',
      status: 'active',
      reason: 'Watch for patients',
      channel: {
        type: 'websocket',
      },
    })

    // Get binding tokens for both subscriptions
    const taskBinding = (await this.client.get(
      `/fhir/R4/Subscription/${taskSubscription.id}/$get-ws-binding-token`,
    )) as Parameters

    const patientBinding = (await this.client.get(
      `/fhir/R4/Subscription/${patientSubscription.id}/$get-ws-binding-token`,
    )) as Parameters

    const taskToken =
      taskBinding.parameter?.find((p) => p.name === 'token')?.valueString || ''
    const patientToken =
      patientBinding.parameter?.find((p) => p.name === 'token')?.valueString ||
      ''

    // Initialize WebSocket connection
    const ws = new WebSocket(`${this.socketsBaseUrl}/ws/subscriptions-r4`)
    ws.addEventListener('open', () => {
      console.log('WebSocket open')
      // Bind both tokens
      ws?.send(
        JSON.stringify({
          type: 'bind-with-token',
          payload: { token: taskToken },
        }),
      )
      ws?.send(
        JSON.stringify({
          type: 'bind-with-token',
          payload: { token: patientToken },
        }),
      )
    })

    ws.addEventListener('message', (event: MessageEvent<string>) => {
      const bundle = JSON.parse(event.data) as Bundle

      for (const entry of bundle.entry || []) {
        if (!entry.resource) return

        const resourceType = entry.resource.resourceType

        if (
          resourceType === 'SubscriptionStatus' &&
          entry.resource.status === 'active'
        ) {
          //console.log('Heartbeat received');
        } else {
          //console.log("Trying to handle resource", resourceType)
          // Call all handlers for this resource type
          const handlers = this.resourceHandlers.get(resourceType)
          if (handlers) {
            for (const handler of handlers) {
              handler(entry.resource)
            }
          }
        }
      }
    })

    ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error)
    })

    ws.addEventListener('close', () => {
      console.log('WebSocket closed')
    })
  }

  // Subscribe to tasks
  async subscribeToTasks(handler: (task: Task) => void): Promise<() => void> {
    return this.subscribe('Task', handler)
  }

  // Subscribe to patients
  async subscribeToPatients(
    handler: (patient: Patient) => void,
  ): Promise<() => void> {
    return this.subscribe('Patient', handler)
  }

  // Internal subscription method
  private subscribe(
    resourceType: 'Task' | 'Patient',
    handler: ResourceHandler,
  ): () => void {
    if (!this.resourceHandlers.has(resourceType)) {
      this.resourceHandlers.set(resourceType, new Set())
    }
    this.resourceHandlers.get(resourceType)?.add(handler)

    // Return unsubscribe function
    return () => {
      this.resourceHandlers.get(resourceType)?.delete(handler)
    }
  }

  async getPatients(): Promise<Patient[]> {
    try {
      // Search for patients in Medplum with a limit of 1000
      const bundle = await this.client.search('Patient', {
        _count: 1000,
        _sort: '-_lastUpdated',
      })

      // Return the actual FHIR Patient resources
      return (bundle.entry || []).map((entry) => entry.resource as Patient)
    } catch (error) {
      console.error('Error fetching patients:', error)
      throw error
    }
  }

  async getTasks(): Promise<Task[]> {
    try {
      // Search for tasks in Medplum with a limit of 1000
      const bundle = await this.client.search('Task', {
        _count: 1000,
        _sort: '-_lastUpdated',
      })

      // Return the actual FHIR Task resources
      return (bundle.entry || []).map((entry) => entry.resource as Task)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      throw error
    }
  }

  async getIngestionBots(): Promise<Bot[]> {
    const bundle = await this.client.search('Bot', {
      category: 'Ingestion',
    })
    return (bundle.entry || []).map((entry) => entry.resource as Bot)
  }

  async getEnrichmentBots(): Promise<Bot[]> {
    const bundle = await this.client.search('Bot', {
      category: 'Enrichment',
    })
    return (bundle.entry || []).map((entry) => entry.resource as Bot)
  }

  async getConnectorBots(): Promise<Bot[]> {
    const bundle = await this.client.search('Bot', {
      category: 'Connector',
    })
    return (bundle.entry || []).map((entry) => entry.resource as Bot)
  }

  async getObservations(patientId: string): Promise<Observation[]> {
    const bundle = await this.client.search('Observation', {
      subject: `Patient/${patientId}`,
    })
    return (bundle.entry || []).map((entry) => entry.resource as Observation)
  }

  async getEncounters(patientId: string): Promise<Encounter[]> {
    const bundle = await this.client.search('Encounter', {
      subject: `Patient/${patientId}`,
    })
    return (bundle.entry || []).map((entry) => entry.resource as Encounter)
  }

  async getDetectedIssues(patientId: string): Promise<DetectedIssue[]> {
    const bundle = await this.client.search('DetectedIssue', {
      patient: `Patient/${patientId}`,
    })
    return (bundle.entry || []).map((entry) => entry.resource as DetectedIssue)
  }

  // Get the current access token
  async getAccessToken(): Promise<string | undefined> {
    const token = this.client.getAccessToken()
    return token
  }

  async addNoteToTask(taskId: string, notes: string): Promise<Task> {
    try {
      const task = await this.client.readResource('Task', taskId)

      // Add the note to the task's note array
      const updatedTask = {
        ...task,
        note: [
          ...(task.note || []),
          {
            text: notes,
            time: new Date().toISOString(),
          },
        ],
      }

      return await this.client.updateResource(updatedTask)
    } catch (error) {
      console.error('Error adding note to task:', error)
      throw error
    }
  }

  async getOrCreatePractitioner(
    userId: string,
    name: string,
  ): Promise<Practitioner> {
    const practitioner = await this.client.searchOne('Practitioner', {
      identifier: `http://panels.awellhealth.com/fhir/identifier/practitioner|${userId}`,
    })
    if (!practitioner) {
      console.log('Creating practitioner', userId, name)
      const newPractitioner = await this.client.createResource({
        identifier: [
          {
            system:
              'http://panels.awellhealth.com/fhir/identifier/practitioner',
            value: userId,
          },
        ],
        resourceType: 'Practitioner',
        name: name && name.length > 0 ? [{ given: [name] }] : undefined,
      })
      return newPractitioner
    }
    return practitioner
  }

  async toggleTaskOwner(taskId: string, userId: string): Promise<Task> {
    try {
      const [task, practitioner] = await Promise.all([
        this.client.readResource('Task', taskId) as Promise<Task>,
        this.client.readResource(
          'Practitioner',
          userId,
        ) as Promise<Practitioner>,
      ])

      if (task.owner?.reference === `Practitioner/${userId}`) {
        // Remove the owner from the task
        const updatedTask = {
          ...task,
          owner: undefined,
        } as Task

        return await this.client.updateResource(updatedTask)
      }

      const displayName = `${Array.isArray(practitioner.name?.[0]?.given) ? practitioner.name[0].given.join(' ') : (practitioner.name?.[0]?.given ?? '')} ${Array.isArray(practitioner.name?.[0]?.family) ? practitioner.name[0].family.join(' ') : (practitioner.name?.[0]?.family ?? '')}`

      // Update the task owner
      const updatedTask = {
        ...task,
        resourceType: 'Task',
        owner: {
          display: displayName,
          reference: `Practitioner/${userId}`,
          type: 'Practitioner' as const,
        },
      } as Task

      return await this.client.updateResource(updatedTask)
    } catch (error) {
      console.error('Error updating task owner:', error)
      throw error
    }
  }

  async deletePatient(patientId: string): Promise<void> {
    try {
      // First, get all tasks for this patient
      const tasksBundle = await this.client.search('Task', {
        subject: `Patient/${patientId}`,
      })

      const tasks = (tasksBundle.entry || []).map(
        (entry) => entry.resource as Task,
      )

      // Delete all tasks for this patient
      await Promise.all(
        tasks.map((task) =>
          task.id
            ? this.client.deleteResource('Task', task.id)
            : Promise.resolve(),
        ),
      )

      // Delete the patient
      await this.client.deleteResource('Patient', patientId)
    } catch (error) {
      console.error('Error deleting patient:', error)
      throw error
    }
  }
}

// Export a singleton instance
