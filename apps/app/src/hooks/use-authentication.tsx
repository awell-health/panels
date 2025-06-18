"use client"

import { type ReactNode, createContext, useContext, useState } from 'react'
import type { Organization as StytchOrganization, Member as StytchMember } from '@stytch/vanilla-js/b2b'

export class AuthenticationStore {

    private user: StytchMember | null = null
    private organization: StytchOrganization | null = null

    getUser = () => {
        return this.user
    }

    getOrganization = () => {
        return this.organization
    }

    setUser = (user: StytchMember | null) => {
        this.user = user
    }

    getUserId = () => {
        return this.user?.member_id
    }

    setOrganization = (organization: StytchOrganization | null) => {
        this.organization = organization
    }

    // Method to populate both user and organization at once
    populateStore = (user: StytchMember | null, organization: StytchOrganization | null) => {
        this.user = user
        this.organization = organization
    }

    // Method to clear the store
    clearStore = () => {
        this.user = null
        this.organization = null
    }

    getMedplumClientId = () => {
        return (this.organization?.trusted_metadata?.panels as any)?.['medplum-client-id'] ?? undefined
    }

    getMedplumSecret = () => {
        return (this.organization?.trusted_metadata?.panels as any)?.['medplum-secret'] ?? undefined
    }

    getOrganizationSlug = () => {
        return this.organization?.organization_slug ?? undefined
    }
}

// Create context
const AuthenticationContext = createContext<AuthenticationStore | null>(null)

// Create a singleton instance
let storeInstance: AuthenticationStore | null = null

// Provider component
export function AuthenticationStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => {
    if (!storeInstance) {
      storeInstance = new AuthenticationStore()
    }
    return storeInstance
  })

  return (
    <AuthenticationContext.Provider value={store}>
      {children}
    </AuthenticationContext.Provider>
  )
}

// Hook to use the store
export function useAuthentication() {   

    const store = useContext(AuthenticationContext)

    if (!store) {
        throw new Error('useAuthentication must be used within an AuthenticationProvider')
    }

  // Return a proxy object that provides access to the store's public methods
  return {
    user: store.getUser(),
    organization: store.getOrganization(),
    setUser: store.setUser,
    setOrganization: store.setOrganization,
    populateStore: store.populateStore,
    clearStore: store.clearStore,
    medplumClientId: store.getMedplumClientId(),
    medplumSecret: store.getMedplumSecret(),
    organizationSlug: store.getOrganizationSlug(),
    userId: store.getUserId(),
  }
} 