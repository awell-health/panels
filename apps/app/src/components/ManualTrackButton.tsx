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

  // Don't show button if no tracks available or if there was an error loading them
  if (!hasAvailableTracks || tracksError) {
    return null
  }

  const isLoading = isActivatingTrack || isOptimisticUpdate

  if (isLoadingTracks) {
    return (
      <button type="button" tabIndex={0} className="btn btn-xs btn-default">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading tracks...
      </button>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="dropdown dropdown-end">
        <button type="button" tabIndex={0} className="btn btn-xs btn-default">
          <>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add Task
            <ChevronDown
              className={`h-3 w-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </>
        </button>
        <ul
          // tabIndex={0}
          className="dropdown-content menu bg-base-100 rounded-box z-1 w-48 shadow p-1"
        >
          {availableTracks.map((track) => {
            const isTrackDisabled = !track.isPathwayActive || isLoading
            const trackTooltip = !track.isPathwayActive
              ? `Care flow is ${track.pathwayStatus} - track unavailable`
              : undefined

            return (
              <li key={`${track.id}-${track.pathwayId}`}>
                <button
                  type="button"
                  onClick={() => handleTrackSelection(track)}
                  disabled={isTrackDisabled}
                  title={trackTooltip}
                  className={`text-xs ${
                    isTrackDisabled
                      ? 'text-gray-400 cursor-not-allowed bg-gray-50'
                      : 'text-gray-700 hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  <Plus
                    className={`h-3 w-3 ${isTrackDisabled ? 'text-gray-300' : 'text-gray-900'}`}
                  />
                  <span>{track.title}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
