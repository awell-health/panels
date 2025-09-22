import { useCallback, useEffect, useState } from 'react'
import { useMedplum } from '@/contexts/MedplumClientProvider'
import { useReactiveViews } from '@/hooks/use-reactive-data-zustand'

interface PanelStats {
  patients: number
  tasks: number
  views: number
  isLoading: boolean
  error: Error | null
}

export function usePanelStats(panelId: string): PanelStats {
  const { getPatientCount, getTaskCount } = useMedplum()
  const { views } = useReactiveViews(panelId)
  const [stats, setStats] = useState<PanelStats>({
    patients: 0,
    tasks: 0,
    views: 0,
    isLoading: true,
    error: null,
  })

  const fetchStats = useCallback(async () => {
    try {
      setStats((prev) => ({ ...prev, isLoading: true, error: null }))

      // Fetch counts using dedicated count methods
      const [patientCount, taskCount] = await Promise.all([
        getPatientCount(),
        getTaskCount(),
      ])

      setStats({
        patients: patientCount,
        tasks: taskCount,
        views: views?.length || 0,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      console.error('Error fetching panel stats:', error)
      setStats((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to fetch panel stats'),
      }))
    }
  }, [getPatientCount, getTaskCount, views?.length])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return stats
}
