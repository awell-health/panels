'use client'

import { MedplumProvider } from '@/contexts/medplum-context';
import { PanelStoreProvider } from '@/hooks/use-panel-store';
import { ReactivePanelStoreProvider } from '@/hooks/use-reactive-panel-store';
import { isFeatureEnabled } from '@/utils/featureFlags';
import { StytchB2BProvider } from '@stytch/nextjs/b2b'
import { createStytchB2BUIClient } from '@stytch/nextjs/b2b/ui'
import { CookiesProvider } from 'react-cookie';
import { AuthenticationGuard } from './AuthenticationGuard';
import { Loader2 } from 'lucide-react';
import { AuthenticationStoreProvider } from '@/hooks/use-authentication';
import { useEffect, useMemo, useState } from 'react';
import { getRuntimeConfig } from '@/lib/config';

export default function Providers({ children }: { children: React.ReactNode }) {

  const [authStytchPublicToken, setAuthStytchPublicToken] = useState<string | undefined>(undefined);
  const [authCookiesAllowedDomain, setAuthCookiesAllowedDomain] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchConfig = async () => {
      const config = await getRuntimeConfig();
      setAuthStytchPublicToken(config.authStytchPublicToken);
      setAuthCookiesAllowedDomain(config.authCookiesAllowedDomain);
    };
    fetchConfig();
  }, []);
  
  const stytch = useMemo(() => {

    if (!authStytchPublicToken || !authCookiesAllowedDomain) {
      console.log('AUTH_STYTCH_PUBLIC_TOKEN or AUTH_COOKIES_ALLOWED_DOMAIN is not available in runtime config');
      return undefined
    }
    
    return createStytchB2BUIClient(authStytchPublicToken, {
      cookieOptions: {
        opaqueTokenCookieName: `stytch_session`,
        domain: authCookiesAllowedDomain,
        availableToSubdomains: true
      }
    });
  }, [authStytchPublicToken, authCookiesAllowedDomain ]);

  // Don't render if stytch is not available
  if (!stytch) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2 mx-auto" aria-label="Loading..." />
        </div>
      </div>
    );
  }

  const isReactiveEnabled = isFeatureEnabled('ENABLE_REACTIVE_DATA_STORAGE');

  // TODO we want to start using Stytch with nextjs auth
  return (
    <StytchB2BProvider stytch={stytch}>
      <CookiesProvider>

        <AuthenticationGuard loadingComponent={
          <div className="h-screen w-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" aria-label="Authenticating..." />
          </div>
        }>
          <AuthenticationStoreProvider>
            <MedplumProvider>
              {isReactiveEnabled ? (
                <ReactivePanelStoreProvider>
                  {children}
                </ReactivePanelStoreProvider>
              ) : (
                <PanelStoreProvider>
                  {children}
                </PanelStoreProvider>
              )}
            </MedplumProvider>
          </AuthenticationStoreProvider>
        </AuthenticationGuard>
      </CookiesProvider>
    </StytchB2BProvider>
  );
} 