'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, ChevronDown, Loader2 } from 'lucide-react'
import {
  useManualTrackActivation,
  type TrackWithPathway,
} from '@/hooks/use-manual-track-activation'
import { useToastHelpers } from '@/contexts/ToastContext'
import { useAuthentication } from '@/hooks/use-authentication'

interface ManualTrackButtonProps {
  patientId: string
}

export function ManualTrackButton({ patientId }: ManualTrackButtonProps) {
  const { organizationSlug } = useAuthentication()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isOptimisticUpdate, setIsOptimisticUpdate] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { showSuccess, showError } = useToastHelpers()

  const {
    availableTracks,
    isLoadingTracks,
    tracksError,
    hasAvailableTracks,
    activateTrack,
    isActivatingTrack,
    activationError,
    hasAwellCareFlowContext,
  } = useManualTrackActivation({ patientId })

  // Show toast error when tracks fail to load
  useEffect(() => {
    if (tracksError) {
      showError('Failed to load available tracks', undefined, {
        duration: 5000,
        dismissible: false,
      })
    }
  }, [tracksError, showError])

  // Handle track activation
  const handleTrackSelection = async (track: TrackWithPathway) => {
    // Don't proceed if pathway is not active
    if (!track.isPathwayActive) {
      return
    }

    setIsOptimisticUpdate(true)
    setIsDropdownOpen(false)

    const success = await activateTrack(track.id, track.pathwayId)

    if (success) {
      showSuccess(`Successfully activated track: ${track.title}`, undefined, {
        duration: 4000,
        dismissible: false,
      })
    } else {
      // Use the actual GraphQL error message if available
      const errorMessage = activationError || 'Failed to activate track'
      showError(errorMessage, undefined, {
        duration: 5000,
        dismissible: false,
      })
    }

    setIsOptimisticUpdate(false)
  }

  // Don't render if no Awell care flow context
  if (!hasAwellCareFlowContext) {
    return null
  }
  if (!['awell-dev', 'encompass-health'].includes(organizationSlug ?? '')) {
    return null
  }

  // Show loading state while tracks are loading
  if (isLoadingTracks) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        <span className="text-sm text-gray-600">Loading tracks...</span>
      </div>
    )
  }

  // Don't show button if no tracks available or if there was an error loading them
  if (!hasAvailableTracks || tracksError) {
    return null
  }

  const isLoading = isActivatingTrack || isOptimisticUpdate

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        aria-label="Add manual documentation track"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Add Task
        <ChevronDown
          className={`h-3 w-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isDropdownOpen && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3">
            <div className="space-y-1">
              {availableTracks.map((track) => {
                const isTrackDisabled = !track.isPathwayActive || isLoading
                const trackTooltip = !track.isPathwayActive
                  ? `Care flow is ${track.pathwayStatus} - track unavailable`
                  : undefined

                return (
                  <button
                    key={`${track.id}-${track.pathwayId}`}
                    type="button"
                    onClick={() => handleTrackSelection(track)}
                    disabled={isTrackDisabled}
                    title={trackTooltip}
                    className={`w-full px-3 py-2 text-left text-sm rounded-md transition-colors flex items-center gap-2 ${
                      isTrackDisabled
                        ? 'text-gray-400 cursor-not-allowed bg-gray-50'
                        : 'text-gray-700 hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <Plus
                      className={`h-3 w-3 ${isTrackDisabled ? 'text-gray-300' : 'text-gray-500'}`}
                    />
                    <span>{track.title}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
