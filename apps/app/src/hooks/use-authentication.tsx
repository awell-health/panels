'use client'

import { getRuntimeConfig } from '@/lib/config'
import { useStytchMember, useStytchOrganization } from '@stytch/nextjs/b2b'
import type {
  Member as StytchMember,
  Organization as StytchOrganization,
} from '@stytch/vanilla-js/b2b'
import { Loader2 } from 'lucide-react'
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from 'react'

export class AuthenticationStore {
  private user: StytchMember | null = null
  private organization: StytchOrganization | null = null
  private environment: string | undefined = undefined

  constructor(
    user: StytchMember | null,
    organization: StytchOrganization | null,
    environment: string | undefined,
  ) {
    this.user = user
    this.organization = organization
    this.environment = environment
  }

  getUser = () => {
    return this.user
  }

  getOrganization = () => {
    return this.organization
  }

  getUserId = () => {
    return this.user?.member_id
  }

  getName = () => {
    return this.user?.name
  }

  getEmail = () => {
    return this.user?.email_address
  }

  // Method to populate both user and organization at once
  populateStore = (
    user: StytchMember | null,
    organization: StytchOrganization | null,
  ) => {
    this.user = user
    this.organization = organization
  }

  // Method to clear the store
  clearStore = () => {
    this.user = null
    this.organization = null
  }

  getMedplumClientId = () => {
    if (this.environment) {
      return (
        // biome-ignore lint/suspicious/noExplicitAny: figure out how to type metadata
        (this.organization?.trusted_metadata?.panels as any)?.[
          this.environment
        ]?.['medplum-client-id'] ??
        // biome-ignore lint/suspicious/noExplicitAny: figure out how to type metadata
        (this.organization?.trusted_metadata?.panels as any)?.[
          'medplum-client-id'
        ] ??
        undefined
      )
    }
    return (
      // biome-ignore lint/suspicious/noExplicitAny: figure out how to type metadata
      (this.organization?.trusted_metadata?.panels as any)?.[
        'medplum-client-id'
      ] ?? undefined
    )
  }

  getMedplumSecret = () => {
    if (this.environment) {
      return (
        // biome-ignore lint/suspicious/noExplicitAny: figure out how to type metadata
        (this.organization?.trusted_metadata?.panels as any)?.[
          this.environment
        ]?.['medplum-secret'] ??
        // biome-ignore lint/suspicious/noExplicitAny: figure out how to type metadata
        (this.organization?.trusted_metadata?.panels as any)?.[
          'medplum-secret'
        ] ??
        undefined
      )
    }
    return (
      // biome-ignore lint/suspicious/noExplicitAny: figure out how to type metadata
      (this.organization?.trusted_metadata?.panels as any)?.[
        'medplum-secret'
      ] ?? undefined
    )
  }

  getOrganizationSlug = () => {
    return this.organization?.organization_slug ?? undefined
  }
}

// Create context
const AuthenticationContext = createContext<AuthenticationStore | null>(null)

// Provider component
export function AuthenticationStoreProvider({
  children,
}: { children: ReactNode }) {
  const { organization } = useStytchOrganization()
  const { member } = useStytchMember()
  const [config, setConfig] = useState<{ environment?: string }>({})

  // Fetch config once
  useEffect(() => {
    const fetchConfig = async () => {
      const runtimeConfig = await getRuntimeConfig()
      setConfig({ environment: runtimeConfig.environment })
    }
    fetchConfig()
  }, [])

  // Create store instance with useMemo to prevent unnecessary recreations
  const storeInstance = useMemo(() => {
    if (!member || !organization || !config.environment) {
      return undefined
    }
    
    return new AuthenticationStore(member, organization, config.environment)
  }, [member, organization, config.environment])

  if (!storeInstance) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2
          className="h-8 w-8 text-blue-500 animate-spin mb-2"
          aria-label="Loading Panel"
        />
      </div>
    )
  }

  return (
    <AuthenticationContext.Provider value={storeInstance}>
      {children}
    </AuthenticationContext.Provider>
  )
}

// Hook to use the store
export function useAuthentication() {
  const store = useContext(AuthenticationContext)

  if (!store) {
    throw new Error(
      'useAuthentication must be used within an AuthenticationProvider',
    )
  }

  // Get the current values once
  const currentUser = store.getUser()
  const currentOrganization = store.getOrganization()
  const currentMedplumClientId = store.getMedplumClientId()
  const currentMedplumSecret = store.getMedplumSecret()
  const currentOrganizationSlug = store.getOrganizationSlug()
  const currentUserId = store.getUserId()
  const currentName = store.getName()
  const currentEmail = store.getEmail()

  // Use useMemo to create a stable object that only changes when the underlying data changes
  const authData = useMemo(() => ({
    user: currentUser,
    organization: currentOrganization,
    populateStore: store.populateStore,
    clearStore: store.clearStore,
    medplumClientId: currentMedplumClientId,
    medplumSecret: currentMedplumSecret,
    organizationSlug: currentOrganizationSlug,
    userId: currentUserId,
    name: currentName,
    email: currentEmail,
  }), [
    currentUser,
    currentOrganization,
    store.populateStore,
    store.clearStore,
    currentMedplumClientId,
    currentMedplumSecret,
    currentOrganizationSlug,
    currentUserId,
    currentName,
    currentEmail,
  ])

  return authData
}
