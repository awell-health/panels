'use client'

import { getRuntimeConfig, type RuntimeConfig } from '@/lib/config'
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
  useMemo,
  useState,
} from 'react'

export class AuthenticationStore {
  private user: StytchMember | null = null
  private organization: StytchOrganization | null = null
  private environment: string | undefined = undefined
  private adminRole: string

  constructor(
    user: StytchMember | null,
    organization: StytchOrganization | null,
    environment: string | undefined,
    adminRole: string,
  ) {
    this.user = user
    this.organization = organization
    this.environment = environment
    this.adminRole = adminRole
  }

  isAdmin = () => {
    return this.user?.roles.map((role) => role.role_id).includes(this.adminRole)
  }

  getRoles = () => {
    return this.user?.roles
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
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | undefined>(
    undefined,
  )

  useEffect(() => {
    const fetchConfig = async () => {
      const config = await getRuntimeConfig()
      setRuntimeConfig(config)
    }
    fetchConfig()
  }, [])

  const storeInstance = useMemo(() => {
    if (!member || !organization || !runtimeConfig) {
      return undefined
    }

    return new AuthenticationStore(
      member,
      organization,
      runtimeConfig.environment,
      runtimeConfig.adminRole,
    )
  }, [member, organization, runtimeConfig])

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
  const currentRoles = store.getRoles()
  const currentIsAdmin = store.isAdmin()

  // Use useMemo to create a stable object that only changes when the underlying data changes
  const authData = useMemo(
    () => ({
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
      isAdmin: currentIsAdmin,
      roles: currentRoles,
    }),
    [
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
      currentIsAdmin,
      currentRoles,
    ],
  )

  return authData
}
