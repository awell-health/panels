'use client'

import { StorageStatusIndicator } from '@/components/StorageStatusIndicator'
import { EditableJsonModal } from '@/components/EditableJsonModal'
import type { Panel } from '@/types/panel'
import {
  History,
  Home,
  MessageSquare,
  RotateCcw,
  RefreshCw,
  Plus,
  Cog,
} from 'lucide-react'
import { useState } from 'react'
import type { FHIRCard } from './ModalDetails/StaticContent/FhirExpandableCard'

interface PanelFooterProps {
  columnsCounter: number
  rowsCounter: number
  isAISidebarOpen: boolean
  navigateToHome: () => void
  dataAfter?: string
  hasMore?: boolean
  onLoadMore?: () => void
  isLoadingMore?: boolean
  onRefresh?: () => void
  isLoading?: boolean
  panel?: Panel
  onCardsConfigurationChange?: (cardsConfiguration: FHIRCard[]) => Promise<void>
}

export default function PanelFooter({
  columnsCounter,
  rowsCounter,
  isAISidebarOpen,
  navigateToHome,
  dataAfter,
  hasMore,
  onLoadMore,
  isLoadingMore,
  onRefresh,
  isLoading,
  panel,
  onCardsConfigurationChange,
}: PanelFooterProps) {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)

  const handleConfigSave = async (newConfigData: object) => {
    const typedNewData = newConfigData as FHIRCard[]

    // Save configuration to panel metadata
    if (panel && onCardsConfigurationChange) {
      try {
        await onCardsConfigurationChange(typedNewData)
      } catch (error) {
        console.error('❌ Failed to save configuration to panel:', error)
        throw error
      }
    }
  }

  return (
    <div className="border-t border-gray-200 p-2 flex items-center justify-between bg-white">
      <div className="flex items-center space-x-3">
        <button
          type="button"
          className="inline-flex items-center px-2 h-8 text-xs font-normal text-gray-700 rounded-md bg-transparent hover:bg-gray-100"
          onClick={navigateToHome}
        >
          <Home className="mr-1 h-3 w-3" />
          Home
        </button>

        {/* Moved columns and rows buttons here */}
        <button
          type="button"
          className="inline-flex items-center px-2 h-8 text-xs font-normal text-gray-700 rounded-md bg-transparent hover:bg-gray-100"
        >
          {`${columnsCounter} columns`}
        </button>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            className="inline-flex items-center px-2 h-8 text-xs font-normal text-gray-700 rounded-md bg-transparent hover:bg-gray-100"
          >
            {`${rowsCounter} rows`}
          </button>

          {/* Refresh button */}
          {onRefresh && (
            <button
              type="button"
              className="inline-flex items-center px-2 h-8 text-xs font-normal text-gray-600 rounded-md bg-transparent hover:text-gray-800 hover:bg-gray-100"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh data"
            >
              <RefreshCw
                className={`mr-1 h-3 w-3 ${isLoading || isLoadingMore ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          )}

          {hasMore && onLoadMore && (
            <button
              type="button"
              className="inline-flex items-center px-2 h-8 text-xs font-normal text-gray-600 rounded-md bg-transparent hover:text-gray-800 hover:bg-gray-100"
              onClick={onLoadMore}
              disabled={isLoadingMore || isLoading}
            >
              <Plus className="h-3 w-3" />
              Fetch older data
            </button>
          )}
        </div>

        {/* Data loading controls */}
        <div className="flex items-center space-x-2">
          {dataAfter && hasMore && (
            <div className="text-xs text-gray-500 flex items-center">
              <span className="mr-1">Showing data after:</span>
              <span className="font-mono">
                {new Date(dataAfter).toLocaleString()}
              </span>
            </div>
          )}

          {!hasMore && (
            <div className="text-xs text-gray-500 flex items-center">
              <span className="mr-1">Showing all data</span>
            </div>
          )}

          {/* Load more and load all buttons */}
        </div>
      </div>
      <div className="flex items-center space-x-2 relative">
        <button
          disabled={true}
          type="button"
          className="inline-flex items-center px-2 h-8 text-xs font-normal text-gray-700 rounded-md bg-transparent hover:bg-gray-100 disabled:opacity-50"
        >
          <History className="mr-1 h-3 w-3" /> View table history
        </button>
        <button
          disabled={true}
          type="button"
          className="inline-flex items-center px-2 h-8 text-xs font-normal text-gray-700 rounded-md bg-transparent hover:bg-gray-100 disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" />
        </button>

        <button
          type="button"
          className="inline-flex items-center px-2 h-8 text-xs font-normal text-gray-700 rounded-md bg-transparent hover:text-gray-800 hover:bg-gray-100"
          onClick={() => {
            setIsConfigModalOpen(true)
          }}
          title="Configuration"
        >
          <Cog className="h-3 w-3" />
        </button>

        {/* AI Assistant Button */}
        <button
          disabled={true}
          type="button"
          className={`inline-flex items-center justify-center px-2 h-8 text-xs font-normal rounded-md disabled:opacity-50 ${isAISidebarOpen ? 'bg-blue-500 text-white' : 'bg-transparent text-gray-700 hover:bg-gray-100'}`}
          title="AI Assistant"
        >
          <MessageSquare className="h-3 w-3" />
        </button>

        {/* Storage Status Indicator */}
        <StorageStatusIndicator />
      </div>

      {/* Configuration Modal */}
      <EditableJsonModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Panel Configuration"
        panel={panel}
        onSave={handleConfigSave}
      />
    </div>
  )
}
