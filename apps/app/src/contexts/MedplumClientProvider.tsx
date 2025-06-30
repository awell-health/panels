'use client'

import { useAuthentication } from '@/hooks/use-authentication'
import { getRuntimeConfig } from '@/lib/config'
import { MedplumStore } from '@/lib/medplum'
import { MedplumClient } from '@medplum/core'
import type { Bot, Patient, Practitioner, Task } from '@medplum/fhirtypes'
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'

type MedplumContextType = {
  patients: Patient[]
  tasks: Task[]
  ingestionBots: Bot[]
  enrichmentBots: Bot[]
  connectorBots: Bot[]
  isLoading: boolean
  error: Error | null
  accessToken: string | null
  addNotesToTask: (taskId: string, notes: string) => Promise<Task>
  toggleTaskOwner: (taskId: string) => Promise<Task>
  clearAuthTokens: () => void
}

const MedplumContext = createContext<MedplumContextType | null>(null)

export function MedplumClientProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [ingestionBots, setIngestionBots] = useState<Bot[]>([])
  const [enrichmentBots, setEnrichmentBots] = useState<Bot[]>([])
  const [connectorBots, setConnectorBots] = useState<Bot[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const {
    medplumClientId,
    medplumSecret,
    userId: authenticatedUserId,
    name,
    email,
  } = useAuthentication()
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null)
  const [medplumStore, setMedplumStore] = useState<MedplumStore | null>(null)
  
  // Refs to store cleanup functions
  const unsubscribeRef = useRef<{ patients?: () => void; tasks?: () => void }>({})
  const isInitializedRef = useRef(false)
  const isInitializingRef = useRef(false)
  const clientRef = useRef<MedplumClient | null>(null)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)

  const updateResource = useCallback(<T extends { id?: string }>(
    currentResources: T[],
    updatedResource: T,
  ): T[] => {
    const resourceIndex = currentResources.findIndex(
      (r) => r.id === updatedResource.id,
    )
    if (resourceIndex === -1) {
      return [...currentResources, updatedResource]
    }
    const newResources = [...currentResources]
    newResources[resourceIndex] = updatedResource
    return newResources
  }, [])

  // Function to initialize with existing token
  const initializeWithExistingToken = useCallback(async (token: string) => {
    try {
      const { medplumBaseUrl, medplumWsBaseUrl } = await getRuntimeConfig()
      
      if (!medplumBaseUrl || !medplumWsBaseUrl) {
        console.error('Medplum URLs not configured')
        return
      }

      const client = new MedplumClient({
        baseUrl: medplumBaseUrl,
        cacheTime: 10000,
      })
      
      // Set the existing token instead of calling startClientLogin
      client.setAccessToken(token)
      
      const store = new MedplumStore(client, medplumWsBaseUrl)
      setMedplumStore(store)
      clientRef.current = client
    } catch (error) {
      console.error('Failed to initialize with existing token:', error)
    }
  }, [])

  // Multi-tab coordination
  useEffect(() => {
    // Create broadcast channel for multi-tab communication
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastChannelRef.current = new BroadcastChannel('medplum-auth')
      
      broadcastChannelRef.current.onmessage = (event) => {
        if (event.data.type === 'AUTH_COMPLETED') {
          console.log('MedplumProvider: Auth completed in another tab, reusing token')
          // Another tab completed authentication, try to reuse the token
          const { token, clientId, clientSecret } = event.data.payload
          if (clientId === medplumClientId && clientSecret === medplumSecret) {
            // Reuse the authentication from the other tab
            initializeWithExistingToken(token)
          }
        } else if (event.data.type === 'AUTH_EXPIRED') {
          console.log('MedplumProvider: Auth expired in another tab, clearing token')
          // Another tab reported auth expired, clear our token too
          localStorage.removeItem(`medplum-token-${medplumClientId}`)
          setMedplumStore(null)
          clientRef.current = null
        }
      }
    }

    // Handle tab visibility changes to detect when tab becomes active
    const handleVisibilityChange = () => {
      if (!document.hidden && medplumClientId && medplumSecret) {
        // Tab became visible, check if we need to re-authenticate
        const existingToken = localStorage.getItem(`medplum-token-${medplumClientId}`)
        if (existingToken && !clientRef.current) {
          console.log('MedplumProvider: Tab became visible, reusing existing token')
          initializeWithExistingToken(existingToken)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close()
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [medplumClientId, medplumSecret, initializeWithExistingToken])

  // Initialize Medplum store
  useEffect(() => {
    
    // Prevent multiple simultaneous initializations
    if (isInitializingRef.current) {
      console.log('MedplumProvider: Already initializing, skipping')
      return
    }
    
    // If we already have a client and store, don't reinitialize
    if (clientRef.current && medplumStore) {
      console.log('MedplumProvider: Client and store already exist, skipping initialization')
      return
    }
    
    const initializeMedplumStore = async () => {
      isInitializingRef.current = true
      
      try {
        const { medplumBaseUrl, medplumWsBaseUrl } = await getRuntimeConfig()
       

        if (!medplumBaseUrl || !medplumWsBaseUrl) {
          console.error(
            'Medplum base URL or Medplum WebSocket base URL is not set',
            medplumBaseUrl,
            medplumWsBaseUrl,
          )
          return
        }
        
        // Check if another tab has already authenticated
        const existingToken = localStorage.getItem(`medplum-token-${medplumClientId}`)
        if (existingToken) {
          console.log('MedplumProvider: Found existing token, reusing')
          await initializeWithExistingToken(existingToken)
          return
        }
        
        // Only create new client if we don't have one
        if (!clientRef.current) {
          clientRef.current = new MedplumClient({
            baseUrl: medplumBaseUrl,
            cacheTime: 10000,
          })
          await clientRef.current.startClientLogin(medplumClientId, medplumSecret)
          
          // Store the token for other tabs
          const token = clientRef.current.getAccessToken()
          if (token) {
            localStorage.setItem(`medplum-token-${medplumClientId}`, token)
            
            // Notify other tabs that authentication is complete
            if (broadcastChannelRef.current) {
              broadcastChannelRef.current.postMessage({
                type: 'AUTH_COMPLETED',
                payload: { token, clientId: medplumClientId, clientSecret: medplumSecret }
              })
            }
          }
        }

        const store = new MedplumStore(clientRef.current, medplumWsBaseUrl)
        await store.initialize(medplumClientId, medplumSecret)
        setMedplumStore(store)
      } catch (error) {
        console.error('Failed to initialize Medplum store:', error)
        setError(error instanceof Error ? error : new Error('Failed to initialize Medplum store'))
      } finally {
        isInitializingRef.current = false
      }
    }

    if (medplumClientId && medplumSecret) {
      initializeMedplumStore()
    }
  }, [medplumClientId, medplumSecret, initializeWithExistingToken])

  // Load data and setup subscriptions
  useEffect(() => {
    console.log('MedplumProvider: Loading data and setting up subscriptions', { 
      hasMedplumStore: !!medplumStore,
      authenticatedUserId,
      name,
      email,
      isInitialized: isInitializedRef.current
    })
    
    if (!medplumStore || isInitializedRef.current) {
      return
    }

    const loadData = async () => {
      try {
        setIsLoading(true)

        const [loadedPatients, loadedTasks] = await Promise.all([
          medplumStore.getPatients(),
          medplumStore.getTasks(),
        ])
        setPatients(loadedPatients)
        setTasks(loadedTasks)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load data'))
      } finally {
        setIsLoading(false)
      }
    }

    const setupSubscriptions = async () => {
      try {        
        // Set up new subscriptions
        const [unsubscribePatients, unsubscribeTasks] = await Promise.all([
          medplumStore.subscribeToPatients((updatedPatient) => {
            setPatients((currentPatients) =>
              updateResource(currentPatients, updatedPatient),
            )
          }),
          medplumStore.subscribeToTasks((updatedTask) => {
            setTasks((currentTasks) =>
              updateResource(currentTasks, updatedTask),
            )
          }),
        ])

        // Store cleanup functions
        unsubscribeRef.current.patients = unsubscribePatients
        unsubscribeRef.current.tasks = unsubscribeTasks
        isInitializedRef.current = true
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to setup subscriptions'),
        )
      }
    }

    const getOrCreatePractitioner = async () => {
      if (!authenticatedUserId) {
        console.error('No authenticated user ID found')
        return
      }
      const practitioner = await medplumStore.getOrCreatePractitioner(
        authenticatedUserId,
        name && name.length > 0 ? name : (email ?? authenticatedUserId),
      )
      setPractitioner(practitioner)
    }

    loadData()
    setupSubscriptions()
    getOrCreatePractitioner()

    // Cleanup function
    return () => {
      console.log('MedplumProvider: Cleaning up subscriptions')
      if (unsubscribeRef.current.patients) {
        unsubscribeRef.current.patients()
        unsubscribeRef.current.patients = undefined
      }
      if (unsubscribeRef.current.tasks) {
        unsubscribeRef.current.tasks()
        unsubscribeRef.current.tasks = undefined
      }
      isInitializedRef.current = false
    }
  }, [medplumStore, updateResource])

  const addNotesToTask = useCallback(async (taskId: string, note: string) => {
    if (!medplumStore) {
      throw new Error('Medplum store not initialized')
    }
    const task = await medplumStore.addNoteToTask(taskId, note)
    setTasks((currentTasks) => updateResource(currentTasks, task))
    return task
  }, [medplumStore, updateResource])

  const toggleTaskOwner = useCallback(async (taskId: string) => {
    if (!medplumStore) {
      throw new Error('Medplum store not initialized')
    }
    const task = await medplumStore.toggleTaskOwner(
      taskId,
      practitioner?.id ?? '',
    )
    setTasks((currentTasks) => updateResource(currentTasks, task))
    return task
  }, [medplumStore, practitioner?.id, updateResource])

  // Function to clear authentication tokens
  const clearAuthTokens = useCallback(() => {
    if (medplumClientId) {
      localStorage.removeItem(`medplum-token-${medplumClientId}`)
    }
    // Notify other tabs that auth is expired
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'AUTH_EXPIRED',
        payload: { clientId: medplumClientId }
      })
    }
  }, [medplumClientId])

  const value = {
    patients,
    tasks,
    ingestionBots,
    enrichmentBots,
    connectorBots,
    isLoading,
    accessToken,
    error,
    addNotesToTask,
    toggleTaskOwner,
    clearAuthTokens,
  }

  return (
    <MedplumContext.Provider value={value}>{children}</MedplumContext.Provider>
  )
}

export function useMedplum() {
  const context = useContext(MedplumContext)
  if (!context) {
    throw new Error('useMedplum must be used within a MedplumProvider')
  }
  return context
}
