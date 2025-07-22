'use client'

import { useAuthentication } from '@/hooks/use-authentication'
import { getRuntimeConfig } from '@/lib/config'
import {
  MedplumStoreClient,
  type PaginatedResult,
  type PaginationOptions,
} from '@/lib/medplum-client'
import { panelDataStore } from '@/lib/reactive/panel-medplum-data-store'
import { MedplumClient } from '@medplum/core'
import type {
  Composition,
  DetectedIssue,
  Encounter,
  Observation,
  Patient,
  Practitioner,
  Task,
} from '@medplum/fhirtypes'
import { Loader2 } from 'lucide-react'
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'

type MedplumContextType = {
  isLoading: boolean
  error: Error | null
  // Practitioner management
  practitioner: Practitioner | null

  // Data access methods (delegated to store)
  addNotesToTask: (taskId: string, notes: string) => Promise<Task>
  toggleTaskOwner: (taskId: string) => Promise<Task>
  getPatientObservations: (patientId: string) => Promise<Observation[]>
  getPatientCompositions: (patientId: string) => Promise<Composition[]>
  getPatientEncounters: (patientId: string) => Promise<Encounter[]>
  getPatientDetectedIssues: (patientId: string) => Promise<DetectedIssue[]>
  deletePatient: (patientId: string) => Promise<void>
  getPatientsPaginated: (
    options: PaginationOptions,
  ) => Promise<PaginatedResult<Patient>>
  getTasksPaginated: (
    options: PaginationOptions,
  ) => Promise<PaginatedResult<Task>>
  getPatientsFromReferences: (patientRefList: string[]) => Promise<Patient[]>
  getTasksForPatients: (patientIDs: string[]) => Promise<Task[]>
}

const MedplumContext = createContext<MedplumContextType | null>(null)

