'use client'

import {
  ApolloProvider,
  type ApolloClient,
  type NormalizedCacheObject,
} from '@apollo/client'
import { createApolloClient, setApolloClient } from '@/lib/apollo-client'
import { useAuthentication } from '@/hooks/use-authentication'
import { Loader2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useCookies } from 'react-cookie'

interface AwellApolloProviderProps {
  children: ReactNode
}

export function AwellApolloProvider({ children }: AwellApolloProviderProps) {
  const [apolloClient, setApolloClientState] =
    useState<ApolloClient<NormalizedCacheObject> | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const initializeApolloClient = async () => {
      try {
        setIsInitializing(true)

        // Create Apollo Client with authentication
        const client = await createApolloClient()

        setApolloClient(client)
        setApolloClientState(client)
      } catch (error) {
        console.error('Failed to initialize Apollo Client:', error)
      } finally {
        setIsInitializing(false)
      }
    }

    initializeApolloClient()
  }, [])

  // Show loading state while initializing
  if (isInitializing || !apolloClient) {
    return (
      <div className="flex justify-center items-center h-8">
        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
      </div>
    )
  }

  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
}
