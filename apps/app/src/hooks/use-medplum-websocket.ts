import { useEffect, useRef, useCallback, useState } from 'react'
import { MedplumWebSocketClient } from '@/lib/medplum-websockets'
import { getRuntimeConfig } from '@/lib/config'
import { useFHIRStore } from '@/lib/fhir-store'
import type { Resource } from '@medplum/fhirtypes'

// Global WebSocket singleton to prevent multiple initializations
class WebSocketManager {
  private static instance: WebSocketManager | null = null
  private wsClient: MedplumWebSocketClient | null = null
  private isInitialized = false
  private isInitializing = false
  private configCache: {
    medplumBaseUrl: string
    medplumWsBaseUrl: string
  } | null = null
  private subscribers = new Set<() => void>()
  private initPromise: Promise<void> | null = null

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }

  async initialize(
    medplumClientId: string,
    medplumSecret: string,
    resourceTypes: string[],
  ): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized && this.wsClient) {
      return
    }

    // If currently initializing, wait for the existing initialization to complete
    if (this.isInitializing && this.initPromise) {
      await this.initPromise
      return
    }

    // Start initialization with lock
    this.isInitializing = true

    // Create the initialization promise
    this.initPromise = this._doInitialize(
      medplumClientId,
      medplumSecret,
      resourceTypes,
    )

    try {
      await this.initPromise
    } finally {
      this.isInitializing = false
      this.initPromise = null
    }
  }

  private async _doInitialize(
    medplumClientId: string,
    medplumSecret: string,
    resourceTypes: string[],
  ): Promise<void> {
    try {
      // Load config if not cached
      if (!this.configCache) {
        const config = await getRuntimeConfig()
        this.configCache = {
          medplumBaseUrl: config.medplumBaseUrl,
          medplumWsBaseUrl: config.medplumWsBaseUrl,
        }
      }

      // Initialize WebSocket client
      this.wsClient = new MedplumWebSocketClient({
        baseUrl: this.configCache?.medplumBaseUrl || '',
        websocketBaseUrl: this.configCache?.medplumWsBaseUrl || '',
      })

      await this.wsClient.initialize(medplumClientId, medplumSecret)

      // Initialize WebSocket connection
      await this.wsClient.initializeWebSocket(resourceTypes)

      // Subscribe to resources
      const unsubscribeData = await this.wsClient.subscribeTo(
        resourceTypes,
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        (resource: Record<string, any>) => {
          if (!resource?.id) return
          const store = useFHIRStore.getState()
          store.updateResourceInBundle(resource as Resource)
        },
      )

      this.isInitialized = true

      // Store cleanup function
      this.subscribers.add(unsubscribeData)
    } catch (error) {
      console.error('Failed to initialize global WebSocket:', error)
      this.isInitialized = false
      this.isInitializing = false
      throw error
    }
  }

  cleanup(): void {
    if (this.wsClient) {
      // Call all subscriber cleanup functions
      for (const cleanup of this.subscribers) {
        cleanup()
      }
      this.subscribers.clear()

      this.wsClient.cleanup()
      this.wsClient = null
      this.isInitialized = false
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.wsClient !== null
  }
}

export function useMedplumWebSocket(
  medplumClientId: string | undefined,
  medplumSecret: string | undefined,
  resourceTypes: string[],
) {
  const manager = WebSocketManager.getInstance()
  const [isReady, setIsReady] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const isInitialized = useRef(false)

  const initializeWebSocket = useCallback(async () => {
    if (!medplumClientId || !medplumSecret) {
      console.warn('medplumClientId or medplumSecret are missing')
      return
    }

    if (isInitialized.current || manager.isReady()) {
      setIsReady(true)
      return
    }

    if (isInitializing) {
      return
    }

    setIsInitializing(true)

    try {
      await manager.initialize(medplumClientId, medplumSecret, resourceTypes)
      isInitialized.current = true
      setIsReady(true)
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error)
    } finally {
      setIsInitializing(false)
    }
  }, [medplumClientId, medplumSecret, resourceTypes, manager, isInitializing])

  // Check manager state and update local state
  useEffect(() => {
    if (manager.isReady()) {
      setIsReady(true)
      setIsInitializing(false)
    }
  }, [manager])

  // Initialize WebSocket asynchronously after render
  useEffect(() => {
    // Use setTimeout to defer WebSocket initialization until after render
    const timeoutId = setTimeout(() => {
      initializeWebSocket()
    }, 0)

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId)
      // Don't cleanup the global manager here, let it persist
      isInitialized.current = false
    }
  }, [initializeWebSocket])

  return {
    isReady,
    isInitializing,
    manager,
  }
}
