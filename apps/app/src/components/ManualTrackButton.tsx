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
  onCreateNonCareFlowTask: () => void
}

export function ManualTrackButton({
  patientId,
  onCreateNonCareFlowTask,
}: ManualTrackButtonProps) {
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

  if (!['awell-dev', 'encompass-health'].includes(organizationSlug ?? '')) {
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

  if (!hasAvailableTracks || tracksError) {
    return (
      <div className="relative" ref={dropdownRef}>
        <div className="dropdown dropdown-end">
          <button type="button" tabIndex={0} className="btn btn-xs btn-success">
            <Plus className="h-4 w-4" />
            Add Task
            <ChevronDown className="h-3 w-3" />
          </button>
          <ul className="dropdown-content menu bg-base-100 rounded-box z-1 w-48 shadow p-1">
            <li key="non-care-flow">
              <button
                type="button"
                onClick={onCreateNonCareFlowTask}
                className="text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <Plus className="h-3 w-3 text-gray-900" />
                <span>Non-care flow Task</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="dropdown dropdown-end">
        <button type="button" tabIndex={0} className="btn btn-xs btn-success">
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
        <ul className="dropdown-content menu bg-base-100 rounded-box z-1 w-48 shadow p-1">
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
          <li key="non-care-flow">
            <button
              type="button"
              onClick={onCreateNonCareFlowTask}
              disabled={isLoading}
              className="text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <Plus className="h-3 w-3 text-gray-900" />
              <span>Non-care flow Task</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  )
}
