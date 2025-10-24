import { MedplumClient } from '@medplum/core'
import type { Bundle, Subscription, Parameters } from '@medplum/fhirtypes'

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type ResourceHandler = (resource: any) => void

export interface WebSocketConnectionOptions {
  baseUrl: string
  websocketBaseUrl: string
}

export class MedplumWebSocketClient {
  private client: MedplumClient
  private websocketBaseUrl: string
  private initialized = false
  private resourceHandlers: Map<string, Set<ResourceHandler>> = new Map()
  private websocket: WebSocket | null = null
  private resourceTypes: string[] | null = null

  constructor(options: WebSocketConnectionOptions) {
    this.client = new MedplumClient({
      baseUrl: options.baseUrl,
    })
    this.websocketBaseUrl = options.websocketBaseUrl
  }

  /**
   * Initialize the websocket client with authentication
   */
  async initialize(clientId?: string, clientSecret?: string): Promise<void> {
    if (this.initialized) {
      return
    }

    if (!clientId || !clientSecret) {
      throw new Error(
        'Medplum credentials are missing. Please provide clientId and clientSecret.',
      )
    }

    try {
      // Authenticate the client
      await this.client.startClientLogin(clientId, clientSecret)
      this.initialized = true
      console.log('MedplumWebSocketClient initialized successfully')
    } catch (error) {
      console.error('Failed to initialize MedplumWebSocketClient:', error)
      throw error
    }
  }

  /**
   * Initialize websocket connection - copied from working medplum-client.ts
   */
  async initializeWebSocket(resourceTypes?: string[]) {
    try {
      // Determine resource types to subscribe to (allow override, otherwise fallback)
      const typesToSubscribe =
        resourceTypes && resourceTypes.length > 0
          ? resourceTypes
          : this.resourceTypes && this.resourceTypes.length > 0
            ? this.resourceTypes
            : ['Patient', 'Appointment']

      // Persist for later reuse on reconnects if needed
      this.resourceTypes = typesToSubscribe

      // Create Subscriptions and collect tokens
      const tokens: string[] = []

      for (const type of typesToSubscribe) {
        const subscription = await this.client.createResource<Subscription>({
          resourceType: 'Subscription',
          criteria: type,
          status: 'active',
          reason: `Watch for ${type.toLowerCase()}s`,
          channel: {
            type: 'websocket',
          },
        })

        const binding = (await this.client.get(
          `/fhir/R4/Subscription/${subscription.id}/$get-ws-binding-token`,
        )) as Parameters

        const token =
          binding.parameter?.find((p) => p.name === 'token')?.valueString || ''

        if (token) {
          tokens.push(token)
        }
      }

      // Initialize WebSocket connection
      this.websocket = new WebSocket(
        `${this.websocketBaseUrl}/ws/subscriptions-r4`,
      )
      this.websocket.addEventListener('open', () => {
        console.log('WebSocket open')
        // Bind all tokens
        for (const token of tokens) {
          this.websocket?.send(
            JSON.stringify({
              type: 'bind-with-token',
              payload: { token },
            }),
          )
        }
      })

      this.websocket.addEventListener(
        'message',
        (event: MessageEvent<string>) => {
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
              console.log('Bundle received', resourceType)

              const handlers = this.resourceHandlers.get(resourceType)
              if (handlers) {
                for (const handler of handlers) {
                  handler(entry.resource)
                }
              }
            }
          }
        },
      )

      this.websocket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error)
      })

      this.websocket.addEventListener('close', () => {
        console.log('WebSocket closed')
      })
    } catch (error) {
      console.error('Failed to initialize websocket:', error)
      // If websocket subscriptions are not enabled, just log and continue
      if (
        error instanceof Error &&
        error.message.includes('WebSocket subscriptions not enabled')
      ) {
        console.warn(
          'WebSocket subscriptions not enabled, continuing without real-time updates',
        )
        return
      }
      // Re-throw other errors
      throw error
    }
  }

  /**
   * Subscribe to any resource type.
   */
  async subscribeTo(
    resourceType: string[],
    handler: ResourceHandler,
  ): Promise<() => void> {
    for (const type of resourceType) {
      if (!this.resourceHandlers.has(type)) {
        this.resourceHandlers.set(type, new Set())
      }
      this.resourceHandlers.get(type)?.add(handler)
    }
    // Return unsubscribe function
    return () => {
      for (const type of resourceType) {
        this.resourceHandlers.get(type)?.delete(handler)
      }
    }
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get the underlying medplum client
   */
  getClient(): MedplumClient {
    return this.client
  }

  /**
   * Clean up all subscriptions and close connections
   */
  async cleanup(): Promise<void> {
    // Close websocket connection
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }

    this.resourceHandlers.clear()
    this.initialized = false

    console.log('MedplumWebSocketClient cleaned up')
  }
}
