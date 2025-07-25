'use client'

import {
  ApolloClient,
  InMemoryCache,
  type NormalizedCacheObject,
  createHttpLink,
} from '@apollo/client'
import { getRuntimeConfig } from './config'

let apolloClient: ApolloClient<NormalizedCacheObject> | null = null

export async function createApolloClient() {
  const { environment } = await getRuntimeConfig()

  const uri = (() => {
    switch (environment) {
      case 'local':
        return 'http://localhost:8110/graphql'
      case 'development':
        return 'https://api.development.awellhealth.com/orchestration/graphql'
      case 'staging':
        return 'https://api.staging.awellhealth.com/orchestration/graphql'
      case 'sandbox':
        return 'https://api.sandbox.awellhealth.com/orchestration/graphql'
      case 'production':
        return 'https://api.awellhealth.com/orchestration/graphql'
      case 'production-uk':
        return 'https://api.uk.awellhealth.com/orchestration/graphql'
      case 'production-us':
        return 'https://api.us.awellhealth.com/orchestration/graphql'
      default:
        throw new Error(`Invalid environment: ${environment}`)
    }
  })()

  // Create HTTP link to GraphQL endpoint
  const httpLink = createHttpLink({
    uri,
    credentials: 'include',
  })

  // Create Apollo Client instance
  const client = new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
      },
      query: {
        errorPolicy: 'all',
      },
    },
  })

  return client
}

export function getApolloClient() {
  return apolloClient
}

export function setApolloClient(client: ApolloClient<NormalizedCacheObject>) {
  apolloClient = client
}
