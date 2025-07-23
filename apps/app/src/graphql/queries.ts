import { gql } from '@apollo/client'

/**
 * Query to get available ad hoc tracks for a specific pathway and pathway status
 */
export const GET_AD_HOC_TRACKS = gql`
  query GetAdHocTracks($pathway_id: String!) {
    adHocTracksByPathway(pathway_id: $pathway_id) {
      tracks {
        id
        title
      }
    }
    pathway(id: $pathway_id) {
      pathway {
        status
      }
    }
  }
`

/**
 * Mutation to add/activate a track for patient documentation
 */
export const ADD_TRACK = gql`
  mutation AddTrack($input: AddTrackInput!) {
    addTrack(input: $input) {
      success
    }
  }
`
