'use client'

import { StorageStatusIndicator } from '@/components/StorageStatusIndicator'
import {
  History,
  Home,
  MessageSquare,
  RotateCcw,
  RefreshCw,
  Plus,
} from 'lucide-react'

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
}: PanelFooterProps) {
  return (
    <div className="border-t border-gray-200 p-2 flex items-center justify-between bg-white">
      <div className="flex items-center space-x-3">
        <button
          type="button"
          className="btn text-xs font-normal h-8 px-2 flex items-center text-gray-700"
          onClick={navigateToHome}
        >
          <Home className="mr-1 h-3 w-3" />
          Home
        </button>

        {/* Moved columns and rows buttons here */}
        <button
          type="button"
          className="btn text-xs font-normal h-8 px-2 flex items-center text-gray-700"
        >
          {`${columnsCounter} columns`}
        </button>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            className="btn text-xs font-normal h-8 px-2 flex items-center text-gray-700"
          >
            {`${rowsCounter} rows`}
          </button>

          {/* Refresh button */}
          {onRefresh && (
            <button
              type="button"
              className="btn text-xs font-normal h-8 px-2 flex items-center text-gray-600 hover:text-gray-800"
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
              className="btn text-xs font-normal h-8 px-2 flex items-center text-gray-600 hover:text-gray-800"
              onClick={onLoadMore}
              disabled={isLoadingMore || isLoading}
            >
              <Plus
                className={`h-3 w-3 ${isLoadingMore ? 'animate-spin' : ''}`}
              />{' '}
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
          className="btn text-xs font-normal h-8 px-2 flex items-center text-gray-700"
        >
          <History className="mr-1 h-3 w-3" /> View table history
        </button>
        <button
          disabled={true}
          type="button"
          className="btn text-xs font-normal h-8 px-2 flex items-center text-gray-700"
        >
          <RotateCcw className="h-3 w-3" />
        </button>

        {/* AI Assistant Button */}
        <button
          disabled={true}
          type="button"
          className={`btn text-xs font-normal h-8 px-2 flex items-center justify-center ${isAISidebarOpen ? 'bg-blue-500 text-white' : 'text-gray-700'}`}
          title="AI Assistant"
        >
          <MessageSquare className="h-3 w-3" />
        </button>

        {/* Storage Status Indicator */}
        <StorageStatusIndicator />
      </div>
    </div>
  )
}
