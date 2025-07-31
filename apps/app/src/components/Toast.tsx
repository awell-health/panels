'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, Info, X, RefreshCw } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastProps {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  dismissible?: boolean
  onDismiss?: () => void
  onRetry?: () => void
  isRetrying?: boolean
  className?: string
}

export function Toast({
  id,
  type,
  title,
  message,
  duration = 5000,
  dismissible = true,
  onDismiss,
  onRetry,
  isRetrying = false,
  className = '',
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [timeLeft, setTimeLeft] = useState(duration)

  // Show toast with animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  // Auto-dismiss timer
  useEffect(() => {
    if (duration === 0 || isPaused || isRetrying) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 100) {
          handleDismiss()
          return 0
        }
        return prev - 100
      })
    }, 100)

    return () => clearInterval(interval)
  }, [duration, isPaused, isRetrying])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss?.()
    }, 300) // Match exit animation duration
  }

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    }
  }

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          titleColor: 'text-green-800',
          messageColor: 'text-green-700',
        }
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          titleColor: 'text-red-800',
          messageColor: 'text-red-700',
        }
      case 'warning':
        return {
          icon: AlertCircle,
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          iconColor: 'text-amber-600',
          titleColor: 'text-amber-800',
          messageColor: 'text-amber-700',
        }
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-800',
          messageColor: 'text-blue-700',
        }
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-800',
          messageColor: 'text-blue-700',
        }
    }
  }

  const config = getToastConfig()
  const Icon = config.icon

  return (
    <div
      className={`
        relative p-4 rounded-lg border shadow-lg max-w-md w-full pointer-events-auto
        ${config.bgColor} ${config.borderColor}
        transition-all duration-300 ease-in-out transform
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${className}
      `}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {isRetrying ? (
            <RefreshCw className={`h-5 w-5 ${config.iconColor} animate-spin`} />
          ) : (
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
          )}
        </div>
        <div className="ml-3 flex-1">
          <div className={`text-sm font-medium ${config.titleColor}`}>
            {title}
          </div>
          {message && (
            <div className={`mt-1 text-sm ${config.messageColor}`}>
              {message}
            </div>
          )}
          {onRetry && !isRetrying && type === 'error' && (
            <div className="mt-2">
              <button
                type="button"
                onClick={handleRetry}
                className="btn btn-xs btn-ghost"
              >
                Try again
              </button>
            </div>
          )}
        </div>
        {dismissible && (
          <div className="ml-4 flex-shrink-0">
            <button
              type="button"
              onClick={handleDismiss}
              className="btn btn-xs btn-ghost"
            >
              <span className="sr-only">Dismiss</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {duration > 0 && !isPaused && !isRetrying && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 bg-opacity-50 rounded-b-lg overflow-hidden">
          <div
            className={`h-full ${config.iconColor.replace('text-', 'bg-')} transition-all duration-100 ease-linear`}
            style={{ width: `${(timeLeft / duration) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
