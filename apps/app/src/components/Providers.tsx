'use client'

import { MedplumProvider } from '@/contexts/medplum-context';
import { PanelStoreProvider } from '@/hooks/use-panel-store';
import { StytchB2BProvider } from '@stytch/nextjs/b2b'
import { createStytchB2BUIClient } from '@stytch/nextjs/b2b/ui'
import { CookiesProvider } from 'react-cookie';
import { AuthenticationGuard } from './AuthenticationGuard';
import { Loader2 } from 'lucide-react';
import { AuthenticationStoreProvider } from '@/hooks/use-authentication';
import { useMemo } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const stytch = useMemo(() => {
    return createStytchB2BUIClient(process.env.NEXT_PUBLIC_AUTH_STYTCH_PUBLIC_TOKEN!, {
      cookieOptions: {
        opaqueTokenCookieName: `stytch_session`,
        domain: process.env.NEXT_PUBLIC_AUTH_COOKIES_ALLOWED_DOMAIN,
        availableToSubdomains: true
      }
    });
  }, []);

  // TODO we want to start using Stytch with nextjs auth
  return (
    <StytchB2BProvider stytch={stytch}>
        <CookiesProvider>
            <AuthenticationStoreProvider>
                <AuthenticationGuard loadingComponent={
                <div className="h-screen w-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" aria-label="Authenticating..." />
                </div>
                }>
                        <MedplumProvider>
                            <PanelStoreProvider>
                            {children}
                            </PanelStoreProvider>
                        </MedplumProvider>
                </AuthenticationGuard>
            </AuthenticationStoreProvider>
        </CookiesProvider>
    </StytchB2BProvider>
  );
} 