export function MedplumClientProvider({
  children,
}: { children: React.ReactNode }) {
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
  const [medplumClient, setMedplumClient] = useState<MedplumStoreClient | null>(
    null,
  )

  // Refs to store cleanup functions
  const unsubscribeRef = useRef<{ patients?: () => void; tasks?: () => void }>(
    {},
  )
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const clientRef = useRef<MedplumClient | null>(null)

  // Multi-tab coordination
  useEffect(() => {
    // Create broadcast channel for multi-tab communication
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastChannelRef.current = new BroadcastChannel('medplum-auth')

      broadcastChannelRef.current.onmessage = (event) => {
        if (event.data.type === 'AUTH_COMPLETED') {
          console.log(
            'MedplumProvider: Auth completed in another tab, reusing token',
          )
          // Another tab completed authentication, try to reuse the token
          const { token, clientId, clientSecret } = event.data.payload
          if (clientId === medplumClientId && clientSecret === medplumSecret) {
            // Reuse the authentication from the other tab
            clientRef.current?.setAccessToken(token)
          }
        } else if (event.data.type === 'AUTH_EXPIRED') {
          console.log(
            'MedplumProvider: Auth expired in another tab, clearing token',
          )
          setMedplumClient(null)
        }
      }
    }

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close()
      }
    }
  }, [medplumClientId, medplumSecret])

  // Initialize Medplum client and store
  useEffect(() => {
    const initializeMedplumClient = async () => {
      try {
        setIsLoading(true)
        const { medplumBaseUrl, medplumWsBaseUrl } = await getRuntimeConfig()

        if (!medplumBaseUrl || !medplumWsBaseUrl) {
          console.error(
            'Medplum base URL or Medplum WebSocket base URL is not set',
            medplumBaseUrl,
            medplumWsBaseUrl,
          )
          return
        }

        // Only create new client if we don't have one
        if (!clientRef.current) {
          clientRef.current = new MedplumClient({
            baseUrl: medplumBaseUrl,
            cacheTime: 10000,
          })
          if (!clientRef.current.isAuthenticated()) {
            await clientRef.current.startClientLogin(
              medplumClientId,
              medplumSecret,
            )
          } else {
            console.log(
              'MedplumProvider: Client already authenticated, skipping login',
            )
          }
        }

        if (
          clientRef.current &&
          clientRef.current.getActiveLogin()?.profile?.reference !==
            `ClientApplication/${medplumClientId}`
        ) {
          console.log(
            'MedplumProvider: Reauthenticating in a different client login',
            medplumClientId,
          )
          await clientRef.current.startClientLogin(
            medplumClientId,
            medplumSecret,
          )
        }

        const store = new MedplumStoreClient(
          clientRef.current,
          medplumWsBaseUrl,
        )
        await store.initialize(medplumClientId, medplumSecret)
        panelDataStore.registerAsListener(store)
        setMedplumClient(store)
      } catch (error) {
        console.error('Failed to initialize Medplum store:', error)
        setError(
          error instanceof Error
            ? error
            : new Error('Failed to initialize Medplum store'),
        )
      } finally {
        setIsLoading(false)
      }
    }

    if (medplumClientId && medplumSecret) {
      initializeMedplumClient()
    }
  }, [medplumClientId, medplumSecret])

  // Setup practitioner
  useEffect(() => {
    if (!medplumClient) {
      return
    }

    const getOrCreatePractitioner = async () => {
      if (!authenticatedUserId) {
        console.error('No authenticated user ID found')
        return
      }
      const practitioner = await medplumClient.getOrCreatePractitioner(
        authenticatedUserId,
        name && name.length > 0 ? name : (email ?? authenticatedUserId),
      )
      setPractitioner(practitioner)
    }

    getOrCreatePractitioner()
  }, [medplumClient, authenticatedUserId, name, email])

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      // Unregister panel data store from medplumClient listeners

      if (unsubscribeRef.current.patients) {
        unsubscribeRef.current.patients()
        unsubscribeRef.current.patients = undefined
      }
      if (unsubscribeRef.current.tasks) {
        unsubscribeRef.current.tasks()
        unsubscribeRef.current.tasks = undefined
      }
    }
  }, [])

  const addNotesToTask = useCallback(
    async (taskId: string, note: string) => {
      if (isLoading) {
        throw new Error('Medplum client is still initializing')
      }
      if (!medplumClient) {
        throw new Error('Medplum store not initialized')
      }
      return await medplumClient.addNoteToTask(
        taskId,
        note,
        practitioner?.id ?? '',
        name ?? practitioner?.name?.[0]?.text ?? '',
      )
    },
    [medplumClient, isLoading, practitioner?.id, name, practitioner?.name],
  )

  const getPatientObservations = useCallback(
    async (patientId: string) => {
      if (isLoading) {
        throw new Error('Medplum client is still initializing')
      }
      if (!medplumClient) {
        throw new Error('Medplum store not initialized')
      }
      return await medplumClient.getObservations(patientId)
    },
    [medplumClient, isLoading],
  )

  const getPatientCompositions = useCallback(
    async (patientId: string) => {
      if (isLoading) {
        throw new Error('Medplum client is still initializing')
      }
      if (!medplumClient) {
        throw new Error('Medplum store not initialized')
      }
      return await medplumClient.getCompositions(patientId)
    },
    [medplumClient, isLoading],
  )

  const getPatientEncounters = useCallback(
    async (patientId: string) => {
      if (isLoading) {
        throw new Error('Medplum client is still initializing')
      }
      if (!medplumClient) {
        throw new Error('Medplum store not initialized')
      }
      return await medplumClient.getEncounters(patientId)
    },
    [medplumClient, isLoading],
  )

  const getPatientDetectedIssues = useCallback(
    async (patientId: string) => {
      if (isLoading) {
        throw new Error('Medplum client is still initializing')
      }
      if (!medplumClient) {
        throw new Error('Medplum store not initialized')
      }
      return await medplumClient.getDetectedIssues(patientId)
    },
    [medplumClient, isLoading],
  )

  const toggleTaskOwner = useCallback(
    async (taskId: string) => {
      if (isLoading) {
        throw new Error('Medplum client is still initializing')
      }
      if (!medplumClient) {
        throw new Error('Medplum store not initialized')
      }
      return await medplumClient.toggleTaskOwner(taskId, practitioner?.id ?? '')
    },
    [medplumClient, practitioner?.id, isLoading],
  )

  const deletePatient = useCallback(
    async (patientId: string) => {
      if (isLoading) {
        throw new Error('Medplum client is still initializing')
      }
      if (!medplumClient) {
        throw new Error('Medplum store not initialized')
      }
      await medplumClient.deletePatient(patientId)
    },
    [medplumClient, isLoading],
  )

  // Progressive loading methods
  const getPatientsPaginated = useCallback(
    async (options: PaginationOptions) => {
      if (isLoading) {
        throw new Error('Medplum client is still initializing')
      }
      if (!medplumClient) {
        throw new Error('Medplum store not initialized')
      }
      return await medplumClient.getPatientsPaginated(options)
    },
    [medplumClient, isLoading],
  )

  const getTasksPaginated = useCallback(
    async (options: PaginationOptions) => {
      if (isLoading) {
        throw new Error('Medplum client is still initializing')
      }
      if (!medplumClient) {
        throw new Error('Medplum store not initialized')
      }
      return await medplumClient.getTasksPaginated(options)
    },
    [medplumClient, isLoading],
  )

  const getPatientsFromReferences = useCallback(
    async (patientRefList: string[]) => {
      if (isLoading) {
        throw new Error('Medplum client is still initializing')
      }
      if (!medplumClient) {
        throw new Error('Medplum store not initialized')
      }
      return await medplumClient.getPatientsFromReferences(patientRefList)
    },
    [medplumClient, isLoading],
  )

  const getTasksForPatients = useCallback(
    async (patientIDs: string[]) => {
      if (isLoading) {
        throw new Error('Medplum client is still initializing')
      }
      if (!medplumClient) {
        throw new Error('Medplum store not initialized')
      }
      return await medplumClient.getTasksForPatients(patientIDs)
    },
    [medplumClient, isLoading],
  )

  const value = {
    store: medplumClient,
    isLoading,
    error,
    practitioner,
    addNotesToTask,
    toggleTaskOwner,
    getPatientObservations,
    getPatientEncounters,
    getPatientDetectedIssues,
    getPatientCompositions,
    deletePatient,
    getPatientsPaginated,
    getTasksPaginated,
    getPatientsFromReferences,
    getTasksForPatients,
  }

  if (!medplumClientId || !medplumSecret || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2
          className="h-8 w-8 text-blue-500 animate-spin mb-2"
          aria-label="Setting up connections for Panels..."
        />
      </div>
    )
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
