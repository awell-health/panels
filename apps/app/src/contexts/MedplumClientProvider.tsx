'use client'

import { useAuthentication } from '@/hooks/use-authentication'
import { getRuntimeConfig } from '@/lib/config'
import { MedplumStore } from '@/lib/medplum'
import { MedplumClient } from '@medplum/core'
import type { Bot, Patient, Practitioner, Task } from '@medplum/fhirtypes'
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'

type MedplumContextType = {
  patients: Patient[]
  tasks: Task[]
  isLoading: boolean
  error: Error | null
  addNotesToTask: (taskId: string, notes: string) => Promise<Task>
  toggleTaskOwner: (taskId: string) => Promise<Task>
}

const MedplumContext = createContext<MedplumContextType | null>(null)

export function MedplumClientProvider({
  children,
}: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
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
  const unsubscribeRef = useRef<{ patients?: () => void; tasks?: () => void }>(
    {},
  )
  const isInitializedRef = useRef(false)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const clientRef = useRef<MedplumClient | null>(null)

  const updateResource = useCallback(
    <T extends { id?: string }>(
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
    },
    [],
  )

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
          setMedplumStore(null)
        }
      }
    }

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close()
      }
    }
  }, [medplumClientId, medplumSecret])

  // Initialize Medplum store
  useEffect(() => {
    const initializeMedplumStore = async () => {
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

        const store = new MedplumStore(clientRef.current, medplumWsBaseUrl)
        await store.initialize(medplumClientId, medplumSecret)
        setMedplumStore(store)
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
      initializeMedplumStore()
    }
  }, [medplumClientId, medplumSecret])

  // Load data and setup subscriptions
  useEffect(() => {
    if (!medplumStore) {
      return
    }

    console.log('MedplumProvider: Loading data and setting up subscriptions', {
      medplumStore: medplumStore,
    })

    const loadData = async () => {
      try {
        const [loadedPatients, loadedTasks] = await Promise.all([
          medplumStore.getPatients(),
          medplumStore.getTasks(),
        ])
        setPatients(loadedPatients)
        setTasks(loadedTasks)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load data'))
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

    loadData()
    setupSubscriptions()

    // Cleanup function
    return () => {
      if (unsubscribeRef.current.patients) {
        unsubscribeRef.current.patients()
        unsubscribeRef.current.patients = undefined
      }
      if (unsubscribeRef.current.tasks) {
        unsubscribeRef.current.tasks()
        unsubscribeRef.current.tasks = undefined
      }
    }
  }, [medplumStore, updateResource])

  useEffect(() => {
    if (!medplumStore) {
      return
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

    getOrCreatePractitioner()
  }, [medplumStore, authenticatedUserId, name, email])

  const addNotesToTask = useCallback(
    async (taskId: string, note: string) => {
      if (!medplumStore) {
        throw new Error('Medplum store not initialized')
      }
      const task = await medplumStore.addNoteToTask(taskId, note)
      setTasks((currentTasks) => updateResource(currentTasks, task))
      return task
    },
    [medplumStore, updateResource],
  )

  const toggleTaskOwner = useCallback(
    async (taskId: string) => {
      if (!medplumStore) {
        throw new Error('Medplum store not initialized')
      }
      const task = await medplumStore.toggleTaskOwner(
        taskId,
        practitioner?.id ?? '',
      )
      setTasks((currentTasks) => updateResource(currentTasks, task))
      return task
    },
    [medplumStore, practitioner?.id, updateResource],
  )

  const value = {
    patients,
    tasks,
    isLoading,
    error,
    addNotesToTask,
    toggleTaskOwner,
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
