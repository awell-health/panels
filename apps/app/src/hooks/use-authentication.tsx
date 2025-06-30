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
  const [storeInstance, setStoreInstance] = useState<
    AuthenticationStore | undefined
  >(undefined)
  const { organization } = useStytchOrganization()
  const { member } = useStytchMember()

  // biome-ignore lint/correctness/useExhaustiveDependencies: deps are fine
  useEffect(() => {
    const createAuthStore = async () => {
      const config = await getRuntimeConfig()
      setStoreInstance(
        new AuthenticationStore(member, organization, config.environment),
      )
    }

    if (
      member?.member_id !== storeInstance?.getUserId() ||
      organization?.organization_slug !== storeInstance?.getOrganizationSlug()
    ) {
      createAuthStore()
    }
  }, [member, organization])

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

  // Return a proxy object that provides access to the store's public methods
  return {
    user: store.getUser(),
    organization: store.getOrganization(),
    populateStore: store.populateStore,
    clearStore: store.clearStore,
    medplumClientId: store.getMedplumClientId(),
    medplumSecret: store.getMedplumSecret(),
    organizationSlug: store.getOrganizationSlug(),
    userId: store.getUserId(),
    name: store.getName(),
    email: store.getEmail(),
  }
}
