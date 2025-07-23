import { useLazyQuery, useMutation, ApolloError } from '@apollo/client'
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
  activationError: string | null

  // Care flow context
  careFlowIds: string[]
  hasAwellCareFlowContext: boolean
}

// Helper function to extract error message from ApolloError
const extractErrorMessage = (error: ApolloError): string => {
  // Try to get custom message from GraphQL error extensions
  if (error.graphQLErrors && error.graphQLErrors.length > 0) {
    const graphQLError = error.graphQLErrors[0]

    // Check for custom message in extensions
    const data = graphQLError.extensions?.data as
      | Record<string, unknown>
      | undefined
    const customMessage = data?.customMessage
    if (typeof customMessage === 'string') {
      return customMessage
    }

    // Fall back to the standard message
    if (graphQLError.message) {
      return graphQLError.message
    }
  }

  // Check for network errors
  if (error.networkError?.message) {
    return error.networkError.message
  }

  // Fall back to generic error message or the error's message property
  return error.message || 'Failed to activate track'
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

  // Local state for track activation
  const [isActivatingTrack, setIsActivatingTrack] = useState(false)
  const [activationError, setActivationError] = useState<string | null>(null)

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

  // Mutation for track activation - only get the mutation function
  const [addTrackMutation] = useMutation<
    AddTrackMutation,
    AddTrackMutationVariables
  >(ADD_TRACK, {
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
      setIsActivatingTrack(true)
      setActivationError(null)

      try {
        const input: AddTrackInput = {
          pathway_id: pathwayId,
          track_id: trackId,
        }

        const result = await addTrackMutation({
          variables: { input },
        })

        // Check for GraphQL errors in the result
        if (result.errors && result.errors.length > 0) {
          const apolloError = new ApolloError({
            graphQLErrors: result.errors,
          })
          const errorMessage = extractErrorMessage(apolloError)
          setActivationError(errorMessage)
          setIsActivatingTrack(false)
          return false
        }

        setIsActivatingTrack(false)
        return result.data?.addTrack?.success || false
      } catch (error) {
        console.error('Failed to activate track:', error)
        if (error instanceof ApolloError) {
          const errorMessage = extractErrorMessage(error)
          setActivationError(errorMessage)
        } else {
          setActivationError('Failed to activate track')
        }
        setIsActivatingTrack(false)
        return false
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
    activationError,

    // Care flow context
    careFlowIds,
    hasAwellCareFlowContext,
  }
}
