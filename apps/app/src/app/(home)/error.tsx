'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { sendLogImmediate } from '@/app/actions/logging'
import type { LogEntry } from '@/lib/logger'

export default function ErrorHandler({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    const logError = async () => {
      try {
        const logEntry: LogEntry = {
          level: 'error',
          message: 'Next.js Error Boundary caught an error',
          timestamp: Date.now(),
          component: 'ErrorBoundary',
          action: 'error.tsx',
          operationType: 'error_boundary',
          metadata: {
            errorDigest: error.digest,
            errorBoundary: true,
            route: window.location.pathname,
          },
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        }

        await sendLogImmediate(logEntry)
      } catch (loggingError) {
        console.error('Failed to log error to backend:', loggingError)
      }
    }

    console.error('Application error:', error)
    logError()
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-gray-200 p-8 text-center">
        {/* Error Icon */}
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Something went wrong
        </h1>

        {/* Error Description */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          We encountered an unexpected error while processing your data. This
          might be a temporary issue that can be resolved by trying again.
        </p>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg border text-left">
          <div className="flex items-center gap-2 mb-2">
            <Bug className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Technical Details
            </span>
          </div>
          <p className="text-xs text-gray-600 font-mono break-all">
            {error.message}
          </p>
          {error.digest && (
            <p className="text-xs text-gray-500 mt-1">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = '/'
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}
