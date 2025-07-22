import { useLazyQuery, useMutation } from '@apollo/client'
import { useMemo, useCallback, useEffect, useState } from 'react'
import { useMedplumStore } from './use-medplum-store'
import { extractUniquePathwayIds } from '@/lib/fhir-extensions'
import { GET_AD_HOC_TRACKS, ADD_TRACK } from '@/graphql/queries'
import type {
  GetAdHocTracksQuery,
  GetAdHocTracksQueryVariables,
  AddTrackMutation,
  AddTrackMutationVariables,
  Track,
  AddTrackInput,
} from '@/graphql/generated-types'

export interface UseManualTrackActivationOptions {
  patientId: string
}

// Extended track interface that includes pathway information
export interface TrackWithPathway extends Track {
  pathwayId: string
}

export interface UseManualTrackActivationResult {
  // Track data
  availableTracks: TrackWithPathway[]
  isLoadingTracks: boolean
  tracksError: Error | null
  hasAvailableTracks: boolean

  // Track activation
  activateTrack: (trackId: string, pathwayId: string) => Promise<boolean>
  isActivatingTrack: boolean
  activationError: Error | null

  // Care flow context
  careFlowIds: string[]
  hasAwellCareFlowContext: boolean
}

/**
 * Custom hook for managing manual track activation
 * Integrates with existing Medplum store patterns and Apollo GraphQL
 */
export function useManualTrackActivation(
  options: UseManualTrackActivationOptions,
): UseManualTrackActivationResult {
  const { patientId } = options
  const { tasks } = useMedplumStore()
  const [allTracks, setAllTracks] = useState<TrackWithPathway[]>([])
  const [isLoadingTracks, setIsLoadingTracks] = useState(false)
  const [tracksError, setTracksError] = useState<Error | null>(null)

  // Get patient tasks and extract care flow IDs
  const patientTasks = useMemo(() => {
    return tasks.filter((task) => task.patientId === patientId)
  }, [tasks, patientId])

  const careFlowIds = useMemo(() => {
    return extractUniquePathwayIds(patientTasks)
  }, [patientTasks])

  const hasAwellCareFlowContext = careFlowIds.length > 0

  // Set up lazy query for fetching tracks
  const [fetchTracks] = useLazyQuery<
    GetAdHocTracksQuery,
    GetAdHocTracksQueryVariables
  >(GET_AD_HOC_TRACKS, {
    errorPolicy: 'all',
    fetchPolicy: 'cache-first',
  })

  // Fetch tracks for all care flow IDs
  useEffect(() => {
    if (careFlowIds.length === 0) {
      setAllTracks([])
      setIsLoadingTracks(false)
      setTracksError(null)
      return
    }

    let isCancelled = false
    setIsLoadingTracks(true)
    setTracksError(null)

    const fetchAllTracks = async () => {
      try {
        // Fetch tracks for each care flow ID
        const trackPromises = careFlowIds.map(async (pathwayId) => {
          try {
            const result = await fetchTracks({
              variables: { pathway_id: pathwayId },
            })
            const tracks = result.data?.adHocTracksByPathway?.tracks || []
            // Associate each track with its pathway ID
            return tracks.map(
              (track: Track): TrackWithPathway => ({
                ...track,
                pathwayId,
              }),
            )
          } catch (error) {
            console.error(
              `Failed to fetch tracks for pathway ${pathwayId}:`,
              error,
            )
            return []
          }
        })

        const trackResults = await Promise.all(trackPromises)

        if (!isCancelled) {
          // Flatten all tracks (keeping duplicates since they belong to different pathways)
          const allTracksWithPathways = trackResults.flat()

          setAllTracks(allTracksWithPathways)
          setIsLoadingTracks(false)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to fetch tracks for care flows:', error)
          setTracksError(
            error instanceof Error
              ? error
              : new Error('Failed to fetch tracks'),
          )
          setIsLoadingTracks(false)
        }
      }
    }

    fetchAllTracks()

    return () => {
      isCancelled = true
    }
  }, [careFlowIds, fetchTracks])

  // Mutation for track activation
  const [
    addTrackMutation,
    { loading: isActivatingTrack, error: activationError },
  ] = useMutation<AddTrackMutation, AddTrackMutationVariables>(ADD_TRACK, {
    errorPolicy: 'all',
  })

  // Extract available tracks
  const availableTracks = useMemo(() => {
    return allTracks
  }, [allTracks])

  const hasAvailableTracks = availableTracks.length > 0

  // Track activation function - now requires both track ID and pathway ID
  const activateTrack = useCallback(
    async (trackId: string, pathwayId: string): Promise<boolean> => {
      try {
        const input: AddTrackInput = {
          pathway_id: pathwayId,
          track_id: trackId,
        }

        const result = await addTrackMutation({
          variables: { input },
        })

        return result.data?.addTrack?.success || false
      } catch (error) {
        console.error('Failed to activate track:', error)
        throw error
      }
    },
    [addTrackMutation],
  )

  return {
    // Track data
    availableTracks,
    isLoadingTracks,
    tracksError,
    hasAvailableTracks,

    // Track activation
    activateTrack,
    isActivatingTrack,
    activationError: activationError || null,

    // Care flow context
    careFlowIds,
    hasAwellCareFlowContext,
  }
}
