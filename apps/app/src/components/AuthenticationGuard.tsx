'use client'

import { useStytchMemberSession } from '@stytch/nextjs/b2b'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState, type FC, type ReactNode } from 'react'
import { useCookies } from 'react-cookie'

interface AuthenticationGuardProps {
  children: ReactNode
  loadingComponent: ReactNode
}

export const AuthenticationGuard: FC<AuthenticationGuardProps> = ({ children, loadingComponent }) => {
  const [isLoading, setLoading] = useState(true)
  const [cookies, setCookie] = useCookies(['stytch_session', 'auth_next_url'])
  const { session } = useStytchMemberSession()
  const router = useRouter();

  const redirectToLogin = (): void => {
    setLoading(true)
    const visitedPage = window.location.href
    const expires = new Date()
    expires.setTime(expires.getTime() + 10 * 60 * 1000)
    setCookie('auth_next_url', visitedPage, {
      expires,
      path: '/',
      domain: process.env.NEXT_PUBLIC_AUTH_COOKIES_ALLOWED_DOMAIN
    })

    // This allows customers that have SSO enabled to create links that automatically
    // redirect to their org specific login page when the session is expired, regardless
    // of what is saved in the browser's local storage.
    const org = new URLSearchParams(window.location.search).get('org')
    if (org) {
      router.push(process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL + '/session-expired?org=' + org)
    } else {
      router.push(process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL + '/session-expired')
    }
  }

  useEffect(() => {
    // If the guard is loading, the user is either coming from CareOps or we initiated a redirect
    // to the session expired page.
    if (isLoading) {
      // If the session is available, the user was coming from CareOps and the stytch SDK
      // has successfully created the session
      if (session) {
        setLoading(false)
      }
    } else {
      // If the guard is not loading, then the session changed from available to not available, so
      // it means the SDK expired the session and we need to redirect to the login page.
      if (!session) {
        redirectToLogin()
      }
    }
  }, [session])

  useEffect(() => {
    // If for some reason the session is still available but the cookie is gone, we should also redirect
    // to the login page as any attempt to call the APIs will fail.
    if (!cookies.stytch_session) {
      redirectToLogin()
    }
  }, [cookies])

  if (isLoading) {
    return <>{loadingComponent}</>
  }

  return <>{children}</>
}

AuthenticationGuard.displayName = 'AuthenticationGuard'
