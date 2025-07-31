'use client'

import { useAuthentication } from '@/hooks/use-authentication'
import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    captureOptions?: {
      captureKey: string
      mode?: 'customer' | 'extended'
      widgetPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    }
    Capture?: {
      identify: (userData: {
        identifier: string
        name?: string
        email?: string
        avatarUrl?: string
      }) => void
      setCustomContext: (context: Record<string, unknown>) => void
    }
  }
}

export function CaptureWidget() {
  const { userId, email, name, organizationSlug } = useAuthentication()
  const scriptLoaded = useRef(false)

  useEffect(() => {
    const captureKey = process.env.NEXT_PUBLIC_CAPTURE_KEY
    const internalDomain =
      process.env.NEXT_PUBLIC_CAPTURE_INTERNAL_DOMAIN || 'awellhealth.com'

    if (!captureKey) {
      console.warn('Capture.dev: NEXT_PUBLIC_CAPTURE_KEY not configured')
      return
    }

    // Set capture options before loading script
    if (typeof window !== 'undefined') {
      // Determine mode based on user email domain
      const isInternalUser = email?.endsWith(`@${internalDomain}`) ?? false

      window.captureOptions = {
        captureKey,
        mode: isInternalUser ? 'extended' : 'customer',
        widgetPosition: 'bottom-right',
      }
    }

    // Load the Capture script if not already loaded
    if (!scriptLoaded.current && typeof window !== 'undefined') {
      const script = document.createElement('script')
      script.src = 'https://cdn.capture.dev/capture-js/browser/latest.js'
      script.async = true

      script.onload = () => {
        scriptLoaded.current = true

        // Identify user if authentication data is available
        if (window.Capture && userId) {
          window.Capture.identify({
            identifier: userId,
            name: name || undefined,
            email: email || undefined,
          })
        }

        // Set organization context
        if (window.Capture && organizationSlug) {
          window.Capture.setCustomContext({
            organizationSlug,
          })
        }
      }

      script.onerror = () => {
        console.error('Failed to load Capture.dev widget')
      }

      document.head.appendChild(script)
    }
  }, [userId, email, name, organizationSlug])

  // Update user identification when auth data changes
  useEffect(() => {
    if (scriptLoaded.current && window.Capture && userId) {
      window.Capture.identify({
        identifier: userId,
        name: name || undefined,
        email: email || undefined,
      })
    }
  }, [userId, email, name])

  // Update organization context when it changes
  useEffect(() => {
    if (scriptLoaded.current && window.Capture && organizationSlug) {
      window.Capture.setCustomContext({
        organizationSlug,
      })
    }
  }, [organizationSlug])

  // Render the trigger button
  const internalDomain =
    process.env.NEXT_PUBLIC_CAPTURE_INTERNAL_DOMAIN || 'awellhealth.com'
  const isInternalUser = email?.endsWith(`@${internalDomain}`) ?? false
  const captureKey = process.env.NEXT_PUBLIC_CAPTURE_KEY

  if (!captureKey) {
    return null // Don't render button if capture is not configured
  }

  return (
    <button
      type="button"
      data-capture-trigger={isInternalUser ? 'extended' : 'customer'}
      className="fixed top-4 right-4 z-50 btn btn-primary shadow-lg"
      aria-label="Report an issue"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <title>Alert icon</title>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      Report an issue
    </button>
  )
}
