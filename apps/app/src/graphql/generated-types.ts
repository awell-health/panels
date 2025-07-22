/**
 * Generated TypeScript types for GraphQL operations
 * Based on Awell GraphQL schema
 */

// Input types
export interface AddTrackInput {
  pathway_id: string
  track_id: string
}

// Track types
export interface Track {
  id: string
  title: string
}

export interface AdHocTracksByPathway {
  tracks: Track[]
}

// Query types
export interface GetAdHocTracksQuery {
  adHocTracksByPathway: AdHocTracksByPathway
}

export interface GetAdHocTracksQueryVariables {
  pathway_id: string
}

// Mutation types
export interface AddTrackMutation {
  addTrack: {
    success: boolean
  }
}

export interface AddTrackMutationVariables {
  input: AddTrackInput
}

// Error types
export interface GraphQLError {
  message: string
  locations?: Array<{
    line: number
    column: number
  }>
  path?: Array<string | number>
}
