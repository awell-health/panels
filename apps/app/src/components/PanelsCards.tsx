'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutGrid,
  Plus,
  ExternalLink,
  Eye,
  Users,
  Database,
} from 'lucide-react'
import type { Panel } from '@/types/panel'
import { DEFAULT_PANEL } from '@/utils/constants'
import { usePanelStats } from '@/hooks/use-panel-stats'
import { cn } from '@/lib/utils'

interface PanelsCardsProps {
  panels: Panel[]
  createPanel: (panel: Panel) => Promise<Panel>
}

export default function PanelsCards({ panels, createPanel }: PanelsCardsProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Set mounted on client side
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const onCreatePanel = () => {
    createPanel(DEFAULT_PANEL)
      .then((newPanel) => {
        router.push(`/panel/${newPanel.id}`)
      })
      .catch((error) => {
        console.error('Failed to create default panel:', error)
      })
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Panel Cards */}
        {panels.map((panel) => (
          <PanelCard key={panel.id} panel={panel} />
        ))}

        {/* Create New Panel Card */}
        <div className="group">
          <button
            type="button"
            onClick={onCreatePanel}
            className="w-full h-[180px] border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors duration-200 bg-white"
          >
            <Plus className="h-12 w-12 mb-4 group-hover:scale-110 transition-transform duration-200" />
            <span className="font-semibold text-lg mb-2">Create New Panel</span>
            <span className="text-sm text-center">
              Set up a new patient monitoring dashboard
            </span>
          </button>
        </div>
      </div>

      {panels.length === 0 && (
        <div className="text-center py-12">
          <LayoutGrid className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No panels yet
          </h3>
          <p className="text-gray-500 mb-6">
            Create your first panel to get started
          </p>
          <button
            type="button"
            onClick={onCreatePanel}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Panel
          </button>
        </div>
      )}
    </div>
  )
}

interface PanelCardProps {
  panel: Panel
}

function PanelCard({ panel }: PanelCardProps) {
  const { id, name, description } = panel
  const router = useRouter()
  const {
    patients,
    tasks,
    views: viewsCount,
    isLoading: isStatsLoading,
  } = usePanelStats(id)

  // Real stats from the panel data
  const stats = {
    views: viewsCount,
    patients,
    tasks,
  }

  // Panel is active if it has any data or views
  const isActive = patients > 0 || tasks > 0 || viewsCount > 0

  return (
    <div className="group relative h-[180px]">
      <div
        className={cn(
          'bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow duration-200',
          'cursor-pointer h-full flex flex-col gap-2 hover:border-primary',
        )}
        onClick={() => router.push(`/panel/${id}`)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            router.push(`/panel/${id}`)
          }
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg mb-2">{name}</h3>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'badge badge-sm badge-outline',
                  isActive ? 'badge-primary' : 'badge-secondary',
                )}
              >
                {isActive ? 'Active' : 'Draft'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>
        </div>
        <p className="text-gray-600 text-sm flex-1">{description}</p>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{isStatsLoading ? '...' : `${stats.views} views`}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{isStatsLoading ? '...' : `${stats.patients} patients`}</span>
          </div>
          <div className="flex items-center gap-1">
            <Database className="h-4 w-4" />
            <span>{isStatsLoading ? '...' : `${stats.tasks} tasks`}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
