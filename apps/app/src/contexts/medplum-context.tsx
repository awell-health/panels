'use client'

import { medplumStore } from '@/lib/medplum'
import type { Bot, Patient, Task } from '@medplum/fhirtypes'
import { createContext, useContext, useEffect, useState } from 'react'

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
  toggleTaskOwner: (taskId: string, authenticatedUserId: string) => Promise<Task>
}

const MedplumContext = createContext<MedplumContextType | null>(null)

export function MedplumProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [ingestionBots, setIngestionBots] = useState<Bot[]>([])
  const [enrichmentBots, setEnrichmentBots] = useState<Bot[]>([])
  const [connectorBots, setConnectorBots] = useState<Bot[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const updateResource = <T extends { id?: string }>(
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
  }

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        setIsLoading(true)
        const [loadedPatients, loadedTasks] = await Promise.all([
          medplumStore.getPatients(),
          medplumStore.getTasks(),
        ])

        if (isMounted) {
          setPatients(loadedPatients)
          setTasks(loadedTasks)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to load data'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    const setupSubscriptions = async () => {
      try {
        // These subscriptions will be set up only once and shared across all components
        await Promise.all([
          medplumStore.subscribeToPatients((updatedPatient) => {
            if (isMounted) {
              setPatients((currentPatients) =>
                updateResource(currentPatients, updatedPatient),
              )
            }
          }),
          medplumStore.subscribeToTasks((updatedTask) => {
            if (isMounted) {
              setTasks((currentTasks) => updateResource(currentTasks, updatedTask))
            }
          }),
        ])
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to setup subscriptions'))
        }
      }
    }

    loadData()
    setupSubscriptions()

    return () => {
      isMounted = false
    }
  }, [])

  async function addNotesToTask(taskId: string, note: string) {
    const task = await medplumStore.addNoteToTask(taskId, note)
    setTasks((currentTasks) => updateResource(currentTasks, task))
    return task
  }

  async function toggleTaskOwner(taskId: string, authenticatedUserId: string) {
    const task = await medplumStore.toggleTaskOwner(taskId, authenticatedUserId)
    setTasks((currentTasks) => updateResource(currentTasks, task))
    return task
  }

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
  }

  return <MedplumContext.Provider value={value}>{children}</MedplumContext.Provider>
}

export function useMedplum() {
  const context = useContext(MedplumContext)
  if (!context) {
    throw new Error('useMedplum must be used within a MedplumProvider')
  }
  return context
} 