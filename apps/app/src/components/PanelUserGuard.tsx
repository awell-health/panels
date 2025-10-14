'use client'

import React, { type FC, type ReactNode } from 'react'
import { useAuthentication } from '@/hooks/use-authentication'

interface PanelUserGuardProps {
  children: ReactNode
}

export const PanelUserGuard: FC<PanelUserGuardProps> = ({ children }) => {
  const { isPanelUser } = useAuthentication()

  if (!isPanelUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <svg
              className="w-16 h-16 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>Lock icon</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            You do not have permission to access this application. Please
            contact your administrator if you believe this is an error.
          </p>
          <div className="text-sm text-gray-500">
            Required role: Panels User or higher
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
