'use client'

import { MedplumClientProvider } from '@/contexts/MedplumClientProvider'
import { ReactivePanelStoreProvider } from '@/hooks/use-reactive-panel-store'
import { StytchB2BProvider } from '@stytch/nextjs/b2b'
import { CookiesProvider } from 'react-cookie'
import { AuthenticationGuard } from './AuthenticationGuard'
import { Loader2 } from 'lucide-react'
import { AuthenticationStoreProvider } from '@/hooks/use-authentication'
import { useEffect, useState } from 'react'
import { getStytchClient } from '@/lib/stytch-client'
import { ToastProvider } from '@/contexts/ToastContext'
import { ToastContainer } from '@/components/ToastContainer'
import { CaptureWidget } from '@/components/CaptureWidget'
import { AwellApolloProvider } from '@/contexts/ApolloProvider'
import type {
  StytchB2BUIClient,
  StytchProjectConfiguration,
} from '@stytch/vanilla-js/dist/b2b'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [authStytchPublicToken, setAuthStytchPublicToken] = useState<
    string | undefined
  >(undefined)
  const [authCookiesAllowedDomain, setAuthCookiesAllowedDomain] = useState<
    string | undefined
  >(undefined)
  const [stytch, setStytch] = useState<StytchB2BUIClient<
    Partial<StytchProjectConfiguration>
  > | null>(null)

  useEffect(() => {
    const initializeStytch = async () => {
      try {
        const client = await getStytchClient()
        setStytch(client)
      } catch (error) {
        console.error('Failed to initialize Stytch client:', error)
      }
    }

    initializeStytch()
  }, [])

  // Don't render if stytch is not available
  if (!stytch) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <Loader2
            className="h-8 w-8 text-blue-500 animate-spin mb-2 mx-auto"
            aria-label="Loading..."
          />
        </div>
      </div>
    )
  }

  // TODO we want to start using Stytch with nextjs auth
  return (
    <StytchB2BProvider stytch={stytch}>
      <CookiesProvider>
        <AuthenticationGuard
          loadingComponent={
            <div className="h-screen w-full flex items-center justify-center">
              <Loader2
                className="h-8 w-8 text-blue-500 animate-spin mb-2"
                aria-label="Authenticating..."
              />
            </div>
          }
        >
          <AuthenticationStoreProvider>
            <MedplumClientProvider>
              <AwellApolloProvider>
                <ReactivePanelStoreProvider>
                  <ToastProvider>
                    {children}
                    <ToastContainer position="bottom-center" />
                    <CaptureWidget />
                  </ToastProvider>
                </ReactivePanelStoreProvider>
              </AwellApolloProvider>
            </MedplumClientProvider>
          </AuthenticationStoreProvider>
        </AuthenticationGuard>
      </CookiesProvider>
    </StytchB2BProvider>
  )
}